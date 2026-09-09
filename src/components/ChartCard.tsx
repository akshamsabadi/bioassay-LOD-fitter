import React, { useRef, useState, useMemo, useEffect, useCallback } from "react";
import {
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Line,
  ComposedChart,
  ReferenceLine,
  ReferenceArea,
  Area,
  Tooltip,
  usePlotArea
} from "recharts";
import { type AdvancedLoDResult } from "../utils/calculations";
import { formatScientificUnicode } from "../utils/formatters";
import { APP_VERSION } from "../constants";

export interface PlotArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PlotAreaWatcher: React.FC<{ onPlotArea: (area: PlotArea) => void }> = ({ onPlotArea }) => {
  const plotArea = usePlotArea();
  useEffect(() => {
    if (plotArea && plotArea.width > 0 && plotArea.height > 0) {
      onPlotArea({
        x: plotArea.x,
        y: plotArea.y,
        width: plotArea.width,
        height: plotArea.height
      });
    }
  }, [plotArea, onPlotArea]);
  return null;
};

export function computeNiceTicks(min: number, max: number, maxTicks: number = 5): { majorTicks: number[]; allTicks: number[] } {
  const span = max - min;
  if (!Number.isFinite(span) || span <= 0) {
    return { majorTicks: [min], allTicks: [min] };
  }
  const roughStep = span / maxTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalizedStep = roughStep / magnitude;

  let multiplier = 1;
  if (normalizedStep >= 1.5 && normalizedStep < 3.5) multiplier = 2;
  else if (normalizedStep >= 3.5 && normalizedStep < 7.5) multiplier = 5;
  else if (normalizedStep >= 7.5) multiplier = 10;

  const niceStep = multiplier * magnitude;
  const niceStart = Math.ceil(min / niceStep) * niceStep;

  const majorTicks: number[] = [];
  let t = niceStart;
  let count = 0;
  while (t <= max + 1e-10 && count < 100) {
    const val = Math.abs(t) < 1e-12 ? 0 : Number(t.toFixed(8));
    majorTicks.push(val);
    t += niceStep;
    count++;
  }

  const subDiv = multiplier === 2 ? 2 : 5;
  const subStep = niceStep / subDiv;
  const minorStart = Math.ceil(min / subStep) * subStep;
  const allTicks: number[] = [];
  t = minorStart;
  count = 0;
  while (t <= max + 1e-10 && count < 200) {
    const val = Math.abs(t) < 1e-12 ? 0 : Number(t.toFixed(8));
    allTicks.push(val);
    t += subStep;
    count++;
  }

  return { majorTicks, allTicks: allTicks.length <= 40 ? allTicks : majorTicks };
}

export function pixelToDataX(px: number, plotArea: PlotArea, xDomain: [number, number]): number {
  const fraction = (px - plotArea.x) / plotArea.width;
  const clampedFraction = Math.max(0, Math.min(1, fraction));
  const logMin = Math.log10(xDomain[0]);
  const logMax = Math.log10(xDomain[1]);
  const logVal = logMin + clampedFraction * (logMax - logMin);
  return Math.pow(10, logVal);
}

export function pixelToDataY(py: number, plotArea: PlotArea, yDomain: [number, number]): number {
  const fraction = (plotArea.y + plotArea.height - py) / plotArea.height;
  const clampedFraction = Math.max(0, Math.min(1, fraction));
  return yDomain[0] + clampedFraction * (yDomain[1] - yDomain[0]);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
}

export function interpolateDomain(
  fromDomain: { x: [number, number]; y: [number, number] },
  toDomain: { x: [number, number]; y: [number, number] },
  progress: number
): { x: [number, number]; y: [number, number] } {
  const p = Math.max(0, Math.min(1, progress));

  const fromLogMinX = Math.log10(Math.max(fromDomain.x[0], 1e-12));
  const fromLogMaxX = Math.log10(Math.max(fromDomain.x[1], 1e-12));
  const toLogMinX = Math.log10(Math.max(toDomain.x[0], 1e-12));
  const toLogMaxX = Math.log10(Math.max(toDomain.x[1], 1e-12));

  const currLogMinX = fromLogMinX + (toLogMinX - fromLogMinX) * p;
  const currLogMaxX = fromLogMaxX + (toLogMaxX - fromLogMaxX) * p;

  const currMinY = fromDomain.y[0] + (toDomain.y[0] - fromDomain.y[0]) * p;
  const currMaxY = fromDomain.y[1] + (toDomain.y[1] - fromDomain.y[1]) * p;

  return {
    x: [Math.pow(10, currLogMinX), Math.pow(10, currLogMaxX)],
    y: [currMinY, currMaxY]
  };
}

interface XAxisTickProps {
  x?: number;
  y?: number;
  payload?: {
    value: number;
  };
  zeroX: number;
  breakStart: number;
  breakEnd: number;
  isZoomed?: boolean;
  decades?: number;
}

const CustomXAxisTick = ({ x = 0, y = 0, payload, zeroX, breakStart, breakEnd, isZoomed, decades }: XAxisTickProps) => {
  if (!payload) return null;
  const val = payload.value;
  if (breakStart && (Math.abs(val - breakStart) < 1e-10 || Math.abs(val - breakEnd) < 1e-10)) {
    return (
      <g>
        {/* Extended vertical break tick */}
        <line x1={x} y1={y - 16} x2={x} y2={y} stroke="var(--subtext1)" strokeWidth={1.2} />
      </g>
    );
  }

  if (val === 0 || (zeroX && Math.abs(val - zeroX) < 1e-10) || isNaN(val)) {
    return (
      <g>
        <line x1={x} y1={y - 6} x2={x} y2={y} stroke="var(--subtext1)" strokeWidth={1.2} />
        <text x={x} y={y + 18} fill="var(--subtext1)" textAnchor="middle" fontSize={11} fontWeight={500} fontFamily="'Plus Jakarta Sans', sans-serif">0</text>
      </g>
    );
  }
  const rawExponent = Math.log10(Math.abs(val));
  const isMajor = Math.abs(rawExponent - Math.round(rawExponent)) < 0.0001;
  
  if (!isMajor) {
    if (isZoomed && decades !== undefined && decades < 1.5) {
      let label = "";
      if (Math.abs(val) >= 1000 || (Math.abs(val) > 0 && Math.abs(val) < 0.01)) {
        label = formatScientificUnicode(val, 2);
      } else {
        label = parseFloat(val.toFixed(4)).toString();
      }
      return (
        <g>
          <line x1={x} y1={y - 6} x2={x} y2={y} stroke="var(--subtext1)" strokeWidth={1.2} />
          <text x={x} y={y + 18} fill="var(--subtext1)" textAnchor="middle" fontSize={10} fontWeight={500} fontFamily="'Plus Jakarta Sans', sans-serif">
            {label}
          </text>
        </g>
      );
    }
    return (
      <g>
        <line x1={x} y1={y - 3.5} x2={x} y2={y} stroke="var(--subtext0)" strokeWidth={1} opacity={0.65} />
      </g>
    );
  }

  const exponent = Math.round(rawExponent);

  return (
    <g>
      <line x1={x} y1={y - 6} x2={x} y2={y} stroke="var(--subtext1)" strokeWidth={1.2} />
      <text x={x} y={y + 18} fill="var(--subtext1)" textAnchor="middle" fontSize={11} fontWeight={500} fontFamily="'Plus Jakarta Sans', sans-serif">
        <tspan>10</tspan>
        <tspan baselineShift="super" fontSize={8.5}>{exponent}</tspan>
      </text>
    </g>
  );
};

interface YAxisTickProps {
  x?: number;
  y?: number;
  payload?: {
    value: number;
  };
}

const CustomYAxisTick = ({ x = 0, y = 0, payload }: YAxisTickProps) => {
  if (!payload) return null;
  const val = payload.value;
  let label = val.toString();
  let mantissa = "";
  let exponent: number | null = null;

  if (Math.abs(val) >= 10000 || (Math.abs(val) > 0 && Math.abs(val) < 0.001)) {
    const expStr = val.toExponential(1);
    const [m, e] = expStr.split("e");
    mantissa = m;
    exponent = parseInt(e, 10);
  } else if (Math.abs(val - Math.round(val)) > 1e-6) {
    label = parseFloat(val.toFixed(4)).toString();
  }
  return (
    <g>
      <line x1={x} y1={y} x2={x - 6} y2={y} stroke="var(--subtext1)" strokeWidth={1.2} />
      <text x={x - 10} y={y + 3.5} fill="var(--subtext1)" textAnchor="end" fontSize={11} fontWeight={500} fontFamily="'Plus Jakarta Sans', sans-serif" className="tabular-nums">
        {exponent !== null ? (
          <>
            <tspan>{mantissa}×10</tspan>
            <tspan baselineShift="super" fontSize={8.5}>{exponent}</tspan>
          </>
        ) : (
          label
        )}
      </text>
    </g>
  );
};


interface ViewBoxProps {
  viewBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const CustomLcLabel = ({ viewBox }: ViewBoxProps) => {
  if (!viewBox) return null;
  return (
    <g style={{ pointerEvents: "none" }}>
      <text x={viewBox.x + viewBox.width + 5} y={viewBox.y + 8} fill="var(--peach)" fontSize={10} fontWeight={700} fontFamily="'Plus Jakarta Sans', sans-serif">
        L<tspan dy="0.3em" fontSize={7.5}>C</tspan>
      </text>
    </g>
  );
};

const CustomLdLabel = ({ viewBox }: ViewBoxProps) => {
  if (!viewBox) return null;
  return (
    <g style={{ pointerEvents: "none" }}>
      <text x={viewBox.x + viewBox.width + 5} y={viewBox.y - 2} fill="var(--green)" fontSize={10} fontWeight={700} fontFamily="'Plus Jakarta Sans', sans-serif">
        L<tspan dy="0.3em" fontSize={7.5}>D</tspan>
      </text>
    </g>
  );
};

interface LodLabelProps {
  viewBox?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  labelText?: string;
  color?: string;
  offsetY?: number;
  opacity?: number;
}

const CustomLodLabel = ({ viewBox, labelText = "LOD", color = "var(--yellow)", offsetY = 0, opacity = 1 }: LodLabelProps) => {
  if (!viewBox || typeof viewBox.x !== "number" || isNaN(viewBox.x) || typeof viewBox.y !== "number" || isNaN(viewBox.y)) {
    return null;
  }
  const displayLabel = labelText.length > 18 ? labelText.slice(0, 15) + "…" : labelText;
  const charWidth = 6.4;
  const pillWidth = Math.min(Math.max(displayLabel.length * charWidth + 16, 42), 136);
  const halfWidth = pillWidth / 2;

  let x = viewBox.x;
  if (typeof viewBox.width === "number" && viewBox.width > 0) {
    const minX = halfWidth + 6;
    const maxX = viewBox.width - halfWidth - 6;
    x = Math.max(minX, Math.min(x, maxX));
  }
  const y = viewBox.y + 2 + offsetY;

  return (
    <g style={{ pointerEvents: "none", opacity }}>
      <rect
        x={x - halfWidth}
        y={y}
        width={pillWidth}
        height={20}
        rx={7}
        ry={7}
        fill="var(--card-bg)"
        stroke={color}
        strokeWidth={1.5}
        style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))" }}
      />
      <text
        x={x}
        y={y + 13.5}
        fill={color}
        fontSize={10}
        fontWeight={700}
        textAnchor="middle"
        fontFamily="'Plus Jakarta Sans', sans-serif"
      >
        {displayLabel}
      </text>
    </g>
  );
};

const CustomMinorYAxisTickLabel = ({ viewBox }: Partial<ViewBoxProps>) => {
  if (!viewBox || typeof viewBox.x !== "number" || typeof viewBox.y !== "number") return null;
  return <line x1={viewBox.x} y1={viewBox.y} x2={viewBox.x - 3.5} y2={viewBox.y} stroke="var(--subtext0)" strokeWidth={1} opacity={0.65} />;
};

export interface ChartCurvePoint {
  x: number;
  trend?: number;
  ciRange?: [number, number] | number[];
}

export interface ChartScatterPoint {
  x: number;
  y: number;
  actualX: number | string;
  id: string;
  pointId?: string;
  rowId?: string;
  repIndex?: number;
  repValue?: number;
  seriesId?: string;
  seriesName?: string;
  color?: string;
}

export interface ChartLinePoint {
  x: number;
  y: number;
}

export interface HoveredPointData {
  id: string;
  pointId?: string;
  rowId?: string;
  repIndex?: number;
  y: number;
  cx: number;
  cy: number;
  conc: number | string;
  seriesId?: string;
  seriesName?: string;
}

export interface ScatterDotProps {
  cx?: number;
  cy?: number;
  payload?: ChartScatterPoint;
  hoveredPoint?: HoveredPointData | null;
  setHoveredPoint?: (pt: HoveredPointData | null) => void;
  tableHoveredRowId?: string | null;
  hoveredPointId?: string | undefined;
  seriesColor?: string;
  isDimmed?: boolean;
  isSingleCurve?: boolean;
  isAnimating?: boolean;
}

const CustomScatterDot = (props: ScatterDotProps) => {
  const { cx = 0, cy = 0, payload, hoveredPoint, setHoveredPoint, tableHoveredRowId, hoveredPointId, seriesColor, isDimmed, isSingleCurve, isAnimating } = props;
  if (!payload) return null;

  // When hovering directly over a point: ONLY that specific point is selected!
  // When hovering from the sidebar table row: all points for that row are selected.
  const isDirectlyHovered = hoveredPoint && payload.pointId
    ? payload.pointId === hoveredPoint.pointId
    : (hoveredPointId ? payload.id === hoveredPointId : false);

  const isTableHovered = tableHoveredRowId
    ? (payload.rowId === tableHoveredRowId || payload.id === tableHoveredRowId ||
       (tableHoveredRowId === "blank" && (payload.actualX === 0 || payload.rowId === "blank" || payload.id.endsWith("-blank"))))
    : false;

  const isSelected = isDirectlyHovered || (!hoveredPoint && isTableHovered);
  const color = isSingleCurve ? "var(--red)" : (seriesColor || payload.color || "var(--red)");
  
  return (
    <g opacity={isDimmed ? 0.25 : 1}>
      {isSelected && (
        <circle
          cx={cx}
          cy={cy}
          r={9}
          fill="none"
          stroke="var(--pink)"
          strokeWidth={1.5}
          className="pulsing-halo"
          style={{ pointerEvents: "none" }}
        />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={isSelected ? 6 : 4}
        fill={isSelected ? "var(--pink)" : color}
        onMouseEnter={() => {
          if (isAnimating) return;
          if (setHoveredPoint) {
            setHoveredPoint({
              id: payload.id,
              pointId: payload.pointId,
              rowId: payload.rowId,
              repIndex: payload.repIndex,
              y: payload.y,
              cx,
              cy,
              conc: payload.actualX,
              seriesId: payload.seriesId,
              seriesName: payload.seriesName
            });
          }
        }}
        onMouseLeave={() => {
          if (setHoveredPoint) setHoveredPoint(null);
        }}
        style={{ cursor: "pointer", transition: "all 0.15s ease", pointerEvents: "all" }}
      />
    </g>
  );
};

export interface MultiCurvePlotSeries {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  isActive: boolean;
  results: AdvancedLoDResult;
  leftChartData: ChartCurvePoint[];
  rightChartData: ChartCurvePoint[];
  scatterData: ChartScatterPoint[];
  lcLeftData: ChartLinePoint[];
  lcRightData: ChartLinePoint[];
  ldLeftData: ChartLinePoint[];
  ldRightData: ChartLinePoint[];
}

interface ChartCardProps {
  plotTitle: string;
  activeResults: AdvancedLoDResult;
  activeSeriesName: string;
  curveSeriesList: MultiCurvePlotSeries[];
  xAxisLabel: string;
  yAxisLabel: string;
  breakStart: number;
  breakEnd: number;
  xTicks: number[];
  xDomain: [number, number];
  yDomain: [number, number];
  yTicks: number[] | undefined;
  yMajorTicks: number[];
  leftAxisData: ChartLinePoint[];
  rightAxisData: ChartLinePoint[];
  hoveredPoint: HoveredPointData | null;
  setHoveredPoint: (point: HoveredPointData | null) => void;
  tableHoveredRowId: string | null;
  handleExportCSV: () => void;
  hoveredSeriesId: string | null;
  setHoveredSeriesId: (id: string | null) => void;
  onSelectSeries?: (id: string) => void;
}

interface ChartLegendProps {
  curveSeriesList: MultiCurvePlotSeries[];
  showCI: boolean;
  showLc: boolean;
  showLd: boolean;
  showLodZone: boolean;
  hoveredSeriesId: string | null;
  setHoveredSeriesId: (id: string | null) => void;
  onSelectSeries?: (id: string) => void;
}

const ChartLegend: React.FC<ChartLegendProps> = ({
  curveSeriesList,
  showCI,
  showLc,
  showLd,
  showLodZone,
  hoveredSeriesId,
  setHoveredSeriesId,
  onSelectSeries,
}) => {
  if (curveSeriesList.length === 1) {
    return (
      <div className="custom-chart-legend">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ width: "14px", height: "0", borderTop: "2px dashed var(--yellow)" }} />
          <span style={{ fontWeight: 600, color: "var(--yellow)" }}>LOD</span>
        </div>
        {showLodZone && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "10px", height: "10px", backgroundColor: "color-mix(in srgb, var(--yellow) 22%, transparent)", border: "1px dashed var(--yellow)", borderRadius: "var(--radius-xs)" }} />
            <span style={{ color: "var(--subtext1)" }}>95% CI LOD</span>
          </div>
        )}
        {showLc && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "14px", height: "0", borderTop: "2px dashed var(--peach)" }} />
            <span style={{ color: "var(--subtext1)" }}>L<sub>C</sub></span>
          </div>
        )}
        {showLd && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "14px", height: "0", borderTop: "2px dashed var(--green)" }} />
            <span style={{ color: "var(--subtext1)" }}>L<sub>D</sub></span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ width: "14px", height: "2.5px", backgroundColor: "var(--blue)", borderRadius: "var(--radius-pill)" }} />
          <span style={{ color: "var(--subtext1)" }}>Model Fit</span>
        </div>
        {showCI && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "10px", height: "10px", backgroundColor: "color-mix(in srgb, var(--blue) 22%, transparent)", border: "1px solid var(--blue)", borderRadius: "var(--radius-xs)" }} />
            <span style={{ color: "var(--subtext1)" }}>95% CI Fit</span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "var(--red)", fontSize: "11px", lineHeight: "1" }}>●</span>
          <span style={{ color: "var(--subtext1)" }}>Measured Data</span>
        </div>
      </div>
    );
  }

  return (
    <div className="custom-chart-legend">
      {curveSeriesList.map(s => {
        const isHovered = hoveredSeriesId === s.id;
        return (
          <div 
            key={s.id}
            onClick={() => onSelectSeries && onSelectSeries(s.id)}
            onMouseEnter={() => setHoveredSeriesId(s.id)}
            onMouseLeave={() => setHoveredSeriesId(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              padding: "3px 8px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: s.isActive ? "var(--surface1)" : (isHovered ? "var(--surface0)" : "transparent"),
              border: s.isActive ? `1px solid ${s.color}` : "1px solid transparent",
              transition: "all 0.15s ease"
            }}
            title={`Click to focus ${s.name} (LOD: ${formatScientificUnicode(s.results.lodConc, 2)})`}
          >
            <span style={{ width: "10px", height: "3px", backgroundColor: s.color, borderRadius: "var(--radius-pill)" }} />
            <span style={{ width: "10px", height: "0", borderTop: `2px dashed ${s.color}` }} />
            <span style={{ fontWeight: s.isActive ? 700 : 500, color: s.isActive ? "var(--text)" : "var(--subtext1)" }}>
              {s.name}
            </span>
          </div>
        );
      })}

      {(showLc || showLd || showLodZone || showCI) && (
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "6px", marginTop: "2px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {showLc && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 6px" }}>
              <span style={{ width: "12px", height: "0", borderTop: "2px dashed var(--peach)" }} />
              <span style={{ color: "var(--subtext1)" }}>L<sub>C</sub></span>
            </div>
          )}
          {showLd && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 6px" }}>
              <span style={{ width: "12px", height: "0", borderTop: "2px dashed var(--green)" }} />
              <span style={{ color: "var(--subtext1)" }}>L<sub>D</sub></span>
            </div>
          )}
          {showCI && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 6px" }}>
              <span style={{ width: "10px", height: "10px", backgroundColor: "color-mix(in srgb, var(--overlay1) 22%, transparent)", border: "1px solid var(--overlay1)", borderRadius: "var(--radius-xs)" }} />
              <span style={{ color: "var(--subtext1)" }}>95% CI Fit</span>
            </div>
          )}
          {showLodZone && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 6px" }}>
              <span style={{ width: "10px", height: "10px", backgroundColor: "color-mix(in srgb, var(--overlay1) 22%, transparent)", border: "1px dashed var(--overlay1)", borderRadius: "var(--radius-xs)" }} />
              <span style={{ color: "var(--subtext1)" }}>95% CI LOD</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{
    value?: unknown;
    payload?: {
      x?: number;
      actualX?: number | string;
    };
  }>;
  label?: string | number;
  coordinate?: { x: number; y: number };
  curveSeriesList: MultiCurvePlotSeries[];
  xDomain: [number, number];
  breakStart: number;
  breakEnd?: number;
  hoveredPoint?: HoveredPointData | null;
  isInteracting?: boolean;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, curveSeriesList, xDomain, breakStart, hoveredPoint, isInteracting }) => {
  if (isInteracting) return null;
  // Disappear when hovering directly over a specific data measurement point (scatter-point-tooltip shows instead)
  if (hoveredPoint) return null;
  if (!active) return null;

  // 1. Try to find line entry with valid x from payload
  const lineEntry = payload?.find(p => p?.payload && typeof p.payload.x === "number" && !isNaN(p.payload.x));
  let x = lineEntry?.payload?.x;
  let actualX = lineEntry?.payload?.actualX;

  // 2. Fallback to any payload entry with x
  if (x === undefined || isNaN(x)) {
    const p0 = payload?.[0]?.payload as (ChartCurvePoint & Partial<ChartScatterPoint>) | undefined;
    if (p0 && typeof p0.x === "number" && !isNaN(p0.x)) {
      x = p0.x;
      actualX = p0.actualX;
    }
  }

  // 3. Fallback to label if provided by Recharts axis
  if (x === undefined || isNaN(x)) {
    if (typeof label === "number" && !isNaN(label)) {
      x = label;
    } else if (typeof label === "string" && !isNaN(parseFloat(label))) {
      x = parseFloat(label);
    }
  }

  if (x === undefined || isNaN(x)) return null;

  const isBlank = actualX !== undefined
    ? actualX === 0
    : (x === 0 || (xDomain && Math.abs(x - xDomain[0]) < 1e-9) || (breakStart && x <= breakStart));

  const displayConc = isBlank
    ? "0 (Blank)"
    : formatScientificUnicode(actualX !== undefined ? (typeof actualX === "number" ? actualX : parseFloat(actualX)) : x, 3);

  const evalX = isBlank ? 0 : x;

  return (
    <div className="custom-chart-tooltip">
      <div style={{ display: "flex", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "4px", marginBottom: "2px", justifyContent: "space-between" }}>
        <span style={{ color: "var(--subtext0)", fontWeight: 600, fontSize: "0.72rem" }}>Concentration</span>
        <span style={{ fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="tabular-nums">
          {displayConc}
        </span>
      </div>

      {curveSeriesList.map(s => {
        const pred = s.results.fit.predict(evalX);
        return (
          <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", color: s.color, fontWeight: s.isActive ? 700 : 500 }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: s.color }} />
              {s.name}:
            </span>
            <span style={{ fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="tabular-nums">
              {Number.isFinite(pred) ? pred.toFixed(3) : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const ChartCard: React.FC<ChartCardProps> = ({
  plotTitle,
  curveSeriesList,
  xAxisLabel,
  yAxisLabel,
  breakStart,
  breakEnd,
  xTicks,
  xDomain,
  yDomain,
  yTicks,
  yMajorTicks,
  leftAxisData,
  rightAxisData,
  hoveredPoint,
  setHoveredPoint,
  tableHoveredRowId,
  handleExportCSV,
  hoveredSeriesId,
  setHoveredSeriesId,
  onSelectSeries,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(700);
  const [chartHeight, setChartHeight] = useState(500);
  const activeSeries = curveSeriesList.find(s => s.isActive) || curveSeriesList[0];

  // Zoom and Pan state
  const [zoomDomain, setZoomDomain] = useState<{ x: [number, number]; y: [number, number] } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const isAnimatingRef = useRef(false);
  const animationRafRef = useRef<number | null>(null);
  const targetDomainRef = useRef<{ x: [number, number]; y: [number, number] } | null>(null);

  const cancelAnimation = useCallback(() => {
    if (animationRafRef.current !== null) {
      cancelAnimationFrame(animationRafRef.current);
      animationRafRef.current = null;
    }
    targetDomainRef.current = null;
    if (isAnimatingRef.current) {
      isAnimatingRef.current = false;
      setIsAnimating(false);
    }
  }, []);

  React.useEffect(() => {
    return () => {
      if (animationRafRef.current !== null) {
        cancelAnimationFrame(animationRafRef.current);
      }
    };
  }, []);

  const [dragBox, setDragBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    svgStartPx: number;
    svgStartPy: number;
    svgCurrentPx: number;
    svgCurrentPy: number;
  } | null>(null);

  const [, setPlotArea] = useState<PlotArea | null>(null);
  const plotAreaRef = useRef<PlotArea | null>(null);

  const handlePlotArea = useCallback((area: PlotArea) => {
    plotAreaRef.current = area;
    setPlotArea(prev => {
      if (prev && prev.x === area.x && prev.y === area.y && prev.width === area.width && prev.height === area.height) {
        return prev;
      }
      return area;
    });
  }, []);

  const getEffectivePlotArea = (): PlotArea => {
    if (plotAreaRef.current && plotAreaRef.current.width > 0 && plotAreaRef.current.height > 0) {
      return plotAreaRef.current;
    }
    if (chartRef.current) {
      const svg = chartRef.current.querySelector("svg.recharts-surface");
      if (svg) {
        const clipRect = svg.querySelector("clipPath rect");
        if (clipRect) {
          const x = parseFloat(clipRect.getAttribute("x") || "0");
          const y = parseFloat(clipRect.getAttribute("y") || "0");
          const width = parseFloat(clipRect.getAttribute("width") || "0");
          const height = parseFloat(clipRect.getAttribute("height") || "0");
          if (width > 0 && height > 0) {
            const measured = { x, y, width, height };
            plotAreaRef.current = measured;
            return measured;
          }
        }
        const svgRect = svg.getBoundingClientRect();
        if (svgRect.width > 0 && svgRect.height > 0) {
          return {
            x: 88,
            y: 15,
            width: Math.max(10, svgRect.width - 88 - 35),
            height: Math.max(10, svgRect.height - 15 - 65)
          };
        }
      }
    }
    return {
      x: 88,
      y: 15,
      width: Math.max(10, chartWidth - 88 - 35),
      height: Math.max(10, chartHeight - 15 - 65)
    };
  };

  React.useEffect(() => {
    if (!chartRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width) {
          setChartWidth(entry.contentRect.width);
        }
        if (entry.contentRect.height) {
          setChartHeight(entry.contentRect.height);
        }
      }
    });
    observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, []);

  // Automatically reset zoom whenever external base domain changes
  const prevBaseXDomainRef = useRef(xDomain);
  const prevBaseYDomainRef = useRef(yDomain);
  React.useEffect(() => {
    if (
      prevBaseXDomainRef.current[0] !== xDomain[0] ||
      prevBaseXDomainRef.current[1] !== xDomain[1] ||
      prevBaseYDomainRef.current[0] !== yDomain[0] ||
      prevBaseYDomainRef.current[1] !== yDomain[1]
    ) {
      prevBaseXDomainRef.current = xDomain;
      prevBaseYDomainRef.current = yDomain;
      cancelAnimation();
      setZoomDomain(null);
    }
  }, [xDomain, yDomain, cancelAnimation]);

  // Active domains
  const activeXDomain = useMemo<[number, number]>(() => {
    return zoomDomain ? zoomDomain.x : xDomain;
  }, [zoomDomain, xDomain]);

  const activeYDomain = useMemo<[number, number]>(() => {
    return zoomDomain ? zoomDomain.y : yDomain;
  }, [zoomDomain, yDomain]);

  const activeDecades = useMemo(() => {
    if (activeXDomain[0] <= 0 || activeXDomain[1] <= 0) return 4;
    return Math.log10(activeXDomain[1]) - Math.log10(activeXDomain[0]);
  }, [activeXDomain]);

  // Compute active X ticks
  const activeXTicks = useMemo(() => {
    if (!zoomDomain) return xTicks;
    const [minX, maxX] = activeXDomain;
    if (minX <= 0 || maxX <= minX) return xTicks;

    const logMin = Math.log10(minX);
    const logMax = Math.log10(maxX);
    const decades = logMax - logMin;
    const ticks: number[] = [];

    // Break ticks if in range
    if (breakStart && breakEnd && minX <= breakStart && maxX >= breakEnd) {
      ticks.push(minX, breakStart, breakEnd);
    }

    if (decades >= 2) {
      const startExp = Math.floor(logMin);
      const endExp = Math.ceil(logMax);
      for (let i = startExp; i <= endExp; i++) {
        const pow10 = Math.pow(10, i);
        if (pow10 >= minX - 1e-10 && pow10 <= maxX + 1e-10) {
          if (!breakStart || !breakEnd || pow10 < breakStart || pow10 > breakEnd) {
            ticks.push(pow10);
          }
        }
        if (i < endExp) {
          for (let j = 2; j <= 9; j++) {
            const minorVal = j * Math.pow(10, i);
            if (minorVal >= minX - 1e-10 && minorVal <= maxX + 1e-10) {
              if (!breakStart || !breakEnd || minorVal < breakStart || minorVal > breakEnd) {
                ticks.push(minorVal);
              }
            }
          }
        }
      }
    } else if (decades >= 0.8) {
      const startExp = Math.floor(logMin);
      const endExp = Math.ceil(logMax);
      for (let i = startExp; i <= endExp; i++) {
        for (const m of [1, 2, 5]) {
          const val = m * Math.pow(10, i);
          if (val >= minX - 1e-10 && val <= maxX + 1e-10) {
            if (!breakStart || !breakEnd || val < breakStart || val > breakEnd) {
              ticks.push(val);
            }
          }
        }
      }
    } else {
      const nice = computeNiceTicks(minX, maxX, 5);
      ticks.push(...nice.majorTicks);
    }

    return Array.from(new Set(ticks.map(t => Number(t.toPrecision(8))))).sort((a, b) => a - b);
  }, [zoomDomain, activeXDomain, xTicks, breakStart, breakEnd]);

  // Compute active Y ticks
  const { activeYMajorTicks, activeYAllTicks } = useMemo(() => {
    if (!zoomDomain) {
      return { activeYMajorTicks: yMajorTicks, activeYAllTicks: yTicks };
    }
    const [minY, maxY] = activeYDomain;
    const nice = computeNiceTicks(minY, maxY, 5);
    return { activeYMajorTicks: nice.majorTicks, activeYAllTicks: nice.allTicks };
  }, [zoomDomain, activeYDomain, yMajorTicks, yTicks]);

  // Compute active bottom axis lines
  const activeLeftAxisData = useMemo(() => {
    if (!zoomDomain) return leftAxisData;
    const [minX, maxX] = activeXDomain;
    const minY = activeYDomain[0];
    if (!breakStart || !breakEnd) {
      return [{ x: minX, y: minY }, { x: maxX, y: minY }];
    }
    if (minX <= breakStart && maxX >= breakEnd) {
      return [{ x: minX, y: minY }, { x: breakStart, y: minY }];
    }
    if (maxX <= breakStart) {
      return [{ x: minX, y: minY }, { x: maxX, y: minY }];
    }
    return [];
  }, [zoomDomain, leftAxisData, activeXDomain, activeYDomain, breakStart, breakEnd]);

  const activeRightAxisData = useMemo(() => {
    if (!zoomDomain) return rightAxisData;
    const [minX, maxX] = activeXDomain;
    const minY = activeYDomain[0];
    if (!breakStart || !breakEnd) {
      return [];
    }
    if (minX <= breakStart && maxX >= breakEnd) {
      return [{ x: breakEnd, y: minY }, { x: maxX, y: minY }];
    }
    if (minX >= breakEnd) {
      return [{ x: minX, y: minY }, { x: maxX, y: minY }];
    }
    return [];
  }, [zoomDomain, rightAxisData, activeXDomain, activeYDomain, breakStart, breakEnd]);

  // Dense fitted curves when zoomed
  const zoomedSeriesMap = useMemo(() => {
    if (!zoomDomain) return null;
    const [minX, maxX] = activeXDomain;
    const logMin = Math.log10(minX);
    const logMax = Math.log10(maxX);
    const steps = 120;
    const xGrid: number[] = [];
    for (let i = 0; i <= steps; i++) {
      xGrid.push(Math.pow(10, logMin + i * (logMax - logMin) / steps));
    }

    const map = new Map<string, { chartData: ChartCurvePoint[]; lcData: ChartLinePoint[]; ldData: ChartLinePoint[] }>();

    curveSeriesList.forEach(s => {
      const xSet = new Set(xGrid);
      s.scatterData.forEach(pt => {
        if (typeof pt.actualX === "number" && pt.actualX >= minX && pt.actualX <= maxX) {
          xSet.add(pt.actualX);
        }
      });
      if (s.results.lodConc >= minX && s.results.lodConc <= maxX) {
        xSet.add(s.results.lodConc);
      }
      const sortedX = Array.from(xSet).sort((a, b) => a - b);
      const chartData = sortedX.map(x => {
        const evalX = (xDomain && Math.abs(x - xDomain[0]) < 1e-9) ? 0 : x;
        const pred = s.results.fit.predict(evalX);
        const ci = s.results.fit.getCI ? s.results.fit.getCI(evalX) : { low: pred, high: pred };
        return {
          x,
          trend: pred,
          ciRange: [ci.low, ci.high] as [number, number]
        };
      });

      const lcData = [{ x: minX, y: s.results.lc }, { x: maxX, y: s.results.lc }];
      const ldData = [{ x: minX, y: s.results.ld }, { x: maxX, y: s.results.ld }];

      map.set(s.id, { chartData, lcData, ldData });
    });

    return map;
  }, [zoomDomain, activeXDomain, curveSeriesList, xDomain]);

  // Interaction tracking refs
  const isMouseDownRef = useRef(false);
  const activeButtonRef = useRef<number | null>(null);
  const dragStartRef = useRef<{ px: number; py: number; clientX: number; clientY: number } | null>(null);
  const panStartRef = useRef<{ clientX: number; clientY: number; xDomain: [number, number]; yDomain: [number, number] } | null>(null);
  const dragBoxRef = useRef(dragBox);
  dragBoxRef.current = dragBox;
  const currentXDomainRef = useRef(activeXDomain);
  currentXDomainRef.current = activeXDomain;
  const currentYDomainRef = useRef(activeYDomain);
  currentYDomainRef.current = activeYDomain;

  const animateToDomain = useCallback((targetDomain: { x: [number, number]; y: [number, number] } | null) => {
    if (animationRafRef.current !== null) {
      cancelAnimationFrame(animationRafRef.current);
      animationRafRef.current = null;
    }

    const startDomain: { x: [number, number]; y: [number, number] } = {
      x: [...currentXDomainRef.current] as [number, number],
      y: [...currentYDomainRef.current] as [number, number]
    };

    const endDomain: { x: [number, number]; y: [number, number] } = targetDomain ?? {
      x: [...xDomain] as [number, number],
      y: [...yDomain] as [number, number]
    };

    const isSameX = Math.abs(startDomain.x[0] - endDomain.x[0]) < 1e-12 && Math.abs(startDomain.x[1] - endDomain.x[1]) < 1e-12;
    const isSameY = Math.abs(startDomain.y[0] - endDomain.y[0]) < 1e-12 && Math.abs(startDomain.y[1] - endDomain.y[1]) < 1e-12;
    if ((isSameX && isSameY) || endDomain.x[0] <= 0 || endDomain.x[1] <= endDomain.x[0] || endDomain.y[1] <= endDomain.y[0]) {
      targetDomainRef.current = null;
      isAnimatingRef.current = false;
      setIsAnimating(false);
      setZoomDomain(targetDomain);
      return;
    }

    targetDomainRef.current = targetDomain;
    isAnimatingRef.current = true;
    setIsAnimating(true);

    const duration = 240; // ms: fast and smooth transition
    const startTime = performance.now();

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);

      if (progress < 1) {
        const interpolated = interpolateDomain(startDomain, endDomain, eased);
        setZoomDomain(interpolated);
        animationRafRef.current = requestAnimationFrame(step);
      } else {
        animationRafRef.current = null;
        targetDomainRef.current = null;
        isAnimatingRef.current = false;
        setIsAnimating(false);
        setZoomDomain(targetDomain);
      }
    };

    animationRafRef.current = requestAnimationFrame(step);
  }, [xDomain, yDomain]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".custom-chart-legend")) return;
    if ((e.target as HTMLElement).closest("button")) return;

    cancelAnimation();

    const area = getEffectivePlotArea();
    const svg = chartRef.current?.querySelector("svg.recharts-surface") as SVGSVGElement | null;
    if (!svg) return;

    const svgRect = svg.getBoundingClientRect();
    const px = e.clientX - svgRect.left;
    const py = e.clientY - svgRect.top;

    const inPlot = px >= area.x - 4 && px <= area.x + area.width + 4 && py >= area.y - 4 && py <= area.y + area.height + 4;
    if (!inPlot) return;

    if (e.button === 0) {
      dragStartRef.current = { px, py, clientX: e.clientX, clientY: e.clientY };
      isMouseDownRef.current = true;
      activeButtonRef.current = 0;
    } else if (e.button === 2) {
      e.preventDefault();
      panStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        xDomain: activeXDomain,
        yDomain: activeYDomain
      };
      isMouseDownRef.current = true;
      activeButtonRef.current = 2;
      setIsPanning(true);
      document.body.style.cursor = "grabbing";
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".custom-chart-legend")) return;
    if ((e.target as HTMLElement).closest("button")) return;
    if (!zoomDomain && !isAnimatingRef.current) return;
    if (isAnimatingRef.current && targetDomainRef.current === null) return;
    setHoveredPoint(null);
    animateToDomain(null);
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  React.useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDownRef.current) return;
      const area = getEffectivePlotArea();
      const svg = chartRef.current?.querySelector("svg.recharts-surface") as SVGSVGElement | null;
      if (!svg) return;
      const svgRect = svg.getBoundingClientRect();
      const frameRect = chartRef.current?.getBoundingClientRect();
      if (!frameRect) return;

      if (activeButtonRef.current === 0 && dragStartRef.current) {
        const dist = Math.hypot(e.clientX - dragStartRef.current.clientX, e.clientY - dragStartRef.current.clientY);
        if (dist >= 5) {
          setIsDragging(true);
          document.body.style.cursor = "crosshair";

          const currentPx = Math.max(area.x, Math.min(area.x + area.width, e.clientX - svgRect.left));
          const currentPy = Math.max(area.y, Math.min(area.y + area.height, e.clientY - svgRect.top));

          const frameStartX = dragStartRef.current.clientX - frameRect.left;
          const frameStartY = dragStartRef.current.clientY - frameRect.top;
          const frameCurrentX = e.clientX - frameRect.left;
          const frameCurrentY = e.clientY - frameRect.top;

          setDragBox({
            startX: frameStartX,
            startY: frameStartY,
            currentX: frameCurrentX,
            currentY: frameCurrentY,
            svgStartPx: dragStartRef.current.px,
            svgStartPy: dragStartRef.current.py,
            svgCurrentPx: currentPx,
            svgCurrentPy: currentPy
          });
        }
      } else if (activeButtonRef.current === 2 && panStartRef.current) {
        e.preventDefault();
        const dx = e.clientX - panStartRef.current.clientX;
        const dy = e.clientY - panStartRef.current.clientY;

        const [startMinX, startMaxX] = panStartRef.current.xDomain;
        const [startMinY, startMaxY] = panStartRef.current.yDomain;

        const logMin = Math.log10(startMinX);
        const logMax = Math.log10(startMaxX);
        const logSpan = logMax - logMin;
        const dLog = -(dx / area.width) * logSpan;

        let newLogMin = logMin + dLog;
        let newLogMax = logMax + dLog;
        if (newLogMin < -12) {
          newLogMin = -12;
          newLogMax = newLogMin + logSpan;
        } else if (newLogMax > 12) {
          newLogMax = 12;
          newLogMin = newLogMax - logSpan;
        }
        const newXDomain: [number, number] = [Math.pow(10, newLogMin), Math.pow(10, newLogMax)];

        const ySpan = startMaxY - startMinY;
        const dY = (dy / area.height) * ySpan;
        const newYDomain: [number, number] = [startMinY + dY, startMaxY + dY];

        setZoomDomain({ x: newXDomain, y: newYDomain });
      }
    };

    const onMouseUp = () => {
      if (!isMouseDownRef.current) return;
      const area = getEffectivePlotArea();

      if (activeButtonRef.current === 0) {
        if (dragBoxRef.current) {
          const box = dragBoxRef.current;
          const px1 = Math.min(box.svgStartPx, box.svgCurrentPx);
          const px2 = Math.max(box.svgStartPx, box.svgCurrentPx);
          const py1 = Math.min(box.svgStartPy, box.svgCurrentPy);
          const py2 = Math.max(box.svgStartPy, box.svgCurrentPy);
          const width = px2 - px1;
          const height = py2 - py1;

          const currentX = currentXDomainRef.current;
          const currentY = currentYDomainRef.current;

          if (width >= 8 && height >= 8) {
            const newXMin = pixelToDataX(px1, area, currentX);
            const newXMax = pixelToDataX(px2, area, currentX);
            const newYMax = pixelToDataY(py1, area, currentY);
            const newYMin = pixelToDataY(py2, area, currentY);

            if (newXMin > 0 && newXMax > newXMin && newYMax > newYMin) {
              setHoveredPoint(null);
              animateToDomain({ x: [newXMin, newXMax], y: [newYMin, newYMax] });
            }
          } else if (width >= 15 && height < 8) {
            const newXMin = pixelToDataX(px1, area, currentX);
            const newXMax = pixelToDataX(px2, area, currentX);
            if (newXMin > 0 && newXMax > newXMin) {
              setHoveredPoint(null);
              animateToDomain({ x: [newXMin, newXMax], y: currentY });
            }
          } else if (height >= 15 && width < 8) {
            const newYMax = pixelToDataY(py1, area, currentY);
            const newYMin = pixelToDataY(py2, area, currentY);
            if (newYMax > newYMin) {
              setHoveredPoint(null);
              animateToDomain({ x: currentX, y: [newYMin, newYMax] });
            }
          }
        }
        setDragBox(null);
        setIsDragging(false);
      } else if (activeButtonRef.current === 2) {
        setIsPanning(false);
      }

      isMouseDownRef.current = false;
      activeButtonRef.current = null;
      dragStartRef.current = null;
      panStartRef.current = null;
      document.body.style.cursor = "";
    };

    const onWindowContextMenu = (e: MouseEvent) => {
      if (chartRef.current && chartRef.current.contains(e.target as Node)) {
        e.preventDefault();
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("contextmenu", onWindowContextMenu);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("contextmenu", onWindowContextMenu);
      document.body.style.cursor = "";
    };
  }, []);

  // Layer Visibility Toggles
  const [showCI, setShowCI] = useState(true);
  const [showLc, setShowLc] = useState(true);
  const [showLd, setShowLd] = useState(true);
  const [showLodZone, setShowLodZone] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  // Compute collision-free vertical tiers for LOD badges
  const lodTierMap = useMemo(() => {
    if (curveSeriesList.length <= 1) {
      return new Map<string, number>();
    }
    const valid = curveSeriesList.filter(s => Number.isFinite(s.results?.lodConc) && s.results.lodConc > 0);
    const sorted = [...valid].sort((a, b) => a.results.lodConc - b.results.lodConc);
    const tierLastLogX: number[] = [];
    const map = new Map<string, number>();

    for (const s of sorted) {
      const logX = Math.log10(Math.max(s.results.lodConc, 1e-12));
      let assignedTier = -1;

      for (let t = 0; t < tierLastLogX.length; t++) {
        if (logX - tierLastLogX[t] >= 1.0) {
          assignedTier = t;
          tierLastLogX[t] = logX;
          break;
        }
      }

      if (assignedTier === -1) {
        assignedTier = tierLastLogX.length;
        tierLastLogX.push(logX);
      }

      map.set(s.id, assignedTier);
    }

    return map;
  }, [curveSeriesList]);

  const handleDownloadSVG = () => {
    if (!chartRef.current) return;
    const svgElement = chartRef.current.querySelector("svg");
    if (!svgElement) return;

    const rect = svgElement.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 500;

    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    clone.setAttribute("width", width.toString());
    clone.setAttribute("height", height.toString());
    clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
    clone.setAttribute("font-family", "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif");

    const docStyle = getComputedStyle(document.documentElement);
    const currentBg = docStyle.getPropertyValue("--base").trim() || "#141824";

    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bgRect.setAttribute("width", "100%");
    bgRect.setAttribute("height", "100%");
    bgRect.setAttribute("fill", currentBg);
    clone.insertBefore(bgRect, clone.firstChild);

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clone);

    const varNames = [
      "--rosewater", "--flamingo", "--pink", "--mauve", "--red", "--maroon", 
      "--peach", "--yellow", "--green", "--teal", "--sky", "--sapphire", 
      "--blue", "--lavender", "--text", "--subtext1", "--subtext0", 
      "--overlay2", "--overlay1", "--overlay0", "--surface2", "--surface1", 
      "--surface0", "--base", "--mantle", "--crust", "--border-subtle",
      "--card-bg", "--indigo", "--radius-pill", "--radius-sm", "--radius-xs"
    ];
    
    for (const v of varNames) {
      const c = docStyle.getPropertyValue(v).trim();
      if (c) {
        svgString = svgString.split(`var(${v})`).join(c);
      }
    }

    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement("a");
    downloadLink.download = `bioassay_plot_v${APP_VERSION}.svg`;
    downloadLink.href = url;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPlot = () => {
    if (!chartRef.current) return;
    const svgElement = chartRef.current.querySelector("svg");
    if (!svgElement) return;

    const rect = svgElement.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 500;

    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", width.toString());
    clone.setAttribute("height", height.toString());
    clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
    clone.style.backgroundColor = "transparent";

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clone);

    const docStyle = getComputedStyle(document.documentElement);
    const varNames = [
      "--rosewater", "--flamingo", "--pink", "--mauve", "--red", "--maroon", 
      "--peach", "--yellow", "--green", "--teal", "--sky", "--sapphire", 
      "--blue", "--lavender", "--text", "--subtext1", "--subtext0", 
      "--overlay2", "--overlay1", "--overlay0", "--surface2", "--surface1", 
      "--surface0", "--base", "--mantle", "--crust", "--border-subtle",
      "--card-bg", "--indigo", "--radius-pill", "--radius-sm", "--radius-xs"
    ];
    
    for (const v of varNames) {
      const c = docStyle.getPropertyValue(v).trim();
      if (c) {
        svgString = svgString.split(`var(${v})`).join(c);
      }
    }

    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const DOMURL = window.URL || window.webkitURL || window;
    const url = DOMURL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 300 / 96;
      canvas.width = width * scale;
      canvas.height = height * scale;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(scale, scale);
        const currentBg = docStyle.getPropertyValue("--base").trim() || "#141824";
        ctx.fillStyle = currentBg;
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `bioassay_plot_v${APP_VERSION}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
      DOMURL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <h2 className="chart-title">
            {plotTitle}
            {curveSeriesList.length > 1 && (
              <span className="curve-badge">
                {curveSeriesList.length} curves overlaid
              </span>
            )}
          </h2>

          {/* LAYER TOGGLE PILLS WITH GLOWING DOTS */}
          <div className="layer-toggles-bar">
            <button 
              className={`layer-toggle-pill ${showCI ? "active" : ""}`}
              onClick={() => setShowCI(!showCI)}
              title="Toggle 95% Confidence Interval band"
            >
              <span className="layer-indicator-dot" style={{ backgroundColor: "var(--blue)" }} />
              <span>95% CI</span>
            </button>
            <button 
              className={`layer-toggle-pill ${showLc ? "active" : ""}`}
              onClick={() => setShowLc(!showLc)}
              title="Toggle Critical Limit (LC) Decision Threshold Line"
            >
              <span className="layer-indicator-dot" style={{ backgroundColor: "var(--peach)" }} />
              <span>L<sub>C</sub></span>
            </button>
            <button 
              className={`layer-toggle-pill ${showLd ? "active" : ""}`}
              onClick={() => setShowLd(!showLd)}
              title="Toggle Detection Limit (LD) Minimum Detectable Signal Line"
            >
              <span className="layer-indicator-dot" style={{ backgroundColor: "var(--green)" }} />
              <span>L<sub>D</sub></span>
            </button>
            <button 
              className={`layer-toggle-pill ${showLodZone ? "active" : ""}`}
              onClick={() => setShowLodZone(!showLodZone)}
              title="Toggle Shaded Limit of Detection Range"
            >
              <span className="layer-indicator-dot" style={{ backgroundColor: "var(--yellow)" }} />
              <span>LOD Zone</span>
            </button>
            <button 
              className={`layer-toggle-pill ${showGrid ? "active" : ""}`}
              onClick={() => setShowGrid(!showGrid)}
              title="Toggle Cartesian Grid"
            >
              <span className="layer-indicator-dot" style={{ backgroundColor: "var(--subtext0)" }} />
              <span>Grid</span>
            </button>
          </div>
        </div>
        
        {/* EXPORT ACTION BUTTONS */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button 
            className="action-btn-pill" 
            onClick={handleExportCSV} 
            title="Download Full Multi-Curve Analytical Report as CSV"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>CSV</span>
          </button>
          <button 
            className="action-btn-pill" 
            onClick={handleDownloadPlot} 
            title="Download Publication-Ready Raster PNG Image"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>PNG</span>
          </button>
          <button 
            className="action-btn-pill" 
            onClick={handleDownloadSVG} 
            title="Download High-Resolution Scalable Vector Graphics (SVG)"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            <span>SVG</span>
          </button>
        </div>
      </div>
      
      <div 
        className={`chart-frame ${isPanning ? "panning" : ""}`} 
        ref={chartRef}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <ChartLegend
          curveSeriesList={curveSeriesList}
          showCI={showCI}
          showLc={showLc}
          showLd={showLd}
          showLodZone={showLodZone}
          hoveredSeriesId={hoveredSeriesId}
          setHoveredSeriesId={setHoveredSeriesId}
          onSelectSeries={onSelectSeries}
        />

        {/* Selection Rectangle Overlay during click & drag to zoom */}
        {dragBox && (() => {
          const boxLeft = Math.min(dragBox.startX, dragBox.currentX);
          const boxTop = Math.min(dragBox.startY, dragBox.currentY);
          const boxWidth = Math.abs(dragBox.currentX - dragBox.startX);
          const boxHeight = Math.abs(dragBox.currentY - dragBox.startY);
          if (boxWidth < 2 && boxHeight < 2) return null;
          return (
            <div
              className="chart-zoom-box"
              style={{
                left: boxLeft,
                top: boxTop,
                width: boxWidth,
                height: boxHeight
              }}
            />
          );
        })()}

        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 15, right: 35, left: 28, bottom: 35 }}>
            <PlotAreaWatcher onPlotArea={handlePlotArea} />

            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} horizontalValues={activeYMajorTicks} opacity={0.6} />}
            
            <XAxis 
              dataKey="x" type="number" scale="log" domain={activeXDomain} allowDataOverflow={true} stroke="var(--subtext1)" 
              ticks={activeXTicks}
              interval={0}
              tickLine={false}
              axisLine={false}
              tick={<CustomXAxisTick zeroX={xDomain[0]} breakStart={breakStart} breakEnd={breakEnd} isZoomed={zoomDomain !== null || isAnimating} decades={activeDecades} />}
              label={{ value: xAxisLabel, position: "bottom", fill: "var(--subtext1)", fontSize: 11.5, fontWeight: 600, offset: 25, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            />
            <YAxis 
              stroke="var(--subtext1)" 
              strokeWidth={1.2}
              domain={activeYDomain} 
              ticks={activeYMajorTicks}
              interval={0}
              tickMargin={0}
              allowDataOverflow={true}
              tickLine={false}
              tick={<CustomYAxisTick />}
              label={{ value: yAxisLabel, angle: -90, position: "insideLeft", fill: "var(--subtext1)", fontSize: 11.5, fontWeight: 600, offset: -5, fontFamily: "'Plus Jakarta Sans', sans-serif" }} 
            />
            <Tooltip 
              isAnimationActive={false}
              filterNull={false}
              content={(props) => (
                <CustomTooltip 
                  {...props} 
                  curveSeriesList={curveSeriesList} 
                  xDomain={activeXDomain} 
                  breakStart={breakStart} 
                  breakEnd={breakEnd}
                  hoveredPoint={hoveredPoint}
                  isInteracting={isDragging || isPanning || isAnimating}
                />
              )} 
              cursor={isDragging || isPanning || isAnimating ? false : { stroke: "var(--indigo)", strokeDasharray: "4 4", strokeWidth: 1.5, opacity: 0.7 }} 
            />
            
            {activeYAllTicks && activeYAllTicks.filter(t => !activeYMajorTicks.some(m => Math.abs(m - t) < 1e-9)).map(tick => (
              <ReferenceLine 
                key={`minor-y-${tick}`} 
                y={tick} 
                stroke="none" 
                label={<CustomMinorYAxisTickLabel />} 
              />
            ))}

            {/* 95% CI Fit Bands for Every Series */}
            {showCI && curveSeriesList.map(s => {
              const isDimmed = hoveredSeriesId !== null && hoveredSeriesId !== s.id;
              const fillOp = isDimmed ? 0.03 : (s.isActive ? 0.14 : 0.08);
              if (zoomDomain && zoomedSeriesMap) {
                const zData = zoomedSeriesMap.get(s.id)?.chartData || s.rightChartData;
                return (
                  <Area key={`ci-band-zoom-${s.id}`} data={zData} dataKey="ciRange" stroke="none" fill={s.color} fillOpacity={fillOp} activeDot={false} isAnimationActive={false} legendType="none" tooltipType="none" style={{ pointerEvents: "none" }} />
                );
              }
              return (
                <React.Fragment key={`ci-band-${s.id}`}>
                  <Area data={s.leftChartData} dataKey="ciRange" stroke="none" fill={s.color} fillOpacity={fillOp} activeDot={false} isAnimationActive={false} legendType="none" tooltipType="none" style={{ pointerEvents: "none" }} />
                  <Area data={s.rightChartData} dataKey="ciRange" stroke="none" fill={s.color} fillOpacity={fillOp} activeDot={false} isAnimationActive={false} legendType="none" tooltipType="none" style={{ pointerEvents: "none" }} />
                </React.Fragment>
              );
            })}

            {/* 95% CI LOD Range Areas for Every Series */}
            {showLodZone && curveSeriesList.filter(s => Number.isFinite(s.results?.lodCI?.low) && Number.isFinite(s.results?.lodCI?.high) && s.results.lodCI.high > s.results.lodCI.low && s.results.lodCI.high >= activeXDomain[0] && s.results.lodCI.low <= activeXDomain[1]).map(s => {
              const isDimmed = hoveredSeriesId !== null && hoveredSeriesId !== s.id;
              const fillOp = isDimmed ? 0.03 : (s.isActive ? 0.14 : 0.07);
              const isMulti = curveSeriesList.length > 1;
              const lodColor = isMulti ? s.color : "var(--yellow)";
              return (
                <ReferenceArea 
                  key={`lod-zone-${s.id}`}
                  x1={s.results.lodCI.low} 
                  x2={s.results.lodCI.high} 
                  fill={lodColor} 
                  fillOpacity={fillOp} 
                  strokeOpacity={0} 
                  ifOverflow="hidden" 
                  style={{ pointerEvents: "none" }} 
                />
              );
            })}

            {/* Active Series Statistical Decision Limits (LC / LD) */}
            {activeSeries && (
              <>
                {showLc && activeSeries.results.lc >= activeYDomain[0] && activeSeries.results.lc <= activeYDomain[1] && (
                  <>
                    {zoomDomain && zoomedSeriesMap ? (
                      <Line data={zoomedSeriesMap.get(activeSeries.id)?.lcData} dataKey="y" stroke="var(--peach)" strokeOpacity={0.65} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} legendType="none" tooltipType="none" style={{ pointerEvents: "none" }} />
                    ) : (
                      <>
                        <Line data={activeSeries.lcLeftData} dataKey="y" stroke="var(--peach)" strokeOpacity={0.65} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} legendType="none" tooltipType="none" style={{ pointerEvents: "none" }} />
                        <Line data={activeSeries.lcRightData} dataKey="y" stroke="var(--peach)" strokeOpacity={0.65} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} legendType="none" tooltipType="none" style={{ pointerEvents: "none" }} />
                      </>
                    )}
                    <ReferenceLine y={activeSeries.results.lc} stroke="none" label={<CustomLcLabel />} style={{ pointerEvents: "none" }} />
                  </>
                )}
                {showLd && activeSeries.results.ld >= activeYDomain[0] && activeSeries.results.ld <= activeYDomain[1] && (
                  <>
                    {zoomDomain && zoomedSeriesMap ? (
                      <Line data={zoomedSeriesMap.get(activeSeries.id)?.ldData} dataKey="y" stroke="var(--green)" strokeOpacity={0.65} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} legendType="none" tooltipType="none" style={{ pointerEvents: "none" }} />
                    ) : (
                      <>
                        <Line data={activeSeries.ldLeftData} dataKey="y" stroke="var(--green)" strokeOpacity={0.65} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} legendType="none" tooltipType="none" style={{ pointerEvents: "none" }} />
                        <Line data={activeSeries.ldRightData} dataKey="y" stroke="var(--green)" strokeOpacity={0.65} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} legendType="none" tooltipType="none" style={{ pointerEvents: "none" }} />
                      </>
                    )}
                    <ReferenceLine y={activeSeries.results.ld} stroke="none" label={<CustomLdLabel />} style={{ pointerEvents: "none" }} />
                  </>
                )}
              </>
            )}

            {/* 1. Render Fitted Curves for Every Series */}
            {curveSeriesList.map(s => {
              const isDimmed = hoveredSeriesId !== null && hoveredSeriesId !== s.id;
              if (zoomDomain && zoomedSeriesMap) {
                const zData = zoomedSeriesMap.get(s.id)?.chartData || s.rightChartData;
                return (
                  <Line 
                    key={`series-trend-zoom-${s.id}`}
                    data={zData} 
                    dataKey="trend" 
                    stroke={s.color} 
                    strokeWidth={s.isActive ? 3 : 2.2} 
                    strokeOpacity={isDimmed ? 0.25 : 1}
                    dot={false} 
                    activeDot={false} 
                    isAnimationActive={false} 
                    legendType="none" 
                    style={{ pointerEvents: "none" }} 
                  />
                );
              }
              return (
                <React.Fragment key={`series-trend-${s.id}`}>
                  <Line 
                    data={s.leftChartData} 
                    dataKey="trend" 
                    stroke={s.color} 
                    strokeWidth={s.isActive ? 3 : 2.2} 
                    strokeOpacity={isDimmed ? 0.25 : 1}
                    dot={false} 
                    activeDot={false} 
                    isAnimationActive={false} 
                    legendType="none" 
                    style={{ pointerEvents: "none" }} 
                  />
                  <Line 
                    data={s.rightChartData} 
                    dataKey="trend" 
                    stroke={s.color} 
                    strokeWidth={s.isActive ? 3 : 2.2} 
                    strokeOpacity={isDimmed ? 0.25 : 1}
                    dot={false} 
                    activeDot={false} 
                    isAnimationActive={false} 
                    legendType="none" 
                    style={{ pointerEvents: "none" }} 
                  />
                </React.Fragment>
              );
            })}

            {/* 2. Render Vertical LOD Dashed Lines */}
            {curveSeriesList.filter(s => Number.isFinite(s.results?.lodConc) && s.results.lodConc > 0 && s.results.lodConc >= activeXDomain[0] && s.results.lodConc <= activeXDomain[1]).map(s => {
              const isDimmed = hoveredSeriesId !== null && hoveredSeriesId !== s.id;
              const isMulti = curveSeriesList.length > 1;
              const lodColor = isMulti ? s.color : "var(--yellow)";
              const tier = isMulti ? (lodTierMap.get(s.id) ?? 0) : 0;
              const offsetY = isMulti ? tier * 24 : 0;

              return (
                <ReferenceLine 
                  key={`lod-line-${s.id}`} 
                  x={s.results.lodConc} 
                  stroke={lodColor} 
                  strokeWidth={s.isActive ? 2.2 : 1.4} 
                  strokeDasharray="4 4" 
                  strokeOpacity={isDimmed ? 0.2 : (s.isActive ? 1 : 0.75)}
                  shape={(lineProps: { x1?: number; y1?: number; x2?: number; y2?: number; stroke?: string; strokeWidth?: number; strokeDasharray?: string; strokeOpacity?: number }) => {
                    if (!lineProps || typeof lineProps.x1 !== "number" || typeof lineProps.y1 !== "number" || typeof lineProps.y2 !== "number") {
                      return <line stroke="none" />;
                    }
                    const chartTop = Math.min(lineProps.y1, lineProps.y2);
                    const chartBottom = Math.max(lineProps.y1, lineProps.y2);
                    const pillBottom = chartTop + 2 + offsetY + 20;
                    return (
                      <line
                        x1={lineProps.x1}
                        y1={Math.min(pillBottom, chartBottom)}
                        x2={lineProps.x2}
                        y2={chartBottom}
                        stroke={lineProps.stroke}
                        strokeWidth={lineProps.strokeWidth}
                        strokeDasharray={lineProps.strokeDasharray || "4 4"}
                        strokeOpacity={lineProps.strokeOpacity}
                        style={{ pointerEvents: "none" }}
                      />
                    );
                  }}
                  style={{ pointerEvents: "none" }} 
                />
              );
            })}

            {/* Render Scatters for Every Visible Series */}
            {curveSeriesList.map(s => {
              const isDimmed = hoveredSeriesId !== null && hoveredSeriesId !== s.id;
              return (
                <Scatter 
                  key={`series-scatter-${s.id}`}
                  data={s.scatterData} 
                  dataKey="y" 
                  isAnimationActive={false} 
                  legendType="none"
                  tooltipType="none"
                  shape={(dotProps: ScatterDotProps) => (
                    <CustomScatterDot 
                      {...dotProps} 
                      hoveredPoint={hoveredPoint}
                      setHoveredPoint={setHoveredPoint} 
                      tableHoveredRowId={tableHoveredRowId} 
                      hoveredPointId={hoveredPoint?.id}
                      seriesColor={s.color}
                      isDimmed={isDimmed}
                      isSingleCurve={curveSeriesList.length === 1}
                      isAnimating={isAnimating}
                    />
                  )} 
                />
              );
            })}

            {/* 3. Render All LOD Labels on TOP of all elements */}
            {curveSeriesList.filter(s => Number.isFinite(s.results?.lodConc) && s.results.lodConc > 0 && s.results.lodConc >= activeXDomain[0] && s.results.lodConc <= activeXDomain[1]).map(s => {
              const isDimmed = hoveredSeriesId !== null && hoveredSeriesId !== s.id;
              const isMulti = curveSeriesList.length > 1;
              const lodColor = isMulti ? s.color : "var(--yellow)";
              const tier = isMulti ? (lodTierMap.get(s.id) ?? 0) : 0;
              const offsetY = isMulti ? tier * 24 : 0;

              return (
                <ReferenceLine 
                  key={`lod-label-${s.id}`} 
                  x={s.results.lodConc} 
                  stroke="none" 
                  label={(
                    <CustomLodLabel 
                      labelText={isMulti ? `LOD (${s.name})` : "LOD"} 
                      color={lodColor} 
                      offsetY={offsetY}
                      opacity={isDimmed ? 0.25 : 1}
                    />
                  )} 
                  style={{ pointerEvents: "none" }} 
                />
              );
            })}

            {/* Zero break tick axis line */}
            {activeLeftAxisData.length > 0 && (
              <Line data={activeLeftAxisData} dataKey="y" stroke="var(--subtext1)" strokeWidth={1.2} dot={false} activeDot={false} isAnimationActive={false} legendType="none" tooltipType="none" style={{ pointerEvents: "none" }} />
            )}
            {activeRightAxisData.length > 0 && (
              <Line data={activeRightAxisData} dataKey="y" stroke="var(--subtext1)" strokeWidth={1.2} dot={false} activeDot={false} isAnimationActive={false} legendType="none" tooltipType="none" style={{ pointerEvents: "none" }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
        
        {hoveredPoint && !isDragging && !isPanning && !isAnimating && hoveredPoint.cx != null && hoveredPoint.cy != null && (() => {
          const frameWidth = chartWidth || 700;
          const isRight = hoveredPoint.cx > frameWidth - 190;
          const left = isRight ? hoveredPoint.cx - 175 : hoveredPoint.cx + 15;
          const top = Math.max(8, hoveredPoint.cy - 15);
          return (
            <div className="scatter-point-tooltip" style={{
              position: "absolute",
              left,
              top,
              backgroundColor: "var(--card-glass)",
              backdropFilter: "var(--glass-blur)",
              WebkitBackdropFilter: "var(--glass-blur)",
              border: "1px solid var(--pink)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 14px",
              fontSize: "0.78rem",
              color: "var(--text)",
              pointerEvents: "none",
              zIndex: 100,
              boxShadow: "var(--shadow-md)",
              display: "flex",
              flexDirection: "column",
              gap: "4px"
            }}>
              {hoveredPoint.seriesName && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "3px" }}>
                  <span style={{ color: "var(--subtext0)" }}>Curve</span>
                  <span style={{ fontWeight: 700, color: "var(--text)" }}>{hoveredPoint.seriesName}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
                <span style={{ color: "var(--subtext0)" }}>Concentration</span>
                <span style={{ fontWeight: 700, color: "var(--text)", fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="tabular-nums">{hoveredPoint.conc}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
                <span style={{ color: "var(--subtext0)" }}>Signal</span>
                <span style={{ fontWeight: 700, color: "var(--pink)", fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="tabular-nums">{hoveredPoint.y.toFixed(4)}</span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
