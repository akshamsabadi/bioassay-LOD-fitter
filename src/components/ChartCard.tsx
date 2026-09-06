import React, { useRef, useState } from "react";
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
        <line x1={x} y1={y - 16} x2={x} y2={y} stroke="var(--text)" strokeWidth={1} />
      </g>
    );
  }

  if (val === zeroX || val === 0 || isNaN(val)) {
    return (
      <g>
        <line x1={x} y1={y - 6} x2={x} y2={y} stroke="var(--text)" />
        <text x={x} y={y + 18} fill="var(--overlay2)" textAnchor="middle" fontSize={10}>0</text>
      </g>
    );
  }
  const rawExponent = Math.log10(Math.abs(val));
  const isMajor = Math.abs(rawExponent - Math.round(rawExponent)) < 0.0001;
  
  if (!isMajor) {
    return (
      <g>
        <line x1={x} y1={y - 6} x2={x} y2={y - 2} stroke="var(--text)" opacity={0.5} />
      </g>
    );
  }

  const exponent = Math.round(rawExponent);

  return (
    <g>
      <line x1={x} y1={y - 6} x2={x} y2={y} stroke="var(--text)" />
      <text x={x} y={y + 18} fill="var(--overlay2)" textAnchor="middle" fontSize={10}>
        <tspan>1 × 10</tspan>
        <tspan baselineShift="super" fontSize={8}>{exponent}</tspan>
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
  if (Math.abs(val) >= 10000 || (Math.abs(val) > 0 && Math.abs(val) < 0.001)) {
    label = val.toExponential(1);
  } else if (Math.abs(val - Math.round(val)) > 1e-6) {
    label = parseFloat(val.toFixed(4)).toString();
  }
  return (
    <g>
      <line x1={x} y1={y} x2={x - 6} y2={y} stroke="var(--text)" />
      <text x={x - 10} y={y + 3} fill="var(--overlay2)" textAnchor="end" fontSize={10}>
        {label}
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
      <text x={viewBox.x + viewBox.width + 5} y={viewBox.y + 8} fill="var(--peach)" fontSize={10} fontWeight={600}>
        L<tspan dy="0.3em" fontSize={7.5}>C</tspan>
      </text>
    </g>
  );
};

const CustomLdLabel = ({ viewBox }: ViewBoxProps) => {
  if (!viewBox) return null;
  return (
    <g style={{ pointerEvents: "none" }}>
      <text x={viewBox.x + viewBox.width + 5} y={viewBox.y - 2} fill="var(--green)" fontSize={10} fontWeight={600}>
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
}

const CustomLodLabel = ({ viewBox, labelText = "LOD", color = "var(--yellow)", offsetY = 0 }: LodLabelProps) => {
  if (!viewBox || typeof viewBox.x !== "number" || isNaN(viewBox.x) || typeof viewBox.y !== "number" || isNaN(viewBox.y)) {
    return null;
  }
  // Truncate long labels so pills don't span excessively across the plot
  const displayLabel = labelText.length > 18 ? labelText.slice(0, 15) + "…" : labelText;
  const charWidth = 6.2;
  const pillWidth = Math.min(Math.max(displayLabel.length * charWidth + 14, 38), 130);
  const halfWidth = pillWidth / 2;

  // Clamp x to avoid spilling over chart borders
  let x = viewBox.x;
  if (typeof viewBox.width === "number" && viewBox.width > 0) {
    const minX = halfWidth + 5;
    const maxX = viewBox.width - halfWidth - 5;
    x = Math.max(minX, Math.min(x, maxX));
  }
  const y = viewBox.y + 6 + offsetY;

  return (
    <g style={{ pointerEvents: "none" }}>
      <rect
        x={x - halfWidth}
        y={y}
        width={pillWidth}
        height={18}
        rx={5}
        fill="var(--surface0)"
        stroke={color}
        strokeWidth={1.2}
        opacity={0.95}
      />
      <text
        x={x}
        y={y + 12.5}
        fill={color}
        fontSize={10}
        fontWeight={700}
        textAnchor="middle"
        fontFamily="'Google Sans', -apple-system, sans-serif"
      >
        {displayLabel}
      </text>
    </g>
  );
};

const CustomMinorYAxisTickLabel = ({ viewBox }: Partial<ViewBoxProps>) => {
  if (!viewBox) return null;
  return <line x1={viewBox.x} y1={viewBox.y} x2={viewBox.x - 4} y2={viewBox.y} stroke="var(--text)" opacity={0.5} />;
};

interface ScatterDotProps {
  cx: number;
  cy: number;
  payload: {
    id: string;
    y: number;
    actualX: number | string;
    seriesId?: string;
    seriesName?: string;
    color?: string;
  };
  setHoveredPoint: (pt: any) => void;
  tableHoveredRowId: string | null;
  hoveredPointId: string | undefined;
  seriesColor?: string;
  isDimmed?: boolean;
  isSingleCurve?: boolean;
}

const CustomScatterDot = (props: ScatterDotProps) => {
  const { cx, cy, payload, setHoveredPoint, tableHoveredRowId, hoveredPointId, seriesColor, isDimmed, isSingleCurve } = props;
  const isSelected = payload.id === tableHoveredRowId || payload.id === hoveredPointId;
  const color = isSingleCurve ? "var(--red)" : (seriesColor || payload.color || "var(--red)");
  
  return (
    <g opacity={isDimmed ? 0.3 : 1}>
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
        style={{ cursor: "pointer", transition: "all 0.15s", pointerEvents: "all" }}
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
  leftChartData: any[];
  rightChartData: any[];
  scatterData: any[];
  lcLeftData: any[];
  lcRightData: any[];
  ldLeftData: any[];
  ldRightData: any[];
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
  leftAxisData: any[];
  rightAxisData: any[];
  hoveredPoint: { id: string; y: number; cx: number; cy: number; conc: number | string; seriesName?: string } | null;
  setHoveredPoint: (point: any) => void;
  tableHoveredRowId: string | null;
  handleExportCSV: () => void;
  hoveredSeriesId: string | null;
  setHoveredSeriesId: (id: string | null) => void;
  onSelectSeries?: (id: string) => void;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  plotTitle,
  activeResults: _activeResults,
  activeSeriesName: _activeSeriesName,
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
  const activeSeries = curveSeriesList.find(s => s.isActive) || curveSeriesList[0];

  // Layer Visibility Toggles
  const [showCI, setShowCI] = useState(true);
  const [showLc, setShowLc] = useState(true);
  const [showLd, setShowLd] = useState(true);
  const [showLodZone, setShowLodZone] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

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
    clone.setAttribute("font-family", "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif");

    const docStyle = getComputedStyle(document.documentElement);
    const currentBg = docStyle.getPropertyValue("--base").trim() || "#ffffff";

    // Add background rect as first child so SVG renders nicely standalone
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
      "--surface0", "--base", "--mantle", "--crust"
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
    downloadLink.download = "bioassay_plot_v0.6.30.svg";
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
      "--surface0", "--base", "--mantle", "--crust"
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
        const currentBg = docStyle.getPropertyValue("--base").trim() || "#ffffff";
        ctx.fillStyle = currentBg;
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = "bioassay_plot_v0.6.30.png";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
      DOMURL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // Custom Interactive Legend (Single Curve & Multi-Curve)
  const CustomLegend = () => {
    if (curveSeriesList.length === 1) {
      return (
        <div className="custom-chart-legend">
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "14px", height: "0", borderTop: "2px dashed var(--yellow)" }} />
            <span style={{ fontWeight: 600, color: "var(--yellow)" }}>LOD</span>
          </div>
          {showLodZone && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", backgroundColor: "color-mix(in srgb, var(--yellow) 25%, transparent)", border: "1px solid var(--yellow)", borderRadius: "2px" }} />
              <span>95% CI LOD</span>
            </div>
          )}
          {showLc && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "14px", height: "0", borderTop: "2px dashed var(--peach)" }} />
              <span>L<sub>C</sub></span>
            </div>
          )}
          {showLd && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "14px", height: "0", borderTop: "2px dashed var(--green)" }} />
              <span>L<sub>D</sub></span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "14px", height: "2px", backgroundColor: "var(--blue)", borderRadius: "2px" }} />
            <span>Model Fit</span>
          </div>
          {showCI && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", backgroundColor: "color-mix(in srgb, var(--blue) 25%, transparent)", border: "1px solid var(--blue)", borderRadius: "2px" }} />
              <span>95% CI Fit</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "var(--red)", fontSize: "13px", lineHeight: "1" }}>●</span>
            <span>Measured Data</span>
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
                gap: "6px",
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: "6px",
                backgroundColor: s.isActive ? "var(--surface1)" : (isHovered ? "var(--surface0)" : "transparent"),
                border: s.isActive ? `1px solid ${s.color}` : "1px solid transparent",
                transition: "all 0.15s"
              }}
              title={`Click to focus ${s.name} (LOD: ${s.results.lodConc.toExponential(2)})`}
            >
              <span style={{ width: "10px", height: "3px", backgroundColor: s.color, borderRadius: "2px" }} title="Curve fit" />
              <span style={{ width: "10px", height: "0", borderTop: `2px dashed ${s.color}` }} title="LOD threshold" />
              <span style={{ fontWeight: s.isActive ? "bold" : "normal", color: s.isActive ? "var(--text)" : "var(--subtext1)" }}>
                {s.name}
              </span>
            </div>
          );
        })}

        {(showLc || showLd || showLodZone) && (
          <div style={{ borderTop: "1px solid var(--surface1)", paddingTop: "6px", marginTop: "2px", display: "flex", flexDirection: "column", gap: "6px" }}>
            {showLc && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 6px" }}>
                <span style={{ width: "12px", height: "0", borderTop: "2px dashed var(--peach)" }} />
                <span>L<sub>C</sub></span>
              </div>
            )}
            {showLd && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 6px" }}>
                <span style={{ width: "12px", height: "0", borderTop: "2px dashed var(--green)" }} />
                <span>L<sub>D</sub></span>
              </div>
            )}
            {showLodZone && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 6px" }}>
                <span style={{ width: "10px", height: "10px", backgroundColor: "color-mix(in srgb, var(--yellow) 25%, transparent)", border: "1px solid var(--yellow)" }} />
                <span>95% CI (Active)</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Tooltip content for multi-curve
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const x = payload[0].payload.x;
    if (x === undefined || isNaN(x)) return null;

    return (
      <div className="custom-chart-tooltip" style={{
        backgroundColor: "var(--crust)",
        border: "1px solid var(--mauve)",
        borderRadius: "8px",
        padding: "10px 14px",
        fontSize: "0.78rem",
        color: "var(--text)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        pointerEvents: "none",
        zIndex: 1000,
        minWidth: "220px"
      }}>
        <div style={{ display: "flex", borderBottom: "1px solid var(--surface2)", paddingBottom: "3px", marginBottom: "3px", justifyContent: "space-between" }}>
          <span style={{ color: "var(--overlay2)", fontWeight: "bold", fontSize: "0.68rem" }}>CONCENTRATION</span>
          <span style={{ fontWeight: "bold", fontFamily: '"Google Sans Mono", monospace' }}>
            {x === 0 || (xDomain && Math.abs(x - xDomain[0]) < 1e-9) ? "0 (Blank)" : x.toFixed(4)}
          </span>
        </div>

        {curveSeriesList.map(s => {
          const pred = s.results.fit.predict(x);
          return (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px", color: s.color, fontWeight: s.isActive ? "bold" : "normal" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: s.color }} />
                {s.name}:
              </span>
              <span style={{ fontWeight: "bold", fontFamily: '"Google Sans Mono", monospace' }}>
                {isFinite(pred) ? pred.toFixed(3) : "—"}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="chart-card">
      <div className="chart-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: "8px" }}>
            {plotTitle}
            {curveSeriesList.length > 1 && (
              <span style={{ fontSize: "0.65rem", padding: "2px 6px", backgroundColor: "var(--surface1)", borderRadius: "6px", color: "var(--subtext0)", fontWeight: "normal" }}>
                {curveSeriesList.length} curves overlaid
              </span>
            )}
          </h2>

          {/* LAYER TOGGLE PILLS */}
          <div className="layer-toggles-bar">
            <button 
              className={`layer-toggle-pill ${showCI ? "active" : ""}`}
              onClick={() => setShowCI(!showCI)}
              title="Toggle 95% Confidence Interval band"
            >
              <span style={{ color: showCI ? "var(--blue)" : "inherit" }}>{showCI ? "✓" : "○"}</span> 95% CI
            </button>
            <button 
              className={`layer-toggle-pill ${showLc ? "active" : ""}`}
              onClick={() => setShowLc(!showLc)}
              title="Toggle Critical Limit (LC) Decision Threshold Line"
            >
              <span style={{ color: showLc ? "var(--peach)" : "inherit" }}>{showLc ? "✓" : "○"}</span> L<sub>C</sub>
            </button>
            <button 
              className={`layer-toggle-pill ${showLd ? "active" : ""}`}
              onClick={() => setShowLd(!showLd)}
              title="Toggle Detection Limit (LD) Minimum Detectable Signal Line"
            >
              <span style={{ color: showLd ? "var(--green)" : "inherit" }}>{showLd ? "✓" : "○"}</span> L<sub>D</sub>
            </button>
            <button 
              className={`layer-toggle-pill ${showLodZone ? "active" : ""}`}
              onClick={() => setShowLodZone(!showLodZone)}
              title="Toggle Shaded Limit of Detection Range"
            >
              <span style={{ color: showLodZone ? "var(--yellow)" : "inherit" }}>{showLodZone ? "✓" : "○"}</span> LOD Zone
            </button>
            <button 
              className={`layer-toggle-pill ${showGrid ? "active" : ""}`}
              onClick={() => setShowGrid(!showGrid)}
              title="Toggle Cartesian Grid"
            >
              <span style={{ color: showGrid ? "var(--blue)" : "inherit" }}>{showGrid ? "✓" : "○"}</span> Grid
            </button>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: "8px" }}>
          <button 
            className="action-btn" 
            onClick={handleExportCSV} 
            title="Download Full Multi-Curve Analytical Report as CSV"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "44px",
              height: "44px",
              padding: "4px",
              borderRadius: "8px",
              backgroundColor: "var(--surface0)",
              border: "1px solid var(--surface2)",
              color: "var(--text)",
              fontSize: "0.68rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              lineHeight: 1.1
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
              e.currentTarget.style.borderColor = "var(--green)";
              e.currentTarget.style.color = "var(--green)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "var(--surface2)";
              e.currentTarget.style.color = "var(--text)";
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span style={{ marginTop: "2px" }}>CSV</span>
          </button>
          <button 
            className="action-btn" 
            onClick={handleDownloadPlot} 
            title="Download Publication-Ready Raster PNG Image"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "44px",
              height: "44px",
              padding: "4px",
              borderRadius: "8px",
              backgroundColor: "var(--surface0)",
              border: "1px solid var(--surface2)",
              color: "var(--text)",
              fontSize: "0.68rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              lineHeight: 1.1
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
              e.currentTarget.style.borderColor = "var(--sapphire)";
              e.currentTarget.style.color = "var(--sapphire)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "var(--surface2)";
              e.currentTarget.style.color = "var(--text)";
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span style={{ marginTop: "2px" }}>PNG</span>
          </button>
          <button 
            className="action-btn" 
            onClick={handleDownloadSVG} 
            title="Download High-Resolution Scalable Vector Graphics (SVG)"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "44px",
              height: "44px",
              padding: "4px",
              borderRadius: "8px",
              backgroundColor: "var(--surface0)",
              border: "1px solid var(--surface2)",
              color: "var(--text)",
              fontSize: "0.68rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              lineHeight: 1.1
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
              e.currentTarget.style.borderColor = "var(--mauve)";
              e.currentTarget.style.color = "var(--mauve)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "var(--surface2)";
              e.currentTarget.style.color = "var(--text)";
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
            <span style={{ marginTop: "2px" }}>SVG</span>
          </button>
        </div>
      </div>
      
      <div style={{ position: "relative", width: "100%", height: "450px" }} ref={chartRef}>
        <CustomLegend />
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 15, right: 35, left: 28, bottom: 35 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--surface0)" vertical={false} horizontalValues={yMajorTicks} />}
            <ReferenceArea x1={breakStart} x2={breakEnd} y1={yDomain[0]} y2={yDomain[1]} fill="var(--mantle)" fillOpacity={1} strokeOpacity={0} style={{ pointerEvents: "none" }} />
            
            <XAxis 
              dataKey="x" type="number" scale="log" domain={xDomain} allowDataOverflow={true} stroke="var(--text)" 
              ticks={xTicks}
              interval={0}
              tickLine={false}
              axisLine={false}
              tick={<CustomXAxisTick zeroX={xDomain[0]} breakStart={breakStart} breakEnd={breakEnd} />}
              label={{ value: xAxisLabel, position: "bottom", fill: "var(--overlay2)", fontSize: 11, offset: 25 }}
            />
            <YAxis 
              stroke="var(--text)" 
              domain={yDomain} 
              ticks={yMajorTicks}
              interval={0}
              tickMargin={0}
              allowDataOverflow={true}
              tickLine={false}
              tick={<CustomYAxisTick />}
              label={{ value: yAxisLabel, angle: -90, position: "insideLeft", fill: "var(--overlay2)", fontSize: 11, offset: -5 }} 
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ stroke: "var(--overlay1)", strokeDasharray: "4 4", strokeWidth: 1.5 }} 
            />
            
            {yTicks && yTicks.filter(t => !yMajorTicks.includes(t)).map(tick => (
              <ReferenceLine 
                key={`minor-y-${tick}`} 
                y={tick} 
                stroke="none" 
                label={<CustomMinorYAxisTickLabel />} 
              />
            ))}

            {/* Active Series Confidence Intervals & Limits */}
            {activeSeries && (
              <>
                {showCI && (
                  <>
                    <Area data={activeSeries.leftChartData} dataKey="ciRange" stroke="none" fill={activeSeries.color} fillOpacity={0.12} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: "none" }} />
                    <Area data={activeSeries.rightChartData} dataKey="ciRange" stroke="none" fill={activeSeries.color} fillOpacity={0.12} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: "none" }} />
                  </>
                )}
                {showLodZone && (
                  <ReferenceArea x1={activeSeries.results.lodCI.low} x2={activeSeries.results.lodCI.high} fill="var(--yellow)" fillOpacity={0.12} strokeOpacity={0} ifOverflow="hidden" style={{ pointerEvents: "none" }} />
                )}

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

            {/* Render Curves for Every Visible Series */}
            {curveSeriesList.map(s => {
              const isDimmed = hoveredSeriesId !== null && hoveredSeriesId !== s.id;
              const isMulti = curveSeriesList.length > 1;
              const lodColor = isMulti ? s.color : "var(--yellow)";
              const seriesIndex = curveSeriesList.findIndex(c => c.id === s.id);
              const offsetY = isMulti ? (seriesIndex % 3) * 22 : 0;

              return (
                <React.Fragment key={`series-lines-${s.id}`}>
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
                  <ReferenceLine 
                    x={s.results.lodConc} 
                    stroke={lodColor} 
                    strokeWidth={s.isActive ? 2.2 : 1.4} 
                    strokeDasharray="4 4" 
                    strokeOpacity={isDimmed ? 0.2 : (s.isActive ? 1 : 0.75)}
                    label={(
                      <CustomLodLabel 
                        labelText={isMulti ? `LOD (${s.name})` : "LOD"} 
                        color={lodColor} 
                        offsetY={offsetY}
                      />
                    )} 
                    style={{ pointerEvents: "none" }} 
                  />
                </React.Fragment>
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
                  shape={(props: any) => (
                    <CustomScatterDot 
                      {...props} 
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

            {/* Zero break tick axis line */}
            <Line data={leftAxisData} dataKey="y" stroke="var(--text)" strokeWidth={1} dot={false} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: "none" }} />
            <Line data={rightAxisData} dataKey="y" stroke="var(--text)" strokeWidth={1} dot={false} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: "none" }} />
          </ComposedChart>
        </ResponsiveContainer>
        
        {hoveredPoint && hoveredPoint.cx && hoveredPoint.cy && (() => {
          const frameWidth = chartRef.current?.clientWidth || 700;
          const isRight = hoveredPoint.cx > frameWidth - 190;
          const left = isRight ? hoveredPoint.cx - 175 : hoveredPoint.cx + 15;
          const top = Math.max(8, hoveredPoint.cy - 15);
          return (
            <div style={{
              position: "absolute",
              left,
              top,
              backgroundColor: "var(--crust)",
              border: "1px solid var(--pink)",
              borderRadius: "8px",
              padding: "8px 12px",
              fontSize: "0.78rem",
              color: "var(--text)",
              pointerEvents: "none",
              zIndex: 100,
              boxShadow: "0 8px 16px rgba(0,0,0,0.4)",
              display: "flex",
              flexDirection: "column",
              gap: "4px"
            }}>
              {hoveredPoint.seriesName && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", borderBottom: "1px solid var(--surface1)", paddingBottom: "2px" }}>
                  <span style={{ color: "var(--subtext0)" }}>Curve</span>
                  <span style={{ fontWeight: "bold", color: "var(--text)" }}>{hoveredPoint.seriesName}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
                <span style={{ color: "var(--subtext0)" }}>Concentration</span>
                <span style={{ fontWeight: "bold", color: "var(--text)", fontFamily: '"Google Sans Mono", monospace' }}>{hoveredPoint.conc}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
                <span style={{ color: "var(--subtext0)" }}>Signal</span>
                <span style={{ fontWeight: "bold", color: "var(--pink)", fontFamily: '"Google Sans Mono", monospace' }}>{hoveredPoint.y.toFixed(4)}</span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
