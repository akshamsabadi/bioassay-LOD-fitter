import React, { useRef, useState, useMemo } from "react";
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
  Tooltip
} from "recharts";
import { type AdvancedLoDResult } from "../utils/calculations";
import { formatScientificUnicode } from "../utils/formatters";
import { APP_VERSION } from "../constants";

interface XAxisTickProps {
  x?: number;
  y?: number;
  payload?: {
    value: number;
  };
  zeroX: number;
  breakStart: number;
  breakEnd: number;
}

const CustomXAxisTick = ({ x = 0, y = 0, payload, zeroX, breakStart, breakEnd }: XAxisTickProps) => {
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
  y: number;
  cx: number;
  cy: number;
  conc: number | string;
  seriesName?: string;
}

export interface ScatterDotProps {
  cx?: number;
  cy?: number;
  payload?: ChartScatterPoint;
  setHoveredPoint?: (pt: HoveredPointData | null) => void;
  tableHoveredRowId?: string | null;
  hoveredPointId?: string | undefined;
  seriesColor?: string;
  isDimmed?: boolean;
  isSingleCurve?: boolean;
}

const CustomScatterDot = (props: ScatterDotProps) => {
  const { cx = 0, cy = 0, payload, setHoveredPoint, tableHoveredRowId, hoveredPointId, seriesColor, isDimmed, isSingleCurve } = props;
  if (!payload) return null;
  const isSelected =
    payload.id === tableHoveredRowId ||
    payload.id === hoveredPointId ||
    (tableHoveredRowId === "blank" && (payload.actualX === 0 || payload.id.endsWith("-blank")));
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
          if (setHoveredPoint) setHoveredPoint({ id: payload.id, y: payload.y, cx, cy, conc: payload.actualX, seriesName: payload.seriesName });
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
    payload?: {
      x?: number;
    };
  }>;
  curveSeriesList: MultiCurvePlotSeries[];
  xDomain: [number, number];
  breakStart: number;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, curveSeriesList, xDomain, breakStart }) => {
  if (!active || !payload || !payload.length) return null;
  const pData = payload[0]?.payload as (ChartCurvePoint & Partial<ChartScatterPoint>) | undefined;
  const x = pData?.x;
  if (x === undefined || isNaN(x)) return null;

  const actualX = pData?.actualX;
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
  const activeSeries = curveSeriesList.find(s => s.isActive) || curveSeriesList[0];

  React.useEffect(() => {
    if (!chartRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width) {
          setChartWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(chartRef.current);
    return () => observer.disconnect();
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
      
      <div className="chart-frame" ref={chartRef}>
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
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 15, right: 35, left: 28, bottom: 35 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} horizontalValues={yMajorTicks} opacity={0.6} />}
            
            <XAxis 
              dataKey="x" type="number" scale="log" domain={xDomain} allowDataOverflow={true} stroke="var(--subtext1)" 
              ticks={xTicks}
              interval={0}
              tickLine={false}
              axisLine={false}
              tick={<CustomXAxisTick zeroX={xDomain[0]} breakStart={breakStart} breakEnd={breakEnd} />}
              label={{ value: xAxisLabel, position: "bottom", fill: "var(--subtext1)", fontSize: 11.5, fontWeight: 600, offset: 25, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            />
            <YAxis 
              stroke="var(--subtext1)" 
              strokeWidth={1.2}
              domain={yDomain} 
              ticks={yMajorTicks}
              interval={0}
              tickMargin={0}
              allowDataOverflow={true}
              tickLine={false}
              tick={<CustomYAxisTick />}
              label={{ value: yAxisLabel, angle: -90, position: "insideLeft", fill: "var(--subtext1)", fontSize: 11.5, fontWeight: 600, offset: -5, fontFamily: "'Plus Jakarta Sans', sans-serif" }} 
            />
            <Tooltip 
              isAnimationActive={false}
              content={(props) => (
                <CustomTooltip 
                  {...props} 
                  curveSeriesList={curveSeriesList} 
                  xDomain={xDomain} 
                  breakStart={breakStart} 
                />
              )} 
              cursor={{ stroke: "var(--indigo)", strokeDasharray: "4 4", strokeWidth: 1.5, opacity: 0.7 }} 
            />
            
            {yTicks && yTicks.filter(t => !yMajorTicks.some(m => Math.abs(m - t) < 1e-9)).map(tick => (
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
              return (
                <React.Fragment key={`ci-band-${s.id}`}>
                  <Area data={s.leftChartData} dataKey="ciRange" stroke="none" fill={s.color} fillOpacity={fillOp} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: "none" }} />
                  <Area data={s.rightChartData} dataKey="ciRange" stroke="none" fill={s.color} fillOpacity={fillOp} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: "none" }} />
                </React.Fragment>
              );
            })}

            {/* 95% CI LOD Range Areas for Every Series */}
            {showLodZone && curveSeriesList.filter(s => Number.isFinite(s.results?.lodCI?.low) && Number.isFinite(s.results?.lodCI?.high) && s.results.lodCI.high > s.results.lodCI.low).map(s => {
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
                {showLc && (
                  <>
                    <Line data={activeSeries.lcLeftData} dataKey="y" stroke="var(--peach)" strokeOpacity={0.65} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: "none" }} />
                    <Line data={activeSeries.lcRightData} dataKey="y" stroke="var(--peach)" strokeOpacity={0.65} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: "none" }} />
                    <ReferenceLine y={activeSeries.results.lc} stroke="none" label={<CustomLcLabel />} style={{ pointerEvents: "none" }} />
                  </>
                )}
                {showLd && (
                  <>
                    <Line data={activeSeries.ldLeftData} dataKey="y" stroke="var(--green)" strokeOpacity={0.65} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: "none" }} />
                    <Line data={activeSeries.ldRightData} dataKey="y" stroke="var(--green)" strokeOpacity={0.65} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: "none" }} />
                    <ReferenceLine y={activeSeries.results.ld} stroke="none" label={<CustomLdLabel />} style={{ pointerEvents: "none" }} />
                  </>
                )}
              </>
            )}

            {/* 1. Render Fitted Curves for Every Series */}
            {curveSeriesList.map(s => {
              const isDimmed = hoveredSeriesId !== null && hoveredSeriesId !== s.id;
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
            {curveSeriesList.filter(s => Number.isFinite(s.results?.lodConc) && s.results.lodConc > 0).map(s => {
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
                  shape={(dotProps: ScatterDotProps) => (
                    <CustomScatterDot 
                      {...dotProps} 
                      setHoveredPoint={setHoveredPoint} 
                      tableHoveredRowId={tableHoveredRowId} 
                      hoveredPointId={hoveredPoint?.id}
                      seriesColor={s.color}
                      isDimmed={isDimmed}
                      isSingleCurve={curveSeriesList.length === 1}
                    />
                  )} 
                />
              );
            })}

            {/* 3. Render All LOD Labels on TOP of all elements */}
            {curveSeriesList.filter(s => Number.isFinite(s.results?.lodConc) && s.results.lodConc > 0).map(s => {
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
            <Line data={leftAxisData} dataKey="y" stroke="var(--subtext1)" strokeWidth={1.2} dot={false} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: "none" }} />
            <Line data={rightAxisData} dataKey="y" stroke="var(--subtext1)" strokeWidth={1.2} dot={false} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: "none" }} />
          </ComposedChart>
        </ResponsiveContainer>
        
        {hoveredPoint && hoveredPoint.cx != null && hoveredPoint.cy != null && (() => {
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
