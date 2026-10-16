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
  usePlotArea,
} from "recharts";
import { type AdvancedLoDResult } from "../utils/calculations";
import { formatScientificUnicode } from "../utils/formatters";
import { APP_VERSION } from "../constants";
import {
  computeNiceTicks,
  easeOutCubic,
  interpolateDomain,
  computePannedDomain,
  resolveDragZoomDomain,
  computeZoomedXTicks,
  computeAxisBreakSegments,
  computeLodBadgeTiers,
  type PlotArea,
} from "../utils/zoom";
import { downloadChartAsSVG, downloadChartAsPNG } from "../utils/reportExporters";

export type { PlotArea };

/** Default fallback chart container width in pixels prior to ResizeObserver measurement. */
const _DEFAULT_CHART_WIDTH_PX = 700;

/** Default fallback chart container height in pixels prior to ResizeObserver measurement. */
const _DEFAULT_CHART_HEIGHT_PX = 500;

/** Fallback left X coordinate of the plot area when SVG clipRect is unavailable. */
const _FALLBACK_PLOT_LEFT_PX = 88;

/** Fallback top Y coordinate of the plot area when SVG clipRect is unavailable. */
const _FALLBACK_PLOT_TOP_PX = 24;

/** Fallback right margin subtracted from container width when estimating plot area. */
const _FALLBACK_PLOT_RIGHT_MARGIN_PX = 35;

/** Fallback bottom margin subtracted from container height when estimating plot area. */
const _FALLBACK_PLOT_BOTTOM_MARGIN_PX = 65;

/** Minimum fallback plot area width/height in pixels. */
const _MIN_PLOT_DIMENSION_PX = 10;

/** Default decade span fallback when active X domain bounds are non-positive. */
const _DEFAULT_VISIBLE_DECADES = 4;

/** Number of log-spaced interpolation steps when rendering zoomed fitted curves. */
const _ZOOM_CURVE_GRID_STEPS = 120;

/** Duration (in milliseconds) of the cubic ease-out zoom transition animation. */
const _ZOOM_ANIMATION_DURATION_MS = 240;

/** Pixel tolerance around the plot boundary for initiating mouse drag/pan gestures. */
const _PLOT_HIT_PADDING_PX = 4;

/** Minimum pointer displacement (in pixels) before a left-click drag starts a zoom box. */
const _DRAG_START_THRESHOLD_PX = 5;

/** Height (in pixels) of the pill badge rendered at the top of each LOD reference line. */
const _LOD_PILL_HEIGHT_PX = 20;

/** Top offset (in pixels) of the LOD pill badge relative to the top of the plot area. */
const _LOD_PILL_TOP_OFFSET_PX = -12;

/** Minimum width or height (in pixels) required before rendering the visual drag-zoom box. */
const _MIN_ZOOM_BOX_RENDER_PX = 2;

/** Distance from the right edge of the chart frame (in pixels) at which the scatter tooltip flips left. */
const _SCATTER_TOOLTIP_RIGHT_FLIP_MARGIN_PX = 190;

/** Horizontal offset (in pixels) when the scatter point tooltip is flipped to the left of the cursor. */
const _SCATTER_TOOLTIP_LEFT_OFFSET_PX = 175;

/** Horizontal offset (in pixels) when the scatter point tooltip is placed to the right of the cursor. */
const _SCATTER_TOOLTIP_RIGHT_OFFSET_PX = 15;

/** Vertical upward offset (in pixels) for the scatter point tooltip relative to the data point. */
const _SCATTER_TOOLTIP_TOP_OFFSET_PX = 15;

/** Minimum top coordinate (in pixels) for clamping the scatter point tooltip inside the chart frame. */
const _SCATTER_TOOLTIP_MIN_TOP_PX = 8;

/** Maximum character length for an LOD pill badge label before truncation with an ellipsis. */
const _MAX_LOD_LABEL_CHARS = 18;

/** Prefix character count preserved when truncating a long LOD pill badge label. */
const _TRUNCATED_LOD_LABEL_CHARS = 15;

/** Approximate width per character (in pixels) used to size the SVG LOD pill badge. */
const _LOD_LABEL_CHAR_WIDTH_PX = 6.4;

/** Horizontal padding (in pixels) added to the estimated text width of an LOD pill badge. */
const _LOD_PILL_HORIZONTAL_PADDING_PX = 16;

/** Minimum width (in pixels) of an SVG LOD pill badge. */
const _LOD_PILL_MIN_WIDTH_PX = 42;

/** Maximum width (in pixels) of an SVG LOD pill badge. */
const _LOD_PILL_MAX_WIDTH_PX = 136;

/** Horizontal margin (in pixels) keeping LOD pill badges inside the plot area bounds. */
const _LOD_PILL_EDGE_PADDING_PX = 6;

/** Maximum visible decades at which minor X-axis ticks display numeric labels during deep zoom. */
const _ZOOMED_MINOR_LABEL_MAX_DECADES = 1.5;

/** Upper threshold for formatting zoomed minor X-axis tick labels in scientific notation. */
const _SCIENTIFIC_FORMAT_UPPER_BOUND = 1000;

/** Lower threshold for formatting zoomed minor X-axis tick labels in scientific notation. */
const _SCIENTIFIC_FORMAT_LOWER_BOUND = 0.01;

/** Upper threshold for formatting Y-axis tick labels in scientific notation. */
const _Y_AXIS_SCIENTIFIC_UPPER_BOUND = 10000;

/** Lower threshold for formatting Y-axis tick labels in scientific notation. */
const _Y_AXIS_SCIENTIFIC_LOWER_BOUND = 0.001;

/** Floating-point tolerance for matching tick coordinates. */
const _TICK_MATCH_EPSILON = 1e-9;

/** Tolerance for matching axis break tick coordinates. */
const _BREAK_TICK_EPSILON = 1e-10;

/** Tolerance for detecting integer log10 exponents on major X-axis ticks. */
const _MAJOR_EXPONENT_EPSILON = 0.0001;

/** Tolerance for detecting domain equality prior to starting a zoom animation. */
const _DOMAIN_EQUALITY_EPSILON = 1e-12;

/**
 * Internal Recharts helper component that observes the active plot area and forwards
 * positive dimensions to the parent `ChartCard`.
 */
const PlotAreaWatcher: React.FC<{ onPlotArea: (area: PlotArea) => void }> = ({ onPlotArea }) => {
  const plotArea = usePlotArea();
  useEffect(() => {
    if (plotArea && plotArea.width > 0 && plotArea.height > 0) {
      onPlotArea({
        x: plotArea.x,
        y: plotArea.y,
        width: plotArea.width,
        height: plotArea.height,
      });
    }
  }, [plotArea, onPlotArea]);
  return null;
};

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

/**
 * Custom SVG tick renderer for the logarithmic X-axis with synthetic zero and axis-break ticks.
 */
const CustomXAxisTick = ({
  x = 0,
  y = 0,
  payload,
  zeroX,
  breakStart,
  breakEnd,
  isZoomed,
  decades,
}: XAxisTickProps): React.ReactElement | null => {
  if (!payload) return null;
  const val = payload.value;
  if (breakStart && (Math.abs(val - breakStart) < _BREAK_TICK_EPSILON || Math.abs(val - breakEnd) < _BREAK_TICK_EPSILON)) {
    return (
      <g>
        <line x1={x} y1={y - 16} x2={x} y2={y} stroke="var(--subtext1)" strokeWidth={1.2} />
      </g>
    );
  }

  if (val === 0 || (zeroX && Math.abs(val - zeroX) < _BREAK_TICK_EPSILON) || isNaN(val)) {
    return (
      <g>
        <line x1={x} y1={y - 6} x2={x} y2={y} stroke="var(--subtext1)" strokeWidth={1.2} />
        <text
          x={x}
          y={y + 18}
          fill="var(--subtext1)"
          textAnchor="middle"
          fontSize={11}
          fontWeight={500}
          fontFamily="'Plus Jakarta Sans', sans-serif"
        >
          0
        </text>
      </g>
    );
  }

  const rawExponent = Math.log10(Math.abs(val));
  const isMajor = Math.abs(rawExponent - Math.round(rawExponent)) < _MAJOR_EXPONENT_EPSILON;

  if (!isMajor) {
    if (isZoomed && decades !== undefined && decades < _ZOOMED_MINOR_LABEL_MAX_DECADES) {
      let label = "";
      if (Math.abs(val) >= _SCIENTIFIC_FORMAT_UPPER_BOUND || (Math.abs(val) > 0 && Math.abs(val) < _SCIENTIFIC_FORMAT_LOWER_BOUND)) {
        label = formatScientificUnicode(val, 2);
      } else {
        label = parseFloat(val.toFixed(4)).toString();
      }
      return (
        <g>
          <line x1={x} y1={y - 6} x2={x} y2={y} stroke="var(--subtext1)" strokeWidth={1.2} />
          <text
            x={x}
            y={y + 18}
            fill="var(--subtext1)"
            textAnchor="middle"
            fontSize={10}
            fontWeight={500}
            fontFamily="'Plus Jakarta Sans', sans-serif"
          >
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
      <text
        x={x}
        y={y + 18}
        fill="var(--subtext1)"
        textAnchor="middle"
        fontSize={11}
        fontWeight={500}
        fontFamily="'Plus Jakarta Sans', sans-serif"
      >
        <tspan>10</tspan>
        <tspan baselineShift="super" fontSize={8.5}>
          {exponent}
        </tspan>
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

/**
 * Custom SVG tick renderer for the linear Y-axis supporting automatic scientific notation.
 */
const _CustomYAxisTick = ({ x = 0, y = 0, payload }: YAxisTickProps): React.ReactElement | null => {
  if (!payload) return null;
  const val = payload.value;
  let label = val.toString();
  let mantissa = "";
  let exponent: number | null = null;

  if (Math.abs(val) >= _Y_AXIS_SCIENTIFIC_UPPER_BOUND || (Math.abs(val) > 0 && Math.abs(val) < _Y_AXIS_SCIENTIFIC_LOWER_BOUND)) {
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
      <text
        x={x - 10}
        y={y + 3.5}
        fill="var(--subtext1)"
        textAnchor="end"
        fontSize={11}
        fontWeight={500}
        fontFamily="'Plus Jakarta Sans', sans-serif"
        className="tabular-nums"
      >
        {exponent !== null ? (
          <>
            <tspan>{mantissa}×10</tspan>
            <tspan baselineShift="super" fontSize={8.5}>
              {exponent}
            </tspan>
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

/**
 * Renders the right-margin $L_C$ label beside the critical decision limit line.
 */
const _CustomLcLabel = ({ viewBox }: ViewBoxProps): React.ReactElement | null => {
  if (!viewBox) return null;
  return (
    <g style={{ pointerEvents: "none" }}>
      <text
        x={viewBox.x + viewBox.width + 5}
        y={viewBox.y + 8}
        fill="var(--peach)"
        fontSize={10}
        fontWeight={700}
        fontFamily="'Plus Jakarta Sans', sans-serif"
      >
        L<tspan dy="0.3em" fontSize={7.5}>C</tspan>
      </text>
    </g>
  );
};

/**
 * Renders the right-margin $L_D$ label beside the detection limit signal line.
 */
const _CustomLdLabel = ({ viewBox }: ViewBoxProps): React.ReactElement | null => {
  if (!viewBox) return null;
  return (
    <g style={{ pointerEvents: "none" }}>
      <text
        x={viewBox.x + viewBox.width + 5}
        y={viewBox.y - 2}
        fill="var(--green)"
        fontSize={10}
        fontWeight={700}
        fontFamily="'Plus Jakarta Sans', sans-serif"
      >
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

/**
 * Renders the rounded pill badge at the top of a vertical LOD reference line.
 */
const _CustomLodLabel = ({
  viewBox,
  labelText = "LOD",
  color = "var(--yellow)",
  offsetY = 0,
  opacity = 1,
}: LodLabelProps): React.ReactElement | null => {
  if (
    !viewBox ||
    typeof viewBox.x !== "number" ||
    isNaN(viewBox.x) ||
    typeof viewBox.y !== "number" ||
    isNaN(viewBox.y)
  ) {
    return null;
  }
  const displayLabel =
    labelText.length > _MAX_LOD_LABEL_CHARS
      ? labelText.slice(0, _TRUNCATED_LOD_LABEL_CHARS) + "…"
      : labelText;
  const pillWidth = Math.min(
    Math.max(displayLabel.length * _LOD_LABEL_CHAR_WIDTH_PX + _LOD_PILL_HORIZONTAL_PADDING_PX, _LOD_PILL_MIN_WIDTH_PX),
    _LOD_PILL_MAX_WIDTH_PX
  );
  const halfWidth = pillWidth / 2;

  let x = viewBox.x;
  if (typeof viewBox.width === "number" && viewBox.width > 0) {
    const minX = halfWidth + _LOD_PILL_EDGE_PADDING_PX;
    const maxX = viewBox.width - halfWidth - _LOD_PILL_EDGE_PADDING_PX;
    x = Math.max(minX, Math.min(x, maxX));
  }
  const y = viewBox.y + _LOD_PILL_TOP_OFFSET_PX + offsetY;

  return (
    <g style={{ pointerEvents: "none", opacity }}>
      <rect
        x={x - halfWidth}
        y={y}
        width={pillWidth}
        height={_LOD_PILL_HEIGHT_PX}
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

/**
 * Renders a short horizontal tick mark along the Y-axis for minor subdivisions.
 */
const _CustomMinorYAxisTickLabel = ({ viewBox }: Partial<ViewBoxProps>): React.ReactElement | null => {
  if (!viewBox || typeof viewBox.x !== "number" || typeof viewBox.y !== "number") return null;
  return (
    <line
      x1={viewBox.x}
      y1={viewBox.y}
      x2={viewBox.x - 3.5}
      y2={viewBox.y}
      stroke="var(--subtext0)"
      strokeWidth={1}
      opacity={0.65}
    />
  );
};

/**
 * Sampled point along a fitted regression curve and its 95% confidence band.
 */
export interface ChartCurvePoint {
  x: number;
  trend?: number;
  ciRange?: [number, number] | number[];
}

/**
 * Individual measured replicate data point plotted as a scatter dot.
 */
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

/**
 * Two-point line segment endpoint used for $L_C$, $L_D$, and axis-break segments.
 */
export interface ChartLinePoint {
  x: number;
  y: number;
}

/**
 * Metadata for the currently hovered scatter replicate point.
 */
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

/**
 * Props passed to the custom SVG scatter dot renderer.
 */
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

/**
 * Custom interactive SVG scatter dot supporting per-replicate hover halos and sidebar row highlighting.
 */
const _CustomScatterDot = (props: ScatterDotProps): React.ReactElement | null => {
  const {
    cx = 0,
    cy = 0,
    payload,
    hoveredPoint,
    setHoveredPoint,
    tableHoveredRowId,
    hoveredPointId,
    seriesColor,
    isDimmed,
    isSingleCurve,
    isAnimating,
  } = props;
  if (!payload) return null;

  const isDirectlyHovered =
    hoveredPoint && payload.pointId
      ? payload.pointId === hoveredPoint.pointId
      : hoveredPointId
        ? payload.id === hoveredPointId
        : false;

  const isTableHovered = tableHoveredRowId
    ? payload.rowId === tableHoveredRowId ||
      payload.id === tableHoveredRowId ||
      (tableHoveredRowId === "blank" &&
        (payload.actualX === 0 || payload.rowId === "blank" || payload.id.endsWith("-blank")))
    : false;

  const isSelected = isDirectlyHovered || (!hoveredPoint && isTableHovered);
  const color = isSingleCurve ? "var(--red)" : seriesColor || payload.color || "var(--red)";

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
              seriesName: payload.seriesName,
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

/**
 * Precomputed curve, scatter, and threshold line series data for rendering a visible curve on the chart.
 */
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

/**
 * Props for the `ChartCard` component.
 */
export interface ChartCardProps {
  plotTitle: string;
  activeResults?: AdvancedLoDResult;
  activeSeriesName?: string;
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

/**
 * Interactive floating chart legend for single-curve and multi-curve overlays.
 */
const _ChartLegend: React.FC<ChartLegendProps> = ({
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
            <span
              style={{
                width: "10px",
                height: "10px",
                backgroundColor: "color-mix(in srgb, var(--yellow) 22%, transparent)",
                border: "1px dashed var(--yellow)",
                borderRadius: "var(--radius-xs)",
              }}
            />
            <span style={{ color: "var(--subtext1)" }}>95% CI LOD</span>
          </div>
        )}
        {showLc && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "14px", height: "0", borderTop: "2px dashed var(--peach)" }} />
            <span style={{ color: "var(--subtext1)" }}>
              L<sub>C</sub>
            </span>
          </div>
        )}
        {showLd && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "14px", height: "0", borderTop: "2px dashed var(--green)" }} />
            <span style={{ color: "var(--subtext1)" }}>
              L<sub>D</sub>
            </span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "14px",
              height: "2.5px",
              backgroundColor: "var(--blue)",
              borderRadius: "var(--radius-pill)",
            }}
          />
          <span style={{ color: "var(--subtext1)" }}>Model Fit</span>
        </div>
        {showCI && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                backgroundColor: "color-mix(in srgb, var(--blue) 22%, transparent)",
                border: "1px solid var(--blue)",
                borderRadius: "var(--radius-xs)",
              }}
            />
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
              backgroundColor: s.isActive ? "var(--surface1)" : isHovered ? "var(--surface0)" : "transparent",
              border: s.isActive ? `1px solid ${s.color}` : "1px solid transparent",
              transition: "all 0.15s ease",
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
        <div
          style={{
            borderTop: "1px solid var(--border-subtle)",
            paddingTop: "6px",
            marginTop: "2px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {showLc && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 6px" }}>
              <span style={{ width: "12px", height: "0", borderTop: "2px dashed var(--peach)" }} />
              <span style={{ color: "var(--subtext1)" }}>
                L<sub>C</sub>
              </span>
            </div>
          )}
          {showLd && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 6px" }}>
              <span style={{ width: "12px", height: "0", borderTop: "2px dashed var(--green)" }} />
              <span style={{ color: "var(--subtext1)" }}>
                L<sub>D</sub>
              </span>
            </div>
          )}
          {showCI && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 6px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  backgroundColor: "color-mix(in srgb, var(--overlay1) 22%, transparent)",
                  border: "1px solid var(--overlay1)",
                  borderRadius: "var(--radius-xs)",
                }}
              />
              <span style={{ color: "var(--subtext1)" }}>95% CI Fit</span>
            </div>
          )}
          {showLodZone && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 6px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  backgroundColor: "color-mix(in srgb, var(--overlay1) 22%, transparent)",
                  border: "1px dashed var(--overlay1)",
                  borderRadius: "var(--radius-xs)",
                }}
              />
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

/**
 * Crosshair tooltip displaying predicted signals across all visible curves at the hovered concentration.
 */
const _CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  curveSeriesList,
  xDomain,
  breakStart,
  hoveredPoint,
  isInteracting,
}) => {
  if (isInteracting || hoveredPoint || !active) return null;

  const lineEntry = payload?.find(p => p?.payload && typeof p.payload.x === "number" && !isNaN(p.payload.x));
  let x = lineEntry?.payload?.x;
  let actualX = lineEntry?.payload?.actualX;

  if (x === undefined || isNaN(x)) {
    const p0 = payload?.[0]?.payload as (ChartCurvePoint & Partial<ChartScatterPoint>) | undefined;
    if (p0 && typeof p0.x === "number" && !isNaN(p0.x)) {
      x = p0.x;
      actualX = p0.actualX;
    }
  }

  if (x === undefined || isNaN(x)) {
    if (typeof label === "number" && !isNaN(label)) {
      x = label;
    } else if (typeof label === "string" && !isNaN(parseFloat(label))) {
      x = parseFloat(label);
    }
  }

  if (x === undefined || isNaN(x)) return null;

  const isBlank =
    actualX !== undefined
      ? actualX === 0
      : x === 0 || (xDomain && Math.abs(x - xDomain[0]) < _TICK_MATCH_EPSILON) || (breakStart && x <= breakStart);

  const displayConc = isBlank
    ? "0 (Blank)"
    : formatScientificUnicode(
        actualX !== undefined ? (typeof actualX === "number" ? actualX : parseFloat(actualX)) : x,
        3
      );

  const evalX = isBlank ? 0 : x;

  return (
    <div className="custom-chart-tooltip">
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "4px",
          marginBottom: "2px",
          justifyContent: "space-between",
        }}
      >
        <span style={{ color: "var(--subtext0)", fontWeight: 600, fontSize: "0.72rem" }}>Concentration</span>
        <span style={{ fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="tabular-nums">
          {displayConc}
        </span>
      </div>

      {curveSeriesList.map(s => {
        const pred = s.results.fit.predict(evalX);
        return (
          <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px" }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: s.color,
                fontWeight: s.isActive ? 700 : 500,
              }}
            >
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

interface DragBoxOverlayState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  svgStartPx: number;
  svgStartPy: number;
  svgCurrentPx: number;
  svgCurrentPy: number;
}

/**
 * Renders the translucent selection rectangle during a left-click drag-to-zoom gesture.
 */
const _ZoomSelectionBox: React.FC<{ dragBox: DragBoxOverlayState | null }> = ({ dragBox }) => {
  if (!dragBox) return null;
  const boxLeft = Math.min(dragBox.startX, dragBox.currentX);
  const boxTop = Math.min(dragBox.startY, dragBox.currentY);
  const boxWidth = Math.abs(dragBox.currentX - dragBox.startX);
  const boxHeight = Math.abs(dragBox.currentY - dragBox.startY);
  if (boxWidth < _MIN_ZOOM_BOX_RENDER_PX && boxHeight < _MIN_ZOOM_BOX_RENDER_PX) return null;
  return (
    <div
      className="chart-zoom-box"
      style={{
        left: boxLeft,
        top: boxTop,
        width: boxWidth,
        height: boxHeight,
      }}
    />
  );
};

/**
 * Renders the floating tooltip anchored to an individual hovered replicate scatter point.
 */
const _ScatterPointTooltip: React.FC<{
  hoveredPoint: HoveredPointData | null;
  isInteracting: boolean;
  chartWidth: number;
}> = ({ hoveredPoint, isInteracting, chartWidth }) => {
  if (!hoveredPoint || isInteracting || hoveredPoint.cx == null || hoveredPoint.cy == null) {
    return null;
  }
  const frameWidth = chartWidth || _DEFAULT_CHART_WIDTH_PX;
  const isRight = hoveredPoint.cx > frameWidth - _SCATTER_TOOLTIP_RIGHT_FLIP_MARGIN_PX;
  const left = isRight
    ? hoveredPoint.cx - _SCATTER_TOOLTIP_LEFT_OFFSET_PX
    : hoveredPoint.cx + _SCATTER_TOOLTIP_RIGHT_OFFSET_PX;
  const top = Math.max(_SCATTER_TOOLTIP_MIN_TOP_PX, hoveredPoint.cy - _SCATTER_TOOLTIP_TOP_OFFSET_PX);

  return (
    <div
      className="scatter-point-tooltip"
      style={{
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
        gap: "4px",
      }}
    >
      {hoveredPoint.seriesName && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            borderBottom: "1px solid var(--border-subtle)",
            paddingBottom: "3px",
          }}
        >
          <span style={{ color: "var(--subtext0)" }}>Curve</span>
          <span style={{ fontWeight: 700, color: "var(--text)" }}>{hoveredPoint.seriesName}</span>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
        <span style={{ color: "var(--subtext0)" }}>Concentration</span>
        <span
          style={{ fontWeight: 700, color: "var(--text)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          className="tabular-nums"
        >
          {hoveredPoint.conc}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
        <span style={{ color: "var(--subtext0)" }}>Signal</span>
        <span
          style={{ fontWeight: 700, color: "var(--pink)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          className="tabular-nums"
        >
          {hoveredPoint.y.toFixed(4)}
        </span>
      </div>
    </div>
  );
};

/**
 * Interactive multi-curve dose-response chart card supporting selective drag-to-zoom,
 * right-click panning, double-click reset, layer visibility toggles, and SVG/PNG/CSV exports.
 */
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
  hoveredSeriesId,
  setHoveredSeriesId,
  onSelectSeries,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(_DEFAULT_CHART_WIDTH_PX);
  const [chartHeight, setChartHeight] = useState(_DEFAULT_CHART_HEIGHT_PX);
  const activeSeries = curveSeriesList.find(s => s.isActive) || curveSeriesList[0];

  const baseDomainKey = `${xDomain[0]},${xDomain[1]},${yDomain[0]},${yDomain[1]}`;
  const [zoomState, setZoomState] = useState<{
    domainKey: string;
    domain: { x: [number, number]; y: [number, number] };
  } | null>(null);
  const zoomDomain = useMemo<{ x: [number, number]; y: [number, number] } | null>(() => {
    return zoomState && zoomState.domainKey === baseDomainKey ? zoomState.domain : null;
  }, [zoomState, baseDomainKey]);

  const setZoomDomain = useCallback(
    (nextDomain: { x: [number, number]; y: [number, number] } | null): void => {
      setZoomState(nextDomain ? { domainKey: baseDomainKey, domain: nextDomain } : null);
    },
    [baseDomainKey]
  );

  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [animatingDomainKey, setAnimatingDomainKey] = useState<string | null>(null);
  const isAnimating = animatingDomainKey === baseDomainKey;
  const isAnimatingRef = useRef(false);
  const animationRafRef = useRef<number | null>(null);
  const targetDomainRef = useRef<{ x: [number, number]; y: [number, number] } | null>(null);

  const cancelAnimation = useCallback((): void => {
    if (animationRafRef.current !== null) {
      cancelAnimationFrame(animationRafRef.current);
      animationRafRef.current = null;
    }
    targetDomainRef.current = null;
    if (isAnimatingRef.current) {
      isAnimatingRef.current = false;
      setAnimatingDomainKey(null);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (animationRafRef.current !== null) {
        cancelAnimationFrame(animationRafRef.current);
        animationRafRef.current = null;
      }
      targetDomainRef.current = null;
      isAnimatingRef.current = false;
    };
  }, [baseDomainKey]);

  const [dragBox, setDragBox] = useState<DragBoxOverlayState | null>(null);
  const [, setPlotArea] = useState<PlotArea | null>(null);
  const plotAreaRef = useRef<PlotArea | null>(null);

  const handlePlotArea = useCallback((area: PlotArea): void => {
    plotAreaRef.current = area;
    setPlotArea(prev => {
      if (
        prev &&
        prev.x === area.x &&
        prev.y === area.y &&
        prev.width === area.width &&
        prev.height === area.height
      ) {
        return prev;
      }
      return area;
    });
  }, []);

  const getEffectivePlotArea = useCallback((): PlotArea => {
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
            x: _FALLBACK_PLOT_LEFT_PX,
            y: _FALLBACK_PLOT_TOP_PX,
            width: Math.max(
              _MIN_PLOT_DIMENSION_PX,
              svgRect.width - _FALLBACK_PLOT_LEFT_PX - _FALLBACK_PLOT_RIGHT_MARGIN_PX
            ),
            height: Math.max(
              _MIN_PLOT_DIMENSION_PX,
              svgRect.height - _FALLBACK_PLOT_TOP_PX - _FALLBACK_PLOT_BOTTOM_MARGIN_PX
            ),
          };
        }
      }
    }
    return {
      x: _FALLBACK_PLOT_LEFT_PX,
      y: _FALLBACK_PLOT_TOP_PX,
      width: Math.max(
        _MIN_PLOT_DIMENSION_PX,
        chartWidth - _FALLBACK_PLOT_LEFT_PX - _FALLBACK_PLOT_RIGHT_MARGIN_PX
      ),
      height: Math.max(
        _MIN_PLOT_DIMENSION_PX,
        chartHeight - _FALLBACK_PLOT_TOP_PX - _FALLBACK_PLOT_BOTTOM_MARGIN_PX
      ),
    };
  }, [chartWidth, chartHeight]);

  useEffect(() => {
    if (!chartRef.current) return;
    const observer = new ResizeObserver(entries => {
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

  const activeXDomain = useMemo<[number, number]>(() => {
    return zoomDomain ? zoomDomain.x : xDomain;
  }, [zoomDomain, xDomain]);

  const activeYDomain = useMemo<[number, number]>(() => {
    return zoomDomain ? zoomDomain.y : yDomain;
  }, [zoomDomain, yDomain]);

  const activeDecades = useMemo<number>(() => {
    if (activeXDomain[0] <= 0 || activeXDomain[1] <= 0) return _DEFAULT_VISIBLE_DECADES;
    return Math.log10(activeXDomain[1]) - Math.log10(activeXDomain[0]);
  }, [activeXDomain]);

  const activeXTicks = useMemo<number[]>(() => {
    if (!zoomDomain) return xTicks;
    return computeZoomedXTicks(activeXDomain, xTicks, breakStart, breakEnd);
  }, [zoomDomain, activeXDomain, xTicks, breakStart, breakEnd]);

  const { activeYMajorTicks, activeYAllTicks } = useMemo(() => {
    if (!zoomDomain) {
      return { activeYMajorTicks: yMajorTicks, activeYAllTicks: yTicks };
    }
    const [minY, maxY] = activeYDomain;
    const nice = computeNiceTicks(minY, maxY, 5);
    return { activeYMajorTicks: nice.majorTicks, activeYAllTicks: nice.allTicks };
  }, [zoomDomain, activeYDomain, yMajorTicks, yTicks]);

  const { activeLeftAxisData, activeRightAxisData } = useMemo(() => {
    if (!zoomDomain) {
      return { activeLeftAxisData: leftAxisData, activeRightAxisData: rightAxisData };
    }
    const segments = computeAxisBreakSegments(activeXDomain, activeYDomain[0], breakStart, breakEnd);
    return { activeLeftAxisData: segments.leftSegment, activeRightAxisData: segments.rightSegment };
  }, [zoomDomain, leftAxisData, rightAxisData, activeXDomain, activeYDomain, breakStart, breakEnd]);

  const zoomedSeriesMap = useMemo(() => {
    if (!zoomDomain) return null;
    const [minX, maxX] = activeXDomain;
    const logMin = Math.log10(minX);
    const logMax = Math.log10(maxX);
    const xGrid: number[] = [];
    for (let i = 0; i <= _ZOOM_CURVE_GRID_STEPS; i++) {
      xGrid.push(Math.pow(10, logMin + (i * (logMax - logMin)) / _ZOOM_CURVE_GRID_STEPS));
    }

    const map = new Map<
      string,
      { chartData: ChartCurvePoint[]; lcData: ChartLinePoint[]; ldData: ChartLinePoint[] }
    >();

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
        const evalX = xDomain && Math.abs(x - xDomain[0]) < _TICK_MATCH_EPSILON ? 0 : x;
        const pred = s.results.fit.predict(evalX);
        const ci = s.results.fit.getCI ? s.results.fit.getCI(evalX) : { low: pred, high: pred };
        return {
          x,
          trend: pred,
          ciRange: [ci.low, ci.high] as [number, number],
        };
      });

      const lcData = [
        { x: minX, y: s.results.lc },
        { x: maxX, y: s.results.lc },
      ];
      const ldData = [
        { x: minX, y: s.results.ld },
        { x: maxX, y: s.results.ld },
      ];

      map.set(s.id, { chartData, lcData, ldData });
    });

    return map;
  }, [zoomDomain, activeXDomain, curveSeriesList, xDomain]);

  const isMouseDownRef = useRef(false);
  const activeButtonRef = useRef<number | null>(null);
  const dragStartRef = useRef<{ px: number; py: number; clientX: number; clientY: number } | null>(null);
  const panStartRef = useRef<{
    clientX: number;
    clientY: number;
    xDomain: [number, number];
    yDomain: [number, number];
  } | null>(null);
  const dragBoxRef = useRef<DragBoxOverlayState | null>(null);
  const currentXDomainRef = useRef<[number, number]>(activeXDomain);
  const currentYDomainRef = useRef<[number, number]>(activeYDomain);

  useEffect(() => {
    dragBoxRef.current = dragBox;
  }, [dragBox]);

  useEffect(() => {
    currentXDomainRef.current = activeXDomain;
    currentYDomainRef.current = activeYDomain;
  }, [activeXDomain, activeYDomain]);

  const animateToDomain = useCallback(
    (targetDomain: { x: [number, number]; y: [number, number] } | null): void => {
      if (animationRafRef.current !== null) {
        cancelAnimationFrame(animationRafRef.current);
        animationRafRef.current = null;
      }

      const startDomain: { x: [number, number]; y: [number, number] } = {
        x: [...currentXDomainRef.current] as [number, number],
        y: [...currentYDomainRef.current] as [number, number],
      };

      const endDomain: { x: [number, number]; y: [number, number] } = targetDomain ?? {
        x: [...xDomain] as [number, number],
        y: [...yDomain] as [number, number],
      };

      const isSameX =
        Math.abs(startDomain.x[0] - endDomain.x[0]) < _DOMAIN_EQUALITY_EPSILON &&
        Math.abs(startDomain.x[1] - endDomain.x[1]) < _DOMAIN_EQUALITY_EPSILON;
      const isSameY =
        Math.abs(startDomain.y[0] - endDomain.y[0]) < _DOMAIN_EQUALITY_EPSILON &&
        Math.abs(startDomain.y[1] - endDomain.y[1]) < _DOMAIN_EQUALITY_EPSILON;
      if (
        (isSameX && isSameY) ||
        endDomain.x[0] <= 0 ||
        endDomain.x[1] <= endDomain.x[0] ||
        endDomain.y[1] <= endDomain.y[0]
      ) {
        targetDomainRef.current = null;
        isAnimatingRef.current = false;
        setAnimatingDomainKey(null);
        setZoomDomain(targetDomain);
        return;
      }

      targetDomainRef.current = targetDomain;
      isAnimatingRef.current = true;
      setAnimatingDomainKey(baseDomainKey);

      const startTime = performance.now();

      const step = (currentTime: number): void => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / _ZOOM_ANIMATION_DURATION_MS);
        const eased = easeOutCubic(progress);

        if (progress < 1) {
          const interpolated = interpolateDomain(startDomain, endDomain, eased);
          setZoomDomain(interpolated);
          animationRafRef.current = requestAnimationFrame(step);
        } else {
          animationRafRef.current = null;
          targetDomainRef.current = null;
          isAnimatingRef.current = false;
          setAnimatingDomainKey(null);
          setZoomDomain(targetDomain);
        }
      };

      animationRafRef.current = requestAnimationFrame(step);
    },
    [xDomain, yDomain, baseDomainKey, setZoomDomain]
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    if ((e.target as HTMLElement).closest(".custom-chart-legend")) return;
    if ((e.target as HTMLElement).closest("button")) return;

    cancelAnimation();

    const area = getEffectivePlotArea();
    const svg = chartRef.current?.querySelector("svg.recharts-surface") as SVGSVGElement | null;
    if (!svg) return;

    const svgRect = svg.getBoundingClientRect();
    const px = e.clientX - svgRect.left;
    const py = e.clientY - svgRect.top;

    const inPlot =
      px >= area.x - _PLOT_HIT_PADDING_PX &&
      px <= area.x + area.width + _PLOT_HIT_PADDING_PX &&
      py >= area.y - _PLOT_HIT_PADDING_PX &&
      py <= area.y + area.height + _PLOT_HIT_PADDING_PX;
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
        yDomain: activeYDomain,
      };
      isMouseDownRef.current = true;
      activeButtonRef.current = 2;
      setIsPanning(true);
      document.body.style.cursor = "grabbing";
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if ((e.target as HTMLElement).closest(".custom-chart-legend")) return;
    if ((e.target as HTMLElement).closest("button")) return;
    if (!zoomDomain && !isAnimatingRef.current) return;
    if (isAnimatingRef.current && targetDomainRef.current === null) return;
    setHoveredPoint(null);
    animateToDomain(null);
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>): void => {
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent): void => {
      if (!isMouseDownRef.current) return;
      const area = getEffectivePlotArea();
      const svg = chartRef.current?.querySelector("svg.recharts-surface") as SVGSVGElement | null;
      if (!svg) return;
      const svgRect = svg.getBoundingClientRect();
      const frameRect = chartRef.current?.getBoundingClientRect();
      if (!frameRect) return;

      if (activeButtonRef.current === 0 && dragStartRef.current) {
        const dist = Math.hypot(
          e.clientX - dragStartRef.current.clientX,
          e.clientY - dragStartRef.current.clientY
        );
        if (dist >= _DRAG_START_THRESHOLD_PX) {
          setIsDragging(true);
          document.body.style.cursor = "crosshair";

          const currentPx = Math.max(area.x, Math.min(area.x + area.width, e.clientX - svgRect.left));
          const currentPy = Math.max(area.y, Math.min(area.y + area.height, e.clientY - svgRect.top));

          const nextBox: DragBoxOverlayState = {
            startX: dragStartRef.current.clientX - frameRect.left,
            startY: dragStartRef.current.clientY - frameRect.top,
            currentX: e.clientX - frameRect.left,
            currentY: e.clientY - frameRect.top,
            svgStartPx: dragStartRef.current.px,
            svgStartPy: dragStartRef.current.py,
            svgCurrentPx: currentPx,
            svgCurrentPy: currentPy,
          };
          dragBoxRef.current = nextBox;
          setDragBox(nextBox);
        }
      } else if (activeButtonRef.current === 2 && panStartRef.current) {
        e.preventDefault();
        const dx = e.clientX - panStartRef.current.clientX;
        const dy = e.clientY - panStartRef.current.clientY;
        const panned = computePannedDomain(panStartRef.current, dx, dy, area);
        setZoomDomain(panned);
      }
    };

    const onMouseUp = (): void => {
      if (!isMouseDownRef.current) return;
      const area = getEffectivePlotArea();

      if (activeButtonRef.current === 0) {
        if (dragBoxRef.current) {
          const nextZoom = resolveDragZoomDomain(
            dragBoxRef.current,
            area,
            currentXDomainRef.current,
            currentYDomainRef.current
          );
          if (nextZoom) {
            setHoveredPoint(null);
            animateToDomain(nextZoom);
          }
        }
        dragBoxRef.current = null;
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

    const onWindowContextMenu = (e: MouseEvent): void => {
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
  }, [animateToDomain, getEffectivePlotArea, setHoveredPoint, setZoomDomain]);

  const [showCI, setShowCI] = useState(true);
  const [showLc, setShowLc] = useState(true);
  const [showLd, setShowLd] = useState(true);
  const [showLodZone, setShowLodZone] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  const lodTierMap = useMemo<Map<string, number>>(() => {
    return computeLodBadgeTiers(
      curveSeriesList.map(s => ({ id: s.id, lodConc: s.results?.lodConc ?? NaN }))
    );
  }, [curveSeriesList]);

  const handleDownloadSVG = (): void => {
    downloadChartAsSVG(chartRef.current, `bioassay_plot_v${APP_VERSION}.svg`);
  };

  const handleDownloadPlot = (): void => {
    downloadChartAsPNG(chartRef.current, `bioassay_plot_v${APP_VERSION}.png`);
  };

  const isInteracting = isDragging || isPanning || isAnimating;

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <h2 className="chart-title">
            {plotTitle}
            {curveSeriesList.length > 1 && (
              <span className="curve-badge">{curveSeriesList.length} curves overlaid</span>
            )}
          </h2>

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
              <span>
                L<sub>C</sub>
              </span>
            </button>
            <button
              className={`layer-toggle-pill ${showLd ? "active" : ""}`}
              onClick={() => setShowLd(!showLd)}
              title="Toggle Detection Limit (LD) Minimum Detectable Signal Line"
            >
              <span className="layer-indicator-dot" style={{ backgroundColor: "var(--green)" }} />
              <span>
                L<sub>D</sub>
              </span>
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

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {zoomDomain !== null && (
            <button
              className="action-btn-pill"
              onClick={() => animateToDomain(null)}
              title="Reset zoom to full view (or double-click chart)"
              style={{
                borderColor: "color-mix(in srgb, var(--blue) 45%, transparent)",
                color: "var(--blue)",
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span>Reset Zoom</span>
            </button>
          )}
          <button
            className="action-btn-pill"
            onClick={handleDownloadPlot}
            title="Download Publication-Ready Raster PNG Image"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
        <_ChartLegend
          curveSeriesList={curveSeriesList}
          showCI={showCI}
          showLc={showLc}
          showLd={showLd}
          showLodZone={showLodZone}
          hoveredSeriesId={hoveredSeriesId}
          setHoveredSeriesId={setHoveredSeriesId}
          onSelectSeries={onSelectSeries}
        />

        <_ZoomSelectionBox dragBox={dragBox} />

        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart accessibilityLayer={false} margin={{ top: 24, right: 35, left: 28, bottom: 35 }}>
            <PlotAreaWatcher onPlotArea={handlePlotArea} />

            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-subtle)"
                vertical={false}
                horizontalValues={activeYMajorTicks}
                opacity={0.6}
              />
            )}

            <XAxis
              dataKey="x"
              type="number"
              scale="log"
              domain={activeXDomain}
              allowDataOverflow={true}
              stroke="var(--subtext1)"
              ticks={activeXTicks}
              interval={0}
              tickLine={false}
              axisLine={false}
              tick={
                <CustomXAxisTick
                  zeroX={xDomain[0]}
                  breakStart={breakStart}
                  breakEnd={breakEnd}
                  isZoomed={zoomDomain !== null || isAnimating}
                  decades={activeDecades}
                />
              }
              label={{
                value: xAxisLabel,
                position: "bottom",
                fill: "var(--subtext1)",
                fontSize: 11.5,
                fontWeight: 600,
                offset: 25,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
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
              tick={<_CustomYAxisTick />}
              label={{
                value: yAxisLabel,
                angle: -90,
                position: "insideLeft",
                fill: "var(--subtext1)",
                fontSize: 11.5,
                fontWeight: 600,
                offset: -5,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            />
            <Tooltip
              isAnimationActive={false}
              filterNull={false}
              content={props => (
                <_CustomTooltip
                  {...props}
                  curveSeriesList={curveSeriesList}
                  xDomain={activeXDomain}
                  breakStart={breakStart}
                  breakEnd={breakEnd}
                  hoveredPoint={hoveredPoint}
                  isInteracting={isInteracting}
                />
              )}
              cursor={
                isInteracting
                  ? false
                  : { stroke: "var(--indigo)", strokeDasharray: "4 4", strokeWidth: 1.5, opacity: 0.7 }
              }
            />

            {activeYAllTicks &&
              activeYAllTicks
                .filter(t => !activeYMajorTicks.some(m => Math.abs(m - t) < _TICK_MATCH_EPSILON))
                .map(tick => (
                  <ReferenceLine
                    key={`minor-y-${tick}`}
                    y={tick}
                    stroke="none"
                    label={<_CustomMinorYAxisTickLabel />}
                  />
                ))}

            {showCI &&
              curveSeriesList.map(s => {
                const isDimmed = hoveredSeriesId !== null && hoveredSeriesId !== s.id;
                const fillOp = isDimmed ? 0.03 : s.isActive ? 0.14 : 0.08;
                if (zoomDomain && zoomedSeriesMap) {
                  const zData = zoomedSeriesMap.get(s.id)?.chartData || s.rightChartData;
                  return (
                    <Area
                      key={`ci-band-zoom-${s.id}`}
                      data={zData}
                      dataKey="ciRange"
                      stroke="none"
                      fill={s.color}
                      fillOpacity={fillOp}
                      activeDot={false}
                      isAnimationActive={false}
                      legendType="none"
                      tooltipType="none"
                      style={{ pointerEvents: "none" }}
                    />
                  );
                }
                return (
                  <React.Fragment key={`ci-band-${s.id}`}>
                    <Area
                      data={s.leftChartData}
                      dataKey="ciRange"
                      stroke="none"
                      fill={s.color}
                      fillOpacity={fillOp}
                      activeDot={false}
                      isAnimationActive={false}
                      legendType="none"
                      tooltipType="none"
                      style={{ pointerEvents: "none" }}
                    />
                    <Area
                      data={s.rightChartData}
                      dataKey="ciRange"
                      stroke="none"
                      fill={s.color}
                      fillOpacity={fillOp}
                      activeDot={false}
                      isAnimationActive={false}
                      legendType="none"
                      tooltipType="none"
                      style={{ pointerEvents: "none" }}
                    />
                  </React.Fragment>
                );
              })}

            {showLodZone &&
              curveSeriesList
                .filter(
                  s =>
                    Number.isFinite(s.results?.lodCI?.low) &&
                    Number.isFinite(s.results?.lodCI?.high) &&
                    s.results.lodCI.high > s.results.lodCI.low &&
                    s.results.lodCI.high >= activeXDomain[0] &&
                    s.results.lodCI.low <= activeXDomain[1]
                )
                .map(s => {
                  const isDimmed = hoveredSeriesId !== null && hoveredSeriesId !== s.id;
                  const fillOp = isDimmed ? 0.03 : s.isActive ? 0.14 : 0.07;
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

            {activeSeries && (
              <>
                {showLc &&
                  activeSeries.results.lc >= activeYDomain[0] &&
                  activeSeries.results.lc <= activeYDomain[1] && (
                    <>
                      {zoomDomain && zoomedSeriesMap ? (
                        <Line
                          data={zoomedSeriesMap.get(activeSeries.id)?.lcData}
                          dataKey="y"
                          stroke="var(--peach)"
                          strokeOpacity={0.65}
                          strokeDasharray="4 4"
                          dot={false}
                          activeDot={false}
                          isAnimationActive={false}
                          legendType="none"
                          tooltipType="none"
                          style={{ pointerEvents: "none" }}
                        />
                      ) : (
                        <>
                          <Line
                            data={activeSeries.lcLeftData}
                            dataKey="y"
                            stroke="var(--peach)"
                            strokeOpacity={0.65}
                            strokeDasharray="4 4"
                            dot={false}
                            activeDot={false}
                            isAnimationActive={false}
                            legendType="none"
                            tooltipType="none"
                            style={{ pointerEvents: "none" }}
                          />
                          <Line
                            data={activeSeries.lcRightData}
                            dataKey="y"
                            stroke="var(--peach)"
                            strokeOpacity={0.65}
                            strokeDasharray="4 4"
                            dot={false}
                            activeDot={false}
                            isAnimationActive={false}
                            legendType="none"
                            tooltipType="none"
                            style={{ pointerEvents: "none" }}
                          />
                        </>
                      )}
                      <ReferenceLine
                        y={activeSeries.results.lc}
                        stroke="none"
                        label={<_CustomLcLabel />}
                        style={{ pointerEvents: "none" }}
                      />
                    </>
                  )}
                {showLd &&
                  activeSeries.results.ld >= activeYDomain[0] &&
                  activeSeries.results.ld <= activeYDomain[1] && (
                    <>
                      {zoomDomain && zoomedSeriesMap ? (
                        <Line
                          data={zoomedSeriesMap.get(activeSeries.id)?.ldData}
                          dataKey="y"
                          stroke="var(--green)"
                          strokeOpacity={0.65}
                          strokeDasharray="4 4"
                          dot={false}
                          activeDot={false}
                          isAnimationActive={false}
                          legendType="none"
                          tooltipType="none"
                          style={{ pointerEvents: "none" }}
                        />
                      ) : (
                        <>
                          <Line
                            data={activeSeries.ldLeftData}
                            dataKey="y"
                            stroke="var(--green)"
                            strokeOpacity={0.65}
                            strokeDasharray="4 4"
                            dot={false}
                            activeDot={false}
                            isAnimationActive={false}
                            legendType="none"
                            tooltipType="none"
                            style={{ pointerEvents: "none" }}
                          />
                          <Line
                            data={activeSeries.ldRightData}
                            dataKey="y"
                            stroke="var(--green)"
                            strokeOpacity={0.65}
                            strokeDasharray="4 4"
                            dot={false}
                            activeDot={false}
                            isAnimationActive={false}
                            legendType="none"
                            tooltipType="none"
                            style={{ pointerEvents: "none" }}
                          />
                        </>
                      )}
                      <ReferenceLine
                        y={activeSeries.results.ld}
                        stroke="none"
                        label={<_CustomLdLabel />}
                        style={{ pointerEvents: "none" }}
                      />
                    </>
                  )}
              </>
            )}

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

            {curveSeriesList
              .filter(
                s =>
                  Number.isFinite(s.results?.lodConc) &&
                  s.results.lodConc > 0 &&
                  s.results.lodConc >= activeXDomain[0] &&
                  s.results.lodConc <= activeXDomain[1]
              )
              .map(s => {
                const isDimmed = hoveredSeriesId !== null && hoveredSeriesId !== s.id;
                const isMulti = curveSeriesList.length > 1;
                const lodColor = isMulti ? s.color : "var(--yellow)";
                const offsetY = isMulti ? (lodTierMap.get(s.id) ?? 0) : 0;

                return (
                  <ReferenceLine
                    key={`lod-line-${s.id}`}
                    x={s.results.lodConc}
                    stroke={lodColor}
                    strokeWidth={s.isActive ? 2.2 : 1.4}
                    strokeDasharray="4 4"
                    strokeOpacity={isDimmed ? 0.2 : s.isActive ? 1 : 0.75}
                    shape={(lineProps: {
                      x1?: number;
                      y1?: number;
                      x2?: number;
                      y2?: number;
                      stroke?: string;
                      strokeWidth?: number;
                      strokeDasharray?: string;
                      strokeOpacity?: number;
                    }) => {
                      if (
                        !lineProps ||
                        typeof lineProps.x1 !== "number" ||
                        typeof lineProps.y1 !== "number" ||
                        typeof lineProps.y2 !== "number"
                      ) {
                        return <line stroke="none" />;
                      }
                      const chartTop = Math.min(lineProps.y1, lineProps.y2);
                      const chartBottom = Math.max(lineProps.y1, lineProps.y2);
                      const pillBottom = chartTop + _LOD_PILL_TOP_OFFSET_PX + offsetY + _LOD_PILL_HEIGHT_PX;
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
                    <_CustomScatterDot
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

            {curveSeriesList
              .filter(
                s =>
                  Number.isFinite(s.results?.lodConc) &&
                  s.results.lodConc > 0 &&
                  s.results.lodConc >= activeXDomain[0] &&
                  s.results.lodConc <= activeXDomain[1]
              )
              .map(s => {
                const isDimmed = hoveredSeriesId !== null && hoveredSeriesId !== s.id;
                const isMulti = curveSeriesList.length > 1;
                const lodColor = isMulti ? s.color : "var(--yellow)";
                const offsetY = isMulti ? (lodTierMap.get(s.id) ?? 0) : 0;

                return (
                  <ReferenceLine
                    key={`lod-label-${s.id}`}
                    x={s.results.lodConc}
                    stroke="none"
                    label={
                      <_CustomLodLabel
                        labelText={isMulti ? `LOD (${s.name})` : "LOD"}
                        color={lodColor}
                        offsetY={offsetY}
                        opacity={isDimmed ? 0.25 : 1}
                      />
                    }
                    style={{ pointerEvents: "none" }}
                  />
                );
              })}

            {activeLeftAxisData.length > 0 && (
              <Line
                data={activeLeftAxisData}
                dataKey="y"
                stroke="var(--subtext1)"
                strokeWidth={1.2}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                legendType="none"
                tooltipType="none"
                style={{ pointerEvents: "none" }}
              />
            )}
            {activeRightAxisData.length > 0 && (
              <Line
                data={activeRightAxisData}
                dataKey="y"
                stroke="var(--subtext1)"
                strokeWidth={1.2}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                legendType="none"
                tooltipType="none"
                style={{ pointerEvents: "none" }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        <_ScatterPointTooltip
          hoveredPoint={hoveredPoint}
          isInteracting={isInteracting}
          chartWidth={chartWidth}
        />
      </div>
    </div>
  );
};
