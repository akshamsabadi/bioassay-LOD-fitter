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
  Legend
} from 'recharts';
import './App.css';

interface ChartPoint {
  x: number;
  y?: number;
  trend?: number;
}

interface ChartData {
  trend: ChartPoint[];
  actual: ChartPoint[];
}

function App() {
  const [blanksInput, setBlanksInput] = useState('0.1, 0.12, 0.09, 0.11, 0.1');
  const [standardsInput, setStandardsInput] = useState('1:0.2, 5:0.8, 10:1.5, 50:6.2, 100:11.8');
  const [fitMethod, setFitMethod] = useState<'linear' | '4pl'>('linear');
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  const handleCalculate = () => {
    setError('');
    try {
      const blanks = blanksInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s !== '')
        .map(Number);

      const standards: StandardData[] = standardsInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s !== '')
        .map(pair => {
          const parts = pair.split(':');
          if (parts.length !== 2) throw new Error('Invalid pair');
          const [conc, readout] = parts.map(Number);
          return { concentration: conc, readout: readout };
        });

      if (blanks.some(isNaN) || standards.some(s => isNaN(s.concentration) || isNaN(s.readout))) {
        throw new Error('Invalid numbers');
      }

      if (blanks.length < 2 || standards.length < 3) {
        throw new Error('Insufficient data points (need >=3 standards for fitting)');
      }

      const res = calculateAdvancedLoD(blanks, standards, fitMethod);
      setResults(res);
    } catch (err: any) {
      setError(err.message || 'Check your input format.');
    }
  };

  const chartData = useMemo((): ChartData => {
    if (!results) return { trend: [], actual: [] };
    
    const standards: StandardData[] = standardsInput
      .split(',')
      .map(s => {
        const parts = s.trim().split(':');
        if (parts.length !== 2) return { concentration: NaN, readout: NaN };
        const [conc, readout] = parts.map(Number);
        return { concentration: conc, readout: readout };
      })
      .filter(s => !isNaN(s.concentration));

    const minX = Math.min(...standards.map(s => s.concentration));
    const maxX = Math.max(...standards.map(s => s.concentration));
    const trendPoints: ChartPoint[] = [];
    
    const steps = 50;
    const stepSize = (maxX - minX) / steps;
    for (let i = 0; i <= steps; i++) {
      const x = minX + i * stepSize;
      trendPoints.push({
        x,
        trend: results.fit.predict(x),
      });
    }

    const actualPoints: ChartPoint[] = standards.map(s => ({
      x: s.concentration,
      y: s.readout,
    }));

    return { trend: trendPoints, actual: actualPoints };
  }, [results, standardsInput]);

  const maxActualX = useMemo(() => {
    if (chartData.actual.length === 0) return 100;
    return Math.max(...chartData.actual.map((p: any) => p.x));
  }, [chartData]);

  return (
    <div className="container">
      <h1>Assay Validation Suite</h1>
      <p className="subtitle">High-Precision LoD Fitting & Curve Analysis</p>
      
      <div className="main-layout">
        <div className="sidebar">
          <section className="input-card">
            <h3>Fitting Model</h3>
            <select 
              value={fitMethod} 
              onChange={(e) => setFitMethod(e.target.value as any)}
              className="method-select"
            >
              <option value="linear">Linear Regression (y=mx+b)</option>
              <option value="4pl">4-Parameter Logistic (4PL)</option>
            </select>
          </section>

          <section className="input-card">
            <h3>1. Blank Samples</h3>
            <textarea
              value={blanksInput}
              onChange={(e) => setBlanksInput(e.target.value)}
              placeholder="e.g. 0.1, 0.12..."
              rows={3}
            />
          </section>

          <section className="input-card">
            <h3>2. Standards (Conc : Signal)</h3>
            <textarea
              value={standardsInput}
              onChange={(e) => setStandardsInput(e.target.value)}
              placeholder="e.g. 10:1.2, 50:4.5..."
              rows={5}
            />
          </section>

          <button className="calc-btn" onClick={handleCalculate}>Fit Curve & Calculate LoD</button>
          {error && <div className="error">{error}</div>}
        </div>

        <div className="content">
          {results ? (
            <>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#313244" />
                    <XAxis 
                      dataKey="x" 
                      type="number" 
                      name="Concentration" 
                      stroke="#cdd6f4"
                      label={{ value: 'Concentration', position: 'bottom', fill: '#cdd6f4' }}
                    />
                    <YAxis 
                      stroke="#cdd6f4"
                      label={{ value: 'Signal', angle: -90, position: 'insideLeft', fill: '#cdd6f4' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#181825', borderColor: '#313244', color: '#cdd6f4' }}
                    />
                    <Legend />
                    <Line
                      data={chartData.trend}
                      type="monotone"
                      dataKey="trend"
                      stroke="#89b4fa"
                      strokeWidth={3}
                      dot={false}
                      name="Fitted Curve"
                    />
                    <Scatter 
                      data={chartData.actual} 
                      fill="#f38ba8" 
                      name="Measured Standards"
                    />
                    <Line
                      data={[{ x: 0, y: results.ld }, { x: maxActualX, y: results.ld }]}
                      dataKey="y"
                      stroke="#a6e3a1"
                      strokeDasharray="5 5"
                      name="Signal LoD (Ld)"
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="results-grid-advanced">
                <div className="metrics-card">
                  <h4>Fit Metrics</h4>
                  <div className="metric-row">
                    <span>R² Value</span>
                    <strong>{results.fit.metrics.r2.toFixed(4)}</strong>
                  </div>
                  <div className="metric-row">
                    <span>RMSE</span>
                    <strong>{results.fit.metrics.rmse.toFixed(4)}</strong>
                  </div>
                  <div className="metric-row">
                    <span>AICc</span>
                    <strong>{results.fit.metrics.aicc.toFixed(2)}</strong>
                  </div>
                </div>

                <div className="metrics-card">
                  <h4>Fit Parameters</h4>
                  {Object.entries(results.fit.parameters).map(([name, val]: any) => (
                    <div className="metric-row" key={name}>
                      <span>{name}</span>
                      <strong>{val.toFixed(4)}</strong>
                    </div>
                  ))}
                </div>

                <div className="final-lod-card">
                  <label>Validated LoD</label>
                  <div className="lod-value">{results.lodConc.toFixed(4)}</div>
                  <small>Concentration Units</small>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>Enter your data and click calculate to generate fitting analysis.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
