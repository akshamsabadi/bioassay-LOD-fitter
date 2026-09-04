import React, { useRef } from "react";
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
  Legend,
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
    <text x={viewBox.x + viewBox.width + 5} y={viewBox.y + 4} fill="var(--peach)" fontSize={10}>
      L<tspan dy="0.3em" fontSize={7.5}>C</tspan>
    </text>
  );
};

const CustomLdLabel = ({ viewBox }: ViewBoxProps) => {
  if (!viewBox) return null;
  return (
    <text x={viewBox.x + viewBox.width + 5} y={viewBox.y + 4} fill="var(--green)" fontSize={10}>
      L<tspan dy="0.3em" fontSize={7.5}>D</tspan>
    </text>
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
}

const CustomScatterDot = (props: ScatterDotProps) => {
  const { cx, cy, payload, setHoveredPoint, tableHoveredRowId, hoveredPointId, seriesColor, isDimmed } = props;
  const isSelected = payload.id === tableHoveredRowId || payload.id === hoveredPointId;
  const color = seriesColor || payload.color || "var(--red)";
  
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
        ctx.drawImage(img, 0, 0, width, height);
        
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = "bioassay_plot_v0.6.21.png";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
      DOMURL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // Custom Interactive Multi-Curve Legend
  const CustomLegend = () => {
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
              <span style={{ width: "12px", height: "3px", backgroundColor: s.color, borderRadius: "2px" }} />
              <span style={{ fontWeight: s.isActive ? "bold" : "normal", color: s.isActive ? "var(--text)" : "var(--subtext1)" }}>
                {s.name}
              </span>
            </div>
          );
        })}

        <div style={{ borderTop: "1px solid var(--surface1)", paddingTop: "6px", marginTop: "2px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 6px" }}>
            <span style={{ width: "12px", height: "0", borderTop: "2px dashed var(--peach)" }} />
            <span>L<sub>C</sub></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 6px" }}>
            <span style={{ width: "12px", height: "0", borderTop: "2px dashed var(--green)" }} />
            <span>L<sub>D</sub></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 6px" }}>
            <span style={{ width: "10px", height: "10px", backgroundColor: "color-mix(in srgb, var(--yellow) 25%, transparent)", border: "1px solid var(--yellow)" }} />
            <span>95% CI</span>
          </div>
        </div>
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
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--surface2)", paddingBottom: "3px", marginBottom: "3px" }}>
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
      <div className="chart-header">
        <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: "8px" }}>
          {plotTitle}
          {curveSeriesList.length > 1 && (
            <span style={{ fontSize: "0.65rem", padding: "2px 6px", backgroundColor: "var(--surface1)", borderRadius: "6px", color: "var(--subtext0)", fontWeight: "normal" }}>
              {curveSeriesList.length} curves overlaid
            </span>
          )}
        </h2>
        
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
              fontSize: "0.65rem",
              fontWeight: "bold",
              lineHeight: "1.2",
              backgroundColor: "var(--surface0)",
              border: "1px solid var(--surface1)",
              color: "var(--text)",
              cursor: "pointer",
              transition: "all 0.15s ease-in-out",
              userSelect: "none"
            }}
          >
            <span>CSV</span>
            <span style={{ fontSize: "0.8rem", marginTop: "2px", lineHeight: "1" }}>↓</span>
          </button>
          
          <button 
            className="action-btn" 
            onClick={handleDownloadPlot} 
            title="Download Multi-Curve Plot (300 DPI, PNG)"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "44px",
              height: "44px",
              padding: "4px",
              borderRadius: "8px",
              fontSize: "0.65rem",
              fontWeight: "bold",
              lineHeight: "1.2",
              backgroundColor: "var(--surface0)",
              border: "1px solid var(--surface1)",
              color: "var(--text)",
              cursor: "pointer",
              transition: "all 0.15s ease-in-out",
              userSelect: "none"
            }}
          >
            <span>PNG</span>
            <span style={{ fontSize: "0.8rem", marginTop: "2px", lineHeight: "1" }}>↓</span>
          </button>
        </div>
      </div>
      
      <div className="chart-frame" ref={chartRef} style={{ position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 20, right: 25, left: 15, bottom: 35 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--surface0)" vertical={false} horizontalValues={yMajorTicks} />
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
            <Legend verticalAlign="top" content={<CustomLegend />} />
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
                <Area data={activeSeries.leftChartData} dataKey="ciRange" stroke="none" fill={activeSeries.color} fillOpacity={0.12} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: "none" }} />
                <Area data={activeSeries.rightChartData} dataKey="ciRange" stroke="none" fill={activeSeries.color} fillOpacity={0.12} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: "none" }} />
                <ReferenceArea x1={activeSeries.results.lodCI.low} x2={activeSeries.results.lodCI.high} fill="var(--yellow)" fillOpacity={0.12} strokeOpacity={0} ifOverflow="hidden" style={{ pointerEvents: "none" }} />

                <Line data={activeSeries.lcLeftData} dataKey="y" stroke="var(--peach)" strokeOpacity={0.65} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: "none" }} />
                <Line data={activeSeries.lcRightData} dataKey="y" stroke="var(--peach)" strokeOpacity={0.65} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: "none" }} />
                <ReferenceLine y={activeSeries.results.lc} stroke="none" label={<CustomLcLabel />} style={{ pointerEvents: "none" }} />
                
                <Line data={activeSeries.ldLeftData} dataKey="y" stroke="var(--green)" strokeOpacity={0.65} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: "none" }} />
                <Line data={activeSeries.ldRightData} dataKey="y" stroke="var(--green)" strokeOpacity={0.65} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: "none" }} />
                <ReferenceLine y={activeSeries.results.ld} stroke="none" label={<CustomLdLabel />} style={{ pointerEvents: "none" }} />
              </>
            )}

            {/* Render Curves for Every Visible Series */}
            {curveSeriesList.map(s => {
              const isDimmed = hoveredSeriesId !== null && hoveredSeriesId !== s.id;
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
                    stroke={s.color} 
                    strokeWidth={s.isActive ? 2 : 1.5} 
                    strokeDasharray="3 3" 
                    strokeOpacity={isDimmed ? 0.2 : 0.85}
                    label={s.isActive || curveSeriesList.length === 1 ? { 
                      position: "top", 
                      value: curveSeriesList.length > 1 ? `LOD (${s.name})` : "LOD", 
                      fill: s.color, 
                      fontSize: 9 
                    } : undefined} 
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
        
        {hoveredPoint && hoveredPoint.cx && hoveredPoint.cy && (
          <div style={{
            position: "absolute",
            left: hoveredPoint.cx + 15,
            top: hoveredPoint.cy - 15,
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
        )}
      </div>
    </div>
  );
};
