import React, { useState, useMemo, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { calculateAdvancedLoD, type StandardData, type AdvancedLoDResult } from './utils/calculations';
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
  Legend
} from 'recharts';
import './App.css';

interface StandardRow {
  id: string;
  conc: string;
  signals: string;
}

const DEFAULT_STANDARDS: StandardRow[] = [
  { id: '1', conc: '0.001', signals: '0.08, 0.15, 0.09' },
  { id: '2', conc: '0.003', signals: '0.10, 0.18, 0.11' },
  { id: '3', conc: '0.01', signals: '0.14, 0.10, 0.19' },
  { id: '4', conc: '0.03', signals: '0.20, 0.32, 0.23' },
  { id: '5', conc: '0.1', signals: '0.45, 0.65, 0.52' },
  { id: '6', conc: '0.3', signals: '1.05, 1.45, 1.20' },
  { id: '7', conc: '1', signals: '2.30, 2.80, 2.45' },
  { id: '8', conc: '3', signals: '3.50, 4.00, 3.65' },
  { id: '9', conc: '10', signals: '4.30, 4.75, 4.45' },
  { id: '10', conc: '30', signals: '4.65, 5.05, 4.75' },
  { id: '11', conc: '100', signals: '4.80, 5.20, 4.85' },
  { id: '12', conc: '300', signals: '4.85, 5.25, 4.90' },
];

const DEFAULT_BLANKS = '0.07, 0.13, 0.08';

const formatSuperscript = (val: number): ReactNode => {
  if (val === 0 || isNaN(val)) return '0';
  const exponent = Math.floor(Math.log10(Math.abs(val)));
  const base = (val / Math.pow(10, exponent)).toFixed(2);
  if (parseFloat(base) === 1) {
    return <span>10<sup>{exponent}</sup></span>;
  }
  return <span>{base} × 10<sup>{exponent}</sup></span>;
};

const CustomXAxisTick = ({ x, y, payload }: any) => {
  if (payload.value === 0 || isNaN(payload.value)) {
    return (
      <g>
        <line x1={x} y1={y} x2={x} y2={y + 6} stroke="var(--text)" />
        <text x={x} y={y + 18} fill="var(--overlay2)" textAnchor="middle" fontSize={10}>0</text>
      </g>
    );
  }
  const val = payload.value;
  const rawExponent = Math.log10(Math.abs(val));
  const isMajor = Math.abs(rawExponent - Math.round(rawExponent)) < 0.0001;
  
  if (!isMajor) {
    return (
      <g>
        <line x1={x} y1={y} x2={x} y2={y + 4} stroke="var(--text)" opacity={0.5} />
      </g>
    );
  }

  const exponent = Math.round(rawExponent);

  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y + 6} stroke="var(--text)" />
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
  const { cx, cy, payload, setHoveredPoint } = props;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="var(--red)"
      onMouseEnter={() => {
        if (setHoveredPoint) setHoveredPoint({ id: payload.id, y: payload.y, cx, cy, conc: payload.actualX });
      }}
      onMouseLeave={() => {
        if (setHoveredPoint) setHoveredPoint(null);
      }}
      style={{ cursor: 'pointer', transition: 'all 0.2s', pointerEvents: 'all' }}
    />
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

function App() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('app-theme') as 'dark' | 'light') || 'dark';
  });
  const [blankSignals, setBlankSignals] = useState(DEFAULT_BLANKS);
  const [standardRows, setStandardRows] = useState<StandardRow[]>(DEFAULT_STANDARDS);
  const [fitMethod, setFitMethod] = useState<'linear' | 'langmuir' | '4pl' | '5pl' | 'auto'>('auto');
  const [plotTitle, setPlotTitle] = useState('Concentration-Response Fitting');
  const [xAxisLabel, setXAxisLabel] = useState('Concentration (mM)');
  const [yAxisLabel, setYAxisLabel] = useState('Signal Intensity');
  const [hoveredPoint, setHoveredPoint] = useState<{ id: string, y: number, cx: number, cy: number, conc: number | string } | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

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

  const results = useMemo((): AdvancedLoDResult | null => {
    try {
      const blanks = blankSignals.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
      const standards: StandardData[] = [];
      standardRows.forEach(row => {
        const c = parseFloat(row.conc);
        if (isNaN(c)) return;
        row.signals.split(',').forEach(s => {
          const val = parseFloat(s.trim());
          if (!isNaN(val)) standards.push({ concentration: c, readout: val });
        });
      });
      if (blanks.length < 2 || standards.length < 3) return null;
      return calculateAdvancedLoD(blanks, standards, fitMethod);
    } catch (e) { return null; }
  }, [blankSignals, standardRows, fitMethod]);

  const { xTicks, xDomain } = useMemo((): { xTicks: number[], xDomain: [number | 'auto', number | 'auto'] } => {
    if (!results) return { xTicks: [], xDomain: ['auto', 'auto'] };
    const minX = Math.min(...results.fit.actualX.filter(x => x > 0));
    const maxX = Math.max(...results.fit.actualX);
    const zeroX = minX / 10;
    const maxAxisValue = maxX * 1.5;
    const logMin = Math.floor(Math.log10(zeroX));
    const logMax = Math.ceil(Math.log10(maxAxisValue));
    const ticks = [];
    for (let i = logMin; i <= logMax; i++) {
      const majorVal = Math.pow(10, i);
      if (majorVal <= maxAxisValue && majorVal >= zeroX) ticks.push(majorVal);
      if (i < logMax) {
        for (let j = 2; j <= 9; j++) {
          const minorVal = j * Math.pow(10, i);
          if (minorVal <= maxAxisValue && minorVal >= zeroX) ticks.push(minorVal);
        }
      }
    }
    return { xTicks: ticks, xDomain: [zeroX, maxAxisValue] };
  }, [results]);

  const chartData = useMemo(() => {
    if (!results) return [];
    const minX = Math.min(...results.fit.actualX.filter(x => x > 0));
    const maxX = Math.max(...results.fit.actualX);
    const zeroX = minX / 10;
    const data = [];
    const logMin = Math.log10(zeroX);
    const logMax = Math.log10(maxX * 1.5);
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const xVal = Math.pow(10, logMin + i * (logMax - logMin) / steps);
      const fitX = xVal < minX * 0.5 ? 0 : xVal;
      const pred = results.fit.predict(fitX);
      const { low, high } = results.fit.getCI(fitX);
      data.push({ x: xVal, trend: pred, ciRange: [low, high] });
    }
    return data;
  }, [results]);

  const scatterData = useMemo(() => {
    if (!results) return [];
    const minX = Math.min(...results.fit.actualX.filter(x => x > 0));
    const zeroX = minX / 10;
    
    const points: {x: number, y: number, id: string, actualX: number | string, isScatterData: boolean}[] = [];

    const blanks = blankSignals.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    blanks.forEach(y => points.push({ x: zeroX, y, id: 'blank', actualX: '0', isScatterData: true }));

    standardRows.forEach(row => {
      const c = parseFloat(row.conc);
      if (isNaN(c)) return;
      row.signals.split(',').forEach(s => {
        const val = parseFloat(s.trim());
        if (!isNaN(val)) points.push({ x: c === 0 ? zeroX : c, y: val, id: row.id, actualX: c, isScatterData: true });
      });
    });
    
    return points;
  }, [results, blankSignals, standardRows]);

  const { yDomain, yTicks, yMajorTicks } = useMemo((): { yDomain: [number | 'auto', number | 'auto'], yTicks: number[] | undefined, yMajorTicks: number[] } => {
    if (!results) return { yDomain: [0, 'auto'], yTicks: undefined, yMajorTicks: [] };
    const maxData = Math.max(...results.fit.actualY, results.ld);
    const minData = Math.min(...results.fit.actualY, 0);
    const niceMax = Math.ceil(maxData * 1.1);
    const niceMin = Math.floor(minData);
    
    const majorTicks = [];
    const step = niceMax <= 5 ? 1 : Math.ceil(niceMax / 5);
    for (let i = niceMin; i <= niceMax; i += step) {
      majorTicks.push(i);
    }

    const allTicks = [];
    for (let i = niceMin; i <= niceMax; i++) {
      allTicks.push(i);
    }
    
    return { yDomain: [niceMin, niceMax], yTicks: allTicks, yMajorTicks: majorTicks };
  }, [results]);

  const updateRow = (id: string, field: 'conc' | 'signals', value: string) => {
    setStandardRows(standardRows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleClearData = () => {
    setBlankSignals('');
    setStandardRows([{ id: '1', conc: '', signals: '' }]);
  };

  const handleLoadDemo = () => {
    setBlankSignals(DEFAULT_BLANKS);
    setStandardRows(DEFAULT_STANDARDS);
  };

  const handleCopyMetrics = () => {
    if (!results) return;
    const text = `Bioassay Results\nLOD: ${results.lodConc.toExponential(3)}\nAICc: ${results.fit.metrics.aicc.toFixed(2)}\nR2: ${results.fit.metrics.r2.toFixed(5)}\nLC: ${results.lc.toFixed(4)}\nLD: ${results.ld.toFixed(4)}`;
    navigator.clipboard.writeText(text);
    alert('Metrics copied to clipboard!');
  };

  const renderScatterDot = useCallback((props: any) => {
    return <CustomScatterDot {...props} setHoveredPoint={setHoveredPoint} />;
  }, [setHoveredPoint]);

  return (
    <div className="app-wrapper">
      <header>
        <div className="header-content">
          <h1>Bioassay LOD Fitter v0.3.8</h1>
          <p className="header-description">Robust sigmoidal fitting with Clinical LoD validation.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="action-btn" onClick={toggleTheme}>{theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</button>
          <button className="action-btn" onClick={handleClearData}>Clear Data</button>
          <button className="action-btn" onClick={handleLoadDemo}>Load Demo</button>
        </div>
      </header>
      <main className="main-container">
        <aside className="sidebar">
          <section className="sidebar-section">
            <span className="section-title" style={{ color: 'var(--mauve)' }}>Model Options</span>
            <select value={fitMethod} onChange={e => setFitMethod(e.target.value as any)} className="method-select">
              <option value="auto">Automatic (AICc Optimised)</option>
              <option value="linear">Linear</option>
              <option value="langmuir">Langmuir</option>
              <option value="4pl">4-Parameter Logistic (4PL)</option>
              <option value="5pl">5-Parameter Logistic (5PL)</option>
            </select>
          </section>
          <section className="sidebar-section">
            <span className="section-title" style={{ color: 'var(--sapphire)' }}>Plot Settings</span>
            <div className="input-group"><input type="text" className="text-input" placeholder="Title" value={plotTitle} onChange={e => setPlotTitle(e.target.value)} /></div>
            <div style={{display: 'flex', gap: '8px'}}>
              <input type="text" className="text-input" placeholder="X Axis" value={xAxisLabel} onChange={e => setXAxisLabel(e.target.value)} />
              <input type="text" className="text-input" placeholder="Y Axis" value={yAxisLabel} onChange={e => setYAxisLabel(e.target.value)} />
            </div>
          </section>
          <section className="sidebar-section">
            <span className="section-title" style={{ color: 'var(--peach)' }}>Blanks</span>
            <div className="data-row">
              <div className="conc-input disabled" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: hoveredPoint?.id === 'blank' ? 'var(--pink)' : 'var(--overlay0)' }}>0</div>
              <div style={{ position: 'relative', flex: 1 }}>
                <input type="text" className="signals-input" placeholder="Comma separated..." value={blankSignals} onChange={e => setBlankSignals(e.target.value)} style={{ width: '100%', color: hoveredPoint?.id === 'blank' ? 'transparent' : 'var(--text)' }} />
                {hoveredPoint?.id === 'blank' && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: '6px 8px', border: '1px solid transparent', pointerEvents: 'none', fontFamily: '"Google Sans Mono", monospace', fontSize: '0.8rem', whiteSpace: 'pre', overflow: 'hidden' }}>
                    {blankSignals.split(/(,)/).map((part, i) => {
                      if (part === ',') return <span key={i} style={{ color: 'var(--text)' }}>,</span>;
                      const isTarget = !isNaN(parseFloat(part)) && Math.abs(parseFloat(part.trim()) - hoveredPoint.y) < 1e-8;
                      return <span key={i} style={{ color: isTarget ? 'var(--pink)' : 'var(--text)', fontWeight: isTarget ? 'bold' : 'normal' }}>{part}</span>;
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
          <section className="sidebar-section">
            <span className="section-title" style={{ color: 'var(--green)' }}>Standards</span>
            <div className="rows-container">
              {standardRows.map((r) => (
                <div key={r.id} className="data-row">
                  <div style={{ position: 'relative' }}>
                    <input type="text" className="conc-input" placeholder="Conc" value={r.conc} onChange={e => updateRow(r.id, 'conc', e.target.value)} style={{ color: hoveredPoint?.id === r.id ? 'var(--pink)' : 'var(--text)', fontWeight: hoveredPoint?.id === r.id ? 'bold' : 'normal' }} />
                  </div>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input type="text" className="signals-input" placeholder="Signals..." value={r.signals} onChange={e => updateRow(r.id, 'signals', e.target.value)} style={{ width: '100%', color: hoveredPoint?.id === r.id ? 'transparent' : 'var(--text)' }} />
                    {hoveredPoint?.id === r.id && (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: '6px 8px', border: '1px solid transparent', pointerEvents: 'none', fontFamily: '"Google Sans Mono", monospace', fontSize: '0.8rem', whiteSpace: 'pre', overflow: 'hidden' }}>
                        {r.signals.split(/(,)/).map((part, i) => {
                          if (part === ',') return <span key={i} style={{ color: 'var(--text)' }}>,</span>;
                          const isTarget = !isNaN(parseFloat(part)) && Math.abs(parseFloat(part.trim()) - hoveredPoint.y) < 1e-8;
                          return <span key={i} style={{ color: isTarget ? 'var(--pink)' : 'var(--text)', fontWeight: isTarget ? 'bold' : 'normal' }}>{part}</span>;
                        })}
                      </div>
                    )}
                  </div>
                  <button className="remove-row-btn" onClick={() => setStandardRows(standardRows.filter(sr => sr.id !== r.id))}>×</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="add-row-btn" style={{ flex: 1 }} onClick={() => setStandardRows([...standardRows, { id: Math.random().toString(36), conc: '', signals: '' }])}>+ Add Point</button>
              {standardRows.length > 1 && (
                <button className="remove-last-btn" style={{ flex: 1 }} onClick={() => setStandardRows(standardRows.slice(0, -1))}>- Remove Last</button>
              )}
            </div>
          </section>
        </aside>
        <section className="content-area">
          {results ? (
            <div className="dashboard-grid">
              <div className="chart-card">
                <div className="chart-header">
                  <h2>{plotTitle}</h2>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="method-badge">{results.fit.method.toUpperCase()} FIT</span>
                    {results.comparison.betterMethod !== results.fit.method && results.fit.method !== 'auto' && (
                      <span className="warning-badge">Better fit available ({results.comparison.betterMethod.toUpperCase()})</span>
                    )}
                    <button className="action-btn" onClick={handleDownloadPlot} title="Download Plot (300 DPI, PNG)">Export PNG</button>
                  </div>
                </div>
                <div className="chart-frame" ref={chartRef} style={{ position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 25, right: 30, left: 20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--surface0)" vertical={false} horizontalValues={yMajorTicks} />
                      <XAxis 
                        dataKey="x" type="number" scale="log" domain={xDomain} allowDataOverflow={true} stroke="var(--text)" 
                        ticks={xTicks}
                        interval={0}
                        tickMargin={0}
                        tickLine={false}
                        tick={<CustomXAxisTick />}
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
                      
                      {yTicks && yTicks.filter(t => !yMajorTicks.includes(t)).map(tick => (
                        <ReferenceLine 
                          key={`minor-y-${tick}`} 
                          y={tick} 
                          stroke="none" 
                          label={<CustomMinorYAxisTickLabel />} 
                        />
                      ))}

                      <Area dataKey="ciRange" stroke="none" fill="var(--blue)" fillOpacity={0.15} isAnimationActive={false} legendType="none" />
                      <ReferenceArea x1={results.lodCI.low} x2={results.lodCI.high} fill="var(--yellow)" fillOpacity={0.15} strokeOpacity={0} ifOverflow="hidden" />
                      
                      <Line dataKey="trend" stroke="var(--blue)" strokeWidth={3} dot={false} isAnimationActive={false} legendType="none" />
                      <Scatter 
                        data={scatterData} 
                        dataKey="y" 
                        isAnimationActive={false} 
                        legendType="none"
                        shape={renderScatterDot}
                      />
                      
                      <ReferenceLine y={results.lc} stroke="#fab387" strokeDasharray="4 4" label={<CustomLcLabel />} />
                      <ReferenceLine y={results.ld} stroke="#a6e3a1" strokeDasharray="4 4" label={<CustomLdLabel />} />
                      <ReferenceLine x={results.lodConc} stroke="var(--yellow)" strokeWidth={2} label={{ position: 'top', value: 'LOD', fill: 'var(--yellow)', fontSize: 10 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                  {hoveredPoint && hoveredPoint.cx && hoveredPoint.cy && (
                    <div style={{
                      position: 'absolute',
                      left: hoveredPoint.cx + 15,
                      top: hoveredPoint.cy - 15,
                      backgroundColor: '#181825',
                      borderColor: 'var(--surface0)',
                      borderRadius: '8px',
                      padding: '10px',
                      fontSize: '12px',
                      border: '1px solid var(--surface0)',
                      color: 'var(--text)',
                      pointerEvents: 'none',
                      zIndex: 100,
                      boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                    }}>
                      <p style={{ margin: '0 0 5px 0', color: 'var(--pink)', fontWeight: 'bold' }}>Measured Data Point</p>
                      <p style={{ margin: '0' }}>Concentration: {hoveredPoint.conc}</p>
                      <p style={{ margin: '0' }}>Signal: {hoveredPoint.y.toFixed(4)}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="results-side-panel">
                <div className="lod-hero-card">
                  <label>Validated LOD</label>
                  <div className="lod-hero-value">{formatSuperscript(results.lodConc)}</div>
                  <span className="lod-hero-unit">{xAxisLabel.split('(')[0].trim()}</span>
                </div>
                <div className="stats-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, color: 'var(--blue)' }}>Curve Fitting</h3>
                    <button className="action-btn" onClick={handleCopyMetrics} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>Copy</button>
                  </div>
                  <div className="stat-row"><span className="stat-label-wrap" data-tooltip="Akaike Information Criterion (corrected). Evaluates the relative quality of statistical models for a given set of data, penalising for complexity to prevent overfitting. Lower scores indicate a superior balance of model fit and simplicity."><span className="stat-label">AICc Score</span></span><span className="stat-value">{results.fit.metrics.aicc.toFixed(2)}</span></div>
                  <div className="stat-row"><span className="stat-label-wrap" data-tooltip="Coefficient of determination. Represents the proportion of the variance in the dependent variable that is predictable from the independent variable. Closer to 1.0 indicates a stronger fit."><span className="stat-label">R² (Fit)</span></span><span className="stat-value">{results.fit.metrics.r2.toFixed(5)}</span></div>
                  <div className="stat-row"><span className="stat-label-wrap" data-tooltip="The lower asymptote of the sigmoidal curve, representing the theoretical background signal at an analyte concentration of zero."><span className="stat-label">Bottom (a)</span></span><span className="stat-value">{results.fit.parameters['Bottom (a)']?.toFixed(4) || 'N/A'}</span></div>
                  <div className="stat-row"><span className="stat-label-wrap" data-tooltip="The Hill coefficient characterizing the steepness of the sigmoidal curve at the inflection point."><span className="stat-label">Hill Slope (b)</span></span><span className="stat-value">{results.fit.parameters['Hill Slope (b)']?.toFixed(4) || 'N/A'}</span></div>
                  <div className="stat-row"><span className="stat-label-wrap" data-tooltip="The concentration corresponding to a response halfway between the lower and upper asymptotes."><span className="stat-label">EC50 (c)</span></span><span className="stat-value">{results.fit.parameters['EC50 (c)']?.toFixed(4) || 'N/A'}</span></div>
                  <div className="stat-row"><span className="stat-label-wrap" data-tooltip="The upper asymptote of the sigmoidal curve, representing the maximum theoretical response (saturation) of the assay."><span className="stat-label">Top (d)</span></span><span className="stat-value">{results.fit.parameters['Top (d)']?.toFixed(4) || 'N/A'}</span></div>
                  {results.fit.parameters['Asymmetry (g)'] !== undefined && (
                    <div className="stat-row"><span className="stat-label-wrap" data-tooltip="An asymmetry parameter in the 5PL model that allows the curve to approach the upper and lower asymptotes at different rates."><span className="stat-label">Asymmetry (g)</span></span><span className="stat-value">{results.fit.parameters['Asymmetry (g)'].toFixed(4)}</span></div>
                  )}
                </div>
                <div className="stats-card">
                  <h3 style={{ color: 'var(--red)' }}>Assay Parameters</h3>
                  <div className="stat-row"><span className="stat-label-wrap" data-tooltip="The arithmetic mean of the measured signal responses for the zero-concentration blank replicates."><span className="stat-label">Blank Mean</span></span><span className="stat-value">{results.meanBlank.toFixed(4)}</span></div>
                  <div className="stat-row"><span className="stat-label-wrap" data-tooltip="The sample standard deviation of the measured signal responses for the zero-concentration blank replicates."><span className="stat-label">Blank SD</span></span><span className="stat-value">{results.sdBlank.toFixed(4)}</span></div>
                  <div className="stat-row"><span className="stat-label-wrap" data-tooltip="A weighted average of the standard deviations from the non-zero standard replicates, providing a more robust estimate of assay variance in the low-concentration regime."><span className="stat-label">Pooled SD</span></span><span className="stat-value">{results.sdPooled.toFixed(4)}</span></div>
                  <div className="stat-row"><span className="stat-label-wrap" data-tooltip="The Decision Limit (LC) is the signal threshold above which an observed response is statistically considered to be distinct from background noise (guarding against false positives, α=0.05)."><span className="stat-label">L<sub>C</sub></span></span><span className="stat-value" style={{color: '#fab387'}}>{results.lc.toFixed(4)}</span></div>
                  <div className="stat-row"><span className="stat-label-wrap" data-tooltip="The Detection Limit Signal (LD) is the true signal level at which there is a 95% probability that the measured signal will fall above LC (guarding against false negatives, β=0.05)."><span className="stat-label">L<sub>D</sub></span></span><span className="stat-value" style={{color: '#a6e3a1'}}>{results.ld.toFixed(4)}</span></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-prompt"><p>Loading Bioassay LOD Fitter v0.3.5...</p></div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
p;
ssName="stat-label">Asymmetry (g)</span></span><span className="stat-value">{results.fit.parameters['Asymmetry (g)'].toFixed(4)}</span></div>
                  )}
                </div>
                <div className="stats-card">
                  <h3 style={{ color: 'var(--red)' }}>Assay Parameters</h3>
                  <div className="stat-row"><span className="stat-label-wrap" data-tooltip="The arithmetic mean of the measured signal responses for the zero-concentration blank replicates."><span className="stat-label">Blank Mean</span></span><span className="stat-value">{results.meanBlank.toFixed(4)}</span></div>
                  <div className="stat-row"><span className="stat-label-wrap" data-tooltip="The sample standard deviation of the measured signal responses for the zero-concentration blank replicates."><span className="stat-label">Blank SD</span></span><span className="stat-value">{results.sdBlank.toFixed(4)}</span></div>
                  <div className="stat-row"><span className="stat-label-wrap" data-tooltip="A weighted average of the standard deviations from the non-zero standard replicates, providing a more robust estimate of assay variance in the low-concentration regime."><span className="stat-label">Pooled SD</span></span><span className="stat-value">{results.sdPooled.toFixed(4)}</span></div>
                  <div className="stat-row"><span className="stat-label-wrap" data-tooltip="The Decision Limit (LC) is the signal threshold above which an observed response is statistically considered to be distinct from background noise (guarding against false positives, α=0.05)."><span className="stat-label">L<sub>C</sub></span></span><span className="stat-value" style={{color: '#fab387'}}>{results.lc.toFixed(4)}</span></div>
                  <div className="stat-row"><span className="stat-label-wrap" data-tooltip="The Detection Limit Signal (LD) is the true signal level at which there is a 95% probability that the measured signal will fall above LC (guarding against false negatives, β=0.05)."><span className="stat-label">L<sub>D</sub></span></span><span className="stat-value" style={{color: '#a6e3a1'}}>{results.ld.toFixed(4)}</span></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-prompt"><p>Loading Bioassay LOD Fitter v0.3.5...</p></div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
p;
