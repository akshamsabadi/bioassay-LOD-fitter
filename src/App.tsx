import { useState, useMemo } from 'react';
import { calculateAdvancedLoD, type StandardData } from './utils/calculations';
import {
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend,
  ReferenceLine
} from 'recharts';
import './App.css';

interface ChartPoint {
  x: number;
  y?: number;
  trend?: number;
}

interface StandardRow {
  id: string;
  conc: string;
  signals: string;
}

const DEFAULT_BLANKS = '0.05, 0.06, 0.04, 0.05, 0.05';
const DEFAULT_STANDARDS: StandardRow[] = [
  { id: '1', conc: '0.001', signals: '0.12, 0.15, 0.10, 0.13, 0.11' },
  { id: '2', conc: '0.003', signals: '0.14, 0.17, 0.13, 0.15, 0.16' },
  { id: '3', conc: '0.01', signals: '0.18, 0.22, 0.19, 0.20, 0.21' },
  { id: '4', conc: '0.03', signals: '0.30, 0.35, 0.28, 0.32, 0.31' },
  { id: '5', conc: '0.1', signals: '0.58, 0.65, 0.55, 0.61, 0.59' },
  { id: '6', conc: '0.3', signals: '1.35, 1.48, 1.30, 1.40, 1.38' },
  { id: '7', conc: '1', signals: '3.10, 3.28, 3.05, 3.18, 3.12' },
  { id: '8', conc: '3', signals: '4.20, 4.35, 4.15, 4.28, 4.22' },
  { id: '9', conc: '10', signals: '4.62, 4.78, 4.55, 4.70, 4.65' },
  { id: '10', conc: '30', signals: '4.80, 4.92, 4.76, 4.85, 4.82' },
  { id: '11', conc: '100', signals: '4.88, 4.98, 4.84, 4.90, 4.86' },
  { id: '12', conc: '300', signals: '4.92, 5.02, 4.88, 4.95, 4.94' },
];

function App() {
  const [blankSignals, setBlankSignals] = useState(DEFAULT_BLANKS);
  const [standardRows, setStandardRows] = useState<StandardRow[]>(DEFAULT_STANDARDS);
  const [fitMethod, setFitMethod] = useState<'linear' | '4pl' | '5pl' | 'auto'>('auto');
  
  // Plot Customization State
  const [plotTitle, setPlotTitle] = useState('Dose-Response Fitting');
  const [xAxisLabel, setXAxisLabel] = useState('Concentration (M)');
  const [yAxisLabel, setYAxisLabel] = useState('Signal Intensity');
  const [showAnnotations, setShowAnnotations] = useState(true);

  const results = useMemo(() => {
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

  const chartData = useMemo(() => {
    if (!results) return { trend: [], actual: [] };
    const xValues = results.fit.actualX;
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const trendPoints: ChartPoint[] = [];
    const steps = 100;
    const logMin = Math.log10(minX || 0.0001);
    const logMax = Math.log10(maxX * 1.2);
    const stepSize = (logMax - logMin) / steps;
    for (let i = 0; i <= steps; i++) {
      const x = Math.pow(10, logMin + i * stepSize);
      trendPoints.push({ x, trend: results.fit.predict(x) });
    }
    const actualPoints: ChartPoint[] = xValues.map((vx: number, i: number) => ({
      x: vx, y: results.fit.actualY[i],
    }));
    return { trend: trendPoints, actual: actualPoints };
  }, [results]);

  const updateRow = (id: string, field: 'conc' | 'signals', value: string) => {
    setStandardRows(standardRows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  return (
    <div className="app-wrapper">
      <header>
        <div className="header-content">
          <h1>Bioassay Analytics Pro</h1>
          <p className="header-description">Clinical LoD fitting and high-precision sigmoidal regression suite.</p>
        </div>
      </header>

      <main className="main-container">
        <aside className="sidebar">
          <section className="sidebar-section">
            <span className="section-title">Analysis Config</span>
            <div className="input-group">
              <label className="input-label">Regression Model</label>
              <select value={fitMethod} onChange={(e) => setFitMethod(e.target.value as any)} className="method-select">
                <option value="auto">Automatic (Best AICc)</option>
                <option value="4pl">4-Parameter Logistic</option>
                <option value="5pl">5-Parameter Logistic</option>
                <option value="linear">Linear Regression</option>
              </select>
            </div>
          </section>

          <section className="sidebar-section">
            <span className="section-title">Plot Customization</span>
            <div className="input-group">
              <label className="input-label">Chart Title</label>
              <input type="text" className="text-input" value={plotTitle} onChange={e => setPlotTitle(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">X-Axis Label</label>
              <input type="text" className="text-input" value={xAxisLabel} onChange={e => setXAxisLabel(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Y-Axis Label</label>
              <input type="text" className="text-input" value={yAxisLabel} onChange={e => setYAxisLabel(e.target.value)} />
            </div>
            <div className="toggle-group">
              <input type="checkbox" checked={showAnnotations} onChange={e => setShowAnnotations(e.target.checked)} id="anno-toggle" />
              <label htmlFor="anno-toggle">Show Lc/Ld Annotations</label>
            </div>
          </section>

          <section className="sidebar-section">
            <span className="section-title">1. Blanks (Conc = 0)</span>
            <div className="data-row locked">
              <div className="conc-input disabled">0</div>
              <textarea className="signals-input" value={blankSignals} onChange={(e) => setBlankSignals(e.target.value)} />
            </div>
          </section>

          <section className="sidebar-section">
            <span className="section-title">2. Standard Data</span>
            <div className="rows-container">
              {standardRows.map((row) => (
                <div key={row.id} className="data-row">
                  <input type="text" className="conc-input" value={row.conc} onChange={(e) => updateRow(row.id, 'conc', e.target.value)} />
                  <textarea className="signals-input" value={row.signals} onChange={(e) => updateRow(row.id, 'signals', e.target.value)} />
                  <button className="remove-row-btn" onClick={() => setStandardRows(standardRows.filter(r => r.id !== row.id))}>×</button>
                </div>
              ))}
            </div>
            <button className="add-row-btn" onClick={() => setStandardRows([...standardRows, { id: Math.random().toString(36), conc: '', signals: '' }])}>+ Add Concentration</button>
          </section>
        </aside>

        <section className="content-area">
          {results ? (
            <div className="dashboard-grid">
              <div className="chart-card">
                <div className="chart-header">
                  <h2>{plotTitle}</h2>
                  <div className="chart-badges">
                    <span className="method-badge">{results.fit.method.toUpperCase()}</span>
                  </div>
                </div>
                <div className="chart-frame">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData.trend} margin={{ top: 10, right: 30, left: 20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#313244" vertical={false} />
                      <XAxis 
                        dataKey="x" type="number" scale="log" domain={['auto', 'auto']} stroke="#cdd6f4" 
                        label={{ value: xAxisLabel, position: 'bottom', fill: '#9399b2', fontSize: 12, offset: 20 }}
                      />
                      <YAxis 
                        stroke="#cdd6f4" 
                        label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill: '#9399b2', fontSize: 12 }}
                      />
                      <Tooltip contentStyle={{ backgroundColor: '#181825', borderColor: '#313244' }} />
                      <Legend verticalAlign="top" height={36} />
                      
                      <Line data={chartData.trend} type="monotone" dataKey="trend" stroke="#89b4fa" strokeWidth={3} dot={false} name="Fitted Curve" isAnimationActive={false} />
                      <Scatter data={chartData.actual} fill="#f38ba8" name="Measured Data" />
                      
                      {showAnnotations && (
                        <>
                          <ReferenceLine y={results.lc} stroke="#fab387" strokeDasharray="3 3" label={{ position: 'right', value: 'Lc', fill: '#fab387', fontSize: 10 }} />
                          <ReferenceLine y={results.ld} stroke="#a6e3a1" strokeDasharray="3 3" label={{ position: 'right', value: 'Ld', fill: '#a6e3a1', fontSize: 10 }} />
                          <ReferenceLine x={results.lodConc} stroke="#f9e2af" strokeDasharray="3 3" label={{ position: 'top', value: 'LOD', fill: '#f9e2af', fontSize: 10 }} />
                        </>
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="results-side-panel">
                <div className="lod-hero-card">
                  <label>Clinical LOD</label>
                  <div className="lod-hero-value">{results.lodConc.toExponential(3)}</div>
                  <span className="lod-hero-unit">{xAxisLabel.split('(')[0]}</span>
                </div>

                <div className="stats-card">
                  <h3>Clinical Thresholds</h3>
                  <div className="stat-row"><span className="stat-label">Limit of Blank (Lc)</span><span className="stat-value">{results.lc.toFixed(4)}</span></div>
                  <div className="stat-row"><span className="stat-label">Signal LoD (Ld)</span><span className="stat-value">{results.ld.toFixed(4)}</span></div>
                  <div className="stat-row"><span className="stat-label">Pooled SD</span><span className="stat-value">{results.sdPooled.toFixed(4)}</span></div>
                </div>

                <div className="stats-card">
                  <h3>Model Fit</h3>
                  <div className="stat-row"><span className="stat-label">R²</span><span className="stat-value">{results.fit.metrics.r2.toFixed(5)}</span></div>
                  <div className="stat-row"><span className="stat-label">RMSE</span><span className="stat-value">{results.fit.metrics.rmse.toFixed(5)}</span></div>
                  {Object.entries(results.fit.parameters).map(([name, val]: any) => (
                    <div className="stat-row" key={name}><span className="stat-label">{name}</span><span className="stat-value">{val.toFixed(4)}</span></div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-prompt">
              <div className="prompt-content"><div className="prompt-icon">🧪</div><p>Calculating validation fit...</p></div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
