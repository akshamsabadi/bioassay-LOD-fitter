import React, { useRef, useCallback } from 'react';
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
} from 'recharts';
import { type AdvancedLoDResult } from '../utils/calculations';

const CustomXAxisTick = ({ x, y, payload, zeroX, breakStart, breakEnd }: any) => {
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

const CustomYAxisTick = ({ x, y, payload }: any) => {
  const val = payload.value;
  return (
    <g>
      <line x1={x} y1={y} x2={x - 6} y2={y} stroke="var(--text)" />
      <text x={x - 10} y={y + 3} fill="var(--overlay2)" textAnchor="end" fontSize={10}>
        {parseFloat(val.toFixed(2)).toString()}
      </text>
    </g>
  );
};

const CustomLcLabel = ({ viewBox }: any) => {
  return (
    <text x={viewBox.x + viewBox.width + 5} y={viewBox.y + 4} fill="var(--peach)" fontSize={10}>
      L<tspan dy="0.3em" fontSize={7.5}>C</tspan>
    </text>
  );
};

const CustomLdLabel = ({ viewBox }: any) => {
  return (
    <text x={viewBox.x + viewBox.width + 5} y={viewBox.y + 4} fill="var(--green)" fontSize={10}>
      L<tspan dy="0.3em" fontSize={7.5}>D</tspan>
    </text>
  );
};

const CustomMinorYAxisTickLabel = ({ viewBox }: any) => {
  if (!viewBox) return null;
  return <line x1={viewBox.x} y1={viewBox.y} x2={viewBox.x - 4} y2={viewBox.y} stroke="var(--text)" opacity={0.5} />;
};

const CustomScatterDot = (props: any) => {
  const { cx, cy, payload, setHoveredPoint, tableHoveredRowId, hoveredPointId } = props;
  const isSelected = payload.id === tableHoveredRowId || payload.id === hoveredPointId;
  
  return (
    <g>
      {isSelected && (
        <circle
          cx={cx}
          cy={cy}
          r={9}
          fill="none"
          stroke="var(--pink)"
          strokeWidth={1.5}
          className="pulsing-halo"
          style={{ pointerEvents: 'none' }}
        />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={isSelected ? 6 : 4}
        fill={isSelected ? 'var(--pink)' : 'var(--red)'}
        onMouseEnter={() => {
          if (setHoveredPoint) setHoveredPoint({ id: payload.id, y: payload.y, cx, cy, conc: payload.actualX });
        }}
        onMouseLeave={() => {
          if (setHoveredPoint) setHoveredPoint(null);
        }}
        style={{ cursor: 'pointer', transition: 'all 0.2s', pointerEvents: 'all' }}
      />
    </g>
  );
};

const CustomLegend = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', position: 'absolute', top: '16px', left: '80px', backgroundColor: 'var(--mantle)', padding: '12px', borderRadius: '8px', border: '1px solid var(--surface0)', zIndex: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '14px', display: 'flex', justifyContent: 'center' }}><span style={{ width: '14px', height: '2px', backgroundColor: 'var(--yellow)' }}></span></span> <span>LOD</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '14px', display: 'flex', justifyContent: 'center' }}><span style={{ width: '10px', height: '10px', backgroundColor: 'color-mix(in srgb, var(--yellow) 25%, transparent)', border: '1px solid var(--yellow)' }}></span></span> <span>95% CI LOD</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '14px', display: 'flex', justifyContent: 'center' }}><span style={{ width: '14px', height: '0', borderTop: '2px dashed var(--peach)' }}></span></span> <span>L<sub>C</sub></span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '14px', display: 'flex', justifyContent: 'center' }}><span style={{ width: '14px', height: '0', borderTop: '2px dashed var(--green)' }}></span></span> <span>L<sub>D</sub></span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '14px', display: 'flex', justifyContent: 'center' }}><span style={{ width: '14px', height: '2px', backgroundColor: 'var(--blue)' }}></span></span> <span>Model Fit</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '14px', display: 'flex', justifyContent: 'center' }}><span style={{ width: '10px', height: '10px', backgroundColor: 'color-mix(in srgb, var(--blue) 25%, transparent)', border: '1px solid var(--blue)' }}></span></span> <span>95% CI Fit</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '14px', display: 'flex', justifyContent: 'center', color: 'var(--red)', fontSize: '14px', lineHeight: '10px' }}>●</span> <span>Measured Data</span></div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, results }: any) => {
  if (!active || !payload || !payload.length || !results) return null;

  const x = payload[0].payload.x;
  if (x === undefined || isNaN(x)) return null;

  const pred = results.fit.predict(x);
  const ci = results.fit.getCI(x);

  const replicates = results.fit.actualY.filter((_: number, i: number) => {
    const ptX = results.fit.actualX[i];
    if (x === 0 || Math.abs(x - results.fit.actualX.filter((val: number) => val > 0)[0] / 10) < 1e-9) {
      return ptX === 0;
    }
    return Math.abs(ptX - x) < 1e-9;
  });

  return (
    <div className="custom-chart-tooltip" style={{
      backgroundColor: 'var(--mantle)',
      border: '1px solid var(--mauve)',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '0.8rem',
      color: 'var(--text)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      pointerEvents: 'none',
      zIndex: 1000,
      minWidth: '240px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--surface2)', paddingBottom: '4px', marginBottom: '4px' }}>
        <span style={{ color: 'var(--overlay2)', fontWeight: 'bold', fontSize: '0.7rem', letterSpacing: '0.5px' }}>CONCENTRATION</span>
        <span style={{ fontWeight: 'bold', fontFamily: '"Google Sans Mono", monospace' }}>
          {x === 0 || Math.abs(x - results.fit.actualX.filter((val: number) => val > 0)[0] / 10) < 1e-9 ? '0 (Blank)' : x.toFixed(4)}
        </span>
      </div>
      
      {replicates.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--subtext0)' }}>Replicates:</span>
          <span style={{ fontWeight: 'bold', color: 'var(--pink)', fontFamily: '"Google Sans Mono", monospace' }}>
            {replicates.map((val: number) => val.toFixed(3)).join(', ')}
          </span>
        </div>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--subtext0)' }}>Model Fit (Trend):</span>
        <span style={{ fontWeight: 'bold', color: 'var(--blue)' }}>{pred.toFixed(4)}</span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--subtext0)' }}>95% Confidence:</span>
        <span style={{ fontWeight: 'bold', color: 'var(--lavender)', fontSize: '0.75rem' }}>
          [{ci.low.toFixed(3)}, {ci.high.toFixed(3)}]
        </span>
      </div>
    </div>
  );
};

interface ChartCardProps {
  plotTitle: string;
  results: AdvancedLoDResult;
  xAxisLabel: string;
  yAxisLabel: string;
  breakStart: number;
  breakEnd: number;
  xTicks: number[];
  xDomain: [number, number];
  yDomain: [number, number];
  yTicks: number[] | undefined;
  yMajorTicks: number[];
  leftChartData: any[];
  rightChartData: any[];
  lcLeftData: any[];
  lcRightData: any[];
  ldLeftData: any[];
  ldRightData: any[];
  scatterData: any[];
  leftAxisData: any[];
  rightAxisData: any[];
  hoveredPoint: { id: string; y: number; cx: number; cy: number; conc: number | string } | null;
  setHoveredPoint: (pt: { id: string; y: number; cx: number; cy: number; conc: number | string } | null) => void;
  tableHoveredRowId: string | null;
  handleExportCSV: () => void;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  plotTitle,
  results,
  xAxisLabel,
  yAxisLabel,
  breakStart,
  breakEnd,
  xTicks,
  xDomain,
  yDomain,
  yTicks,
  yMajorTicks,
  leftChartData,
  rightChartData,
  lcLeftData,
  lcRightData,
  ldLeftData,
  ldRightData,
  scatterData,
  leftAxisData,
  rightAxisData,
  hoveredPoint,
  setHoveredPoint,
  tableHoveredRowId,
  handleExportCSV,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleDownloadPlot = () => {
    if (!chartRef.current) return;
    const svgElement = chartRef.current.querySelector('svg');
    if (!svgElement) return;

    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    clone.style.backgroundColor = 'transparent';

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clone);

    const docStyle = getComputedStyle(document.documentElement);
    const varNames = [
      '--rosewater', '--flamingo', '--pink', '--mauve', '--red', '--maroon', 
      '--peach', '--yellow', '--green', '--teal', '--sky', '--sapphire', 
      '--blue', '--lavender', '--text', '--subtext1', '--subtext0', 
      '--overlay2', '--overlay1', '--overlay0', '--surface2', '--surface1', 
      '--surface0', '--base', '--mantle', '--crust'
    ];
    
    for (const v of varNames) {
      const c = docStyle.getPropertyValue(v).trim();
      if (c) {
        svgString = svgString.split(`var(${v})`).join(c);
      }
    }

    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const DOMURL = window.URL || window.webkitURL || window;
    const url = DOMURL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 300 / 96;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = 'bioassay_plot.png';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
      DOMURL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const renderScatterDot = useCallback((props: any) => {
    return (
      <CustomScatterDot 
        {...props} 
        setHoveredPoint={setHoveredPoint} 
        tableHoveredRowId={tableHoveredRowId} 
        hoveredPointId={hoveredPoint?.id} 
      />
    );
  }, [setHoveredPoint, tableHoveredRowId, hoveredPoint?.id]);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h2>{plotTitle}</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="method-badge">{results.fit.method.toUpperCase()} FIT</span>
          {results.comparison.betterMethod !== results.fit.method && results.fit.method !== 'auto' && (
            <span className="warning-badge">Better fit available ({results.comparison.betterMethod.toUpperCase()})</span>
          )}
          <button className="action-btn" onClick={handleExportCSV} title="Export raw data and analysis results as CSV">Export CSV</button>
          <button className="action-btn" onClick={handleDownloadPlot} title="Download Plot (300 DPI, PNG)">Export PNG</button>
        </div>
      </div>
      
      <div className="chart-frame" ref={chartRef} style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 25, right: 30, left: 20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--surface0)" vertical={false} horizontalValues={yMajorTicks} />
            <ReferenceArea x1={breakStart} x2={breakEnd} y1={yDomain[0]} y2={yDomain[1]} fill="var(--mantle)" fillOpacity={1} strokeOpacity={0} style={{ pointerEvents: 'none' }} />
            <XAxis 
              dataKey="x" type="number" scale="log" domain={xDomain} allowDataOverflow={true} stroke="var(--text)" 
              ticks={xTicks}
              interval={0}
              tickLine={false}
              axisLine={false}
              tick={<CustomXAxisTick zeroX={xDomain[0]} breakStart={breakStart} breakEnd={breakEnd} />}
              label={{ value: xAxisLabel, position: 'bottom', fill: 'var(--overlay2)', fontSize: 11, offset: 25 }}
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
              label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill: 'var(--overlay2)', fontSize: 11, offset: -5 }} 
            />
            <Legend verticalAlign="top" content={<CustomLegend />} />
            <Tooltip 
              content={<CustomTooltip results={results} />} 
              cursor={{ stroke: 'var(--overlay1)', strokeDasharray: '4 4', strokeWidth: 1.5 }} 
            />
            
            {yTicks && yTicks.filter(t => !yMajorTicks.includes(t)).map(tick => (
              <ReferenceLine 
                key={`minor-y-${tick}`} 
                y={tick} 
                stroke="none" 
                label={<CustomMinorYAxisTickLabel />} 
              />
            ))}

            <Area data={leftChartData} dataKey="ciRange" stroke="none" fill="var(--blue)" fillOpacity={0.15} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: 'none' }} />
            <Area data={rightChartData} dataKey="ciRange" stroke="none" fill="var(--blue)" fillOpacity={0.15} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: 'none' }} />
            <ReferenceArea x1={results.lodCI.low} x2={results.lodCI.high} fill="var(--yellow)" fillOpacity={0.15} strokeOpacity={0} ifOverflow="hidden" style={{ pointerEvents: 'none' }} />
            
            <Line data={leftChartData} dataKey="trend" stroke="var(--blue)" strokeWidth={3} dot={false} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: 'none' }} />
            <Line data={rightChartData} dataKey="trend" stroke="var(--blue)" strokeWidth={3} dot={false} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: 'none' }} />
            
            <Scatter 
              data={scatterData} 
              dataKey="y" 
              isAnimationActive={false} 
              legendType="none"
              shape={renderScatterDot}
            />
            
            <Line data={lcLeftData} dataKey="y" stroke="var(--peach)" strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: 'none' }} />
            <Line data={lcRightData} dataKey="y" stroke="var(--peach)" strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: 'none' }} />
            <ReferenceLine y={results.lc} stroke="none" label={<CustomLcLabel />} style={{ pointerEvents: 'none' }} />
            
            <Line data={ldLeftData} dataKey="y" stroke="var(--green)" strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: 'none' }} />
            <Line data={ldRightData} dataKey="y" stroke="var(--green)" strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: 'none' }} />
            <ReferenceLine y={results.ld} stroke="none" label={<CustomLdLabel />} style={{ pointerEvents: 'none' }} />
            
            <ReferenceLine x={results.lodConc} stroke="var(--yellow)" strokeWidth={2} label={{ position: 'top', value: 'LOD', fill: 'var(--yellow)', fontSize: 10 }} style={{ pointerEvents: 'none' }} />
            
            <Line data={leftAxisData} dataKey="y" stroke="var(--text)" strokeWidth={1} dot={false} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: 'none' }} />
            <Line data={rightAxisData} dataKey="y" stroke="var(--text)" strokeWidth={1} dot={false} activeDot={false} isAnimationActive={false} legendType="none" style={{ pointerEvents: 'none' }} />
          </ComposedChart>
        </ResponsiveContainer>
        
        {hoveredPoint && hoveredPoint.cx && hoveredPoint.cy && (
          <div style={{
            position: 'absolute',
            left: hoveredPoint.cx + 15,
            top: hoveredPoint.cy - 15,
            backgroundColor: 'var(--mantle)',
            border: '1px solid var(--pink)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '0.8rem',
            color: 'var(--text)',
            pointerEvents: 'none',
            zIndex: 100,
            boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
              <span style={{ color: 'var(--subtext0)' }}>Concentration</span>
              <span style={{ fontWeight: 'bold', color: 'var(--text)', fontFamily: '"Google Sans Mono", monospace' }}>{hoveredPoint.conc}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
              <span style={{ color: 'var(--subtext0)' }}>Signal</span>
              <span style={{ fontWeight: 'bold', color: 'var(--pink)', fontFamily: '"Google Sans Mono", monospace' }}>{hoveredPoint.y.toFixed(4)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
