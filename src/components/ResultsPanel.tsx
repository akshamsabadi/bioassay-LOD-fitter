import React, { useState, type ReactNode } from 'react';
import { type AdvancedLoDResult } from '../utils/calculations';

interface ResultsPanelProps {
  results: AdvancedLoDResult;
  xAxisLabel: string;
  handleCopyMetrics: () => void;
  fitMethod: 'linear' | 'langmuir' | '4pl' | '5pl' | 'auto';
  setFitMethod: (val: 'linear' | 'langmuir' | '4pl' | '5pl' | 'auto') => void;
  handleExportCSV: () => void;
}

const formatSuperscript = (val: number): ReactNode => {
  if (isNaN(val) || !isFinite(val)) {
    return <span className="out-of-bounds-lod" style={{ fontSize: '1.2rem', color: 'var(--red)', fontWeight: 'bold' }}>Out of Bounds</span>;
  }
  if (val === 0) return '0';
  const exponent = Math.floor(Math.log10(Math.abs(val)));
  const base = (val / Math.pow(10, exponent)).toFixed(2);
  if (parseFloat(base) === 1) {
    return <span>10<sup>{exponent}</sup></span>;
  }
  return <span>{base} × 10<sup>{exponent}</sup></span>;
};

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  results,
  xAxisLabel,
  handleCopyMetrics,
  fitMethod,
  setFitMethod,
  handleExportCSV,
}) => {
  const [showStats, setShowStats] = useState(false);

  return (
    <div className="results-side-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* SECTION 1: LOD HERO CARD */}
      <div className="lod-hero-card" style={{ margin: 0 }}>
        <label>Limit of Detection (LOD)</label>
        <div className="lod-hero-value">{formatSuperscript(results.lodConc)}</div>
        {!isNaN(results.lodConc) && !isNaN(results.lodCI.low) && (
          <span className="lod-hero-ci" style={{ fontSize: '0.75rem', color: 'var(--subtext1)', marginTop: '4px', marginBottom: '4px', display: 'block' }}>
            95% CI: [{results.lodCI.low.toExponential(2)}, {results.lodCI.high.toExponential(2)}]
          </span>
        )}
        {isNaN(results.lodConc) && (
          <span style={{ fontSize: '0.7rem', color: 'var(--red)', marginTop: '4px', marginBottom: '4px', display: 'block' }}>
            L<sub>D</sub> signal ({results.ld.toFixed(3)}) falls outside curve dynamic range
          </span>
        )}
        <span className="lod-hero-unit">{xAxisLabel.split('(')[0].trim()}</span>
      </div>

      {/* SECTION 2: ACTIVE MODEL PARAMETERS */}
      <div className="stats-card" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: 'var(--blue)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            {results.fit.method.toUpperCase()} Fit
          </h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 'bold',
              color: results.fit.metrics.r2 >= 0.99 ? 'var(--green)' : results.fit.metrics.r2 >= 0.95 ? 'var(--peach)' : 'var(--pink)'
            }}>
              R² = {results.fit.metrics.r2.toFixed(4)}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--overlay1)' }}>
              AICc {isFinite(results.fit.metrics.aicc) ? results.fit.metrics.aicc.toFixed(1) : 'N/A'}
            </span>
          </div>
        </div>

        {/* Micro-grid of fitted parameters */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px 12px',
          marginTop: '4px',
          paddingTop: '6px',
          borderTop: '1px solid var(--surface1)'
        }}>
          {Object.entries(results.fit.parameters).map(([name, val]) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--subtext0)' }}>{name.split('(')[0].trim()}:</span>
              <span style={{ fontWeight: 600, fontFamily: '"Google Sans Mono", monospace', color: 'var(--text)' }}>
                {Math.abs(val) >= 1000 || (Math.abs(val) > 0 && Math.abs(val) < 0.01) ? val.toExponential(2) : val.toFixed(3)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: MODEL COMPARISON & SELECTION */}
      <div className="stats-card model-comparison-card" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: 'var(--mauve)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Compare & Select Models
          </h3>
          <button
            onClick={() => setFitMethod('auto')}
            style={{
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: fitMethod === 'auto' ? '1px solid var(--green)' : '1px solid var(--surface1)',
              backgroundColor: fitMethod === 'auto' ? 'color-mix(in srgb, var(--green) 12%, var(--surface0))' : 'var(--surface0)',
              color: fitMethod === 'auto' ? 'var(--green)' : 'var(--subtext0)',
              transition: 'all 0.15s'
            }}
            title="Automatically select model with lowest AICc"
          >
            {fitMethod === 'auto' ? '✓ Auto (AICc)' : 'Set Auto'}
          </button>
        </div>

        <div className="comparison-table-wrapper" style={{ border: '1px solid var(--surface1)', borderRadius: '6px', overflow: 'hidden' }}>
          <table className="comparison-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Model</th>
                <th>R²</th>
                <th>AICc</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(results.comparison.fits).map(([method, fit]) => {
                const isSelected = results.fit.method === method;
                const isActiveSelection = fitMethod === method;
                const isBetter = results.comparison.betterMethod === method;
                return (
                  <tr 
                    key={method} 
                    className={`${isActiveSelection ? 'selected-row' : ''} ${isBetter ? 'better-row' : ''}`}
                    onClick={() => setFitMethod(method as any)}
                    style={{ cursor: 'pointer', transition: 'all 0.15s ease-in-out' }}
                    title={`Click to select ${method.toUpperCase()} model`}
                  >
                    <td style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', height: '32px' }}>
                      {method.toUpperCase()}
                      {isBetter && <span className="better-tag" title="Lowest AICc Score (Best Theoretical Model)">★</span>}
                      {isSelected && <span className="active-dot" title="Currently Plotted Fit Model"></span>}
                    </td>
                    <td>{fit.metrics.r2.toFixed(4)}</td>
                    <td style={{ color: isBetter ? 'var(--green)' : 'inherit', fontWeight: isBetter ? 'bold' : 'normal' }}>
                      {isFinite(fit.metrics.aicc) ? fit.metrics.aicc.toFixed(1) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: ASSAY STATISTICAL PARAMETERS */}
      <div className="stats-card" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div 
          onClick={() => setShowStats(!showStats)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
        >
          <h3 style={{ margin: 0, color: 'var(--peach)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Assay Limits & Noise
          </h3>
          <span style={{ fontSize: '0.7rem', transform: showStats ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--overlay1)' }}>▶</span>
        </div>

        {showStats && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <div className="stat-row">
              <span className="stat-label-wrap" data-tooltip="The Decision Limit (LC) is the signal threshold above which response is statistically distinct from noise (α=0.05).">
                <span className="stat-label">Critical Level (L<sub>C</sub>)</span>
              </span>
              <span className="stat-value" style={{ color: 'var(--peach)' }}>{results.lc.toFixed(4)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label-wrap" data-tooltip="The Detection Limit Signal (LD) is the signal level ensuring 95% detection probability above LC (β=0.05).">
                <span className="stat-label">Signal Limit (L<sub>D</sub>)</span>
              </span>
              <span className="stat-value" style={{ color: 'var(--green)' }}>{results.ld.toFixed(4)}</span>
            </div>
            <div className="stat-row"><span className="stat-label">Blank Mean</span><span className="stat-value">{results.meanBlank.toFixed(4)}</span></div>
            <div className="stat-row"><span className="stat-label">Blank SD</span><span className="stat-value">{results.sdBlank.toFixed(4)}</span></div>
            <div className="stat-row"><span className="stat-label">Pooled Replicate SD</span><span className="stat-value">{results.sdPooled.toFixed(4)}</span></div>
            {results.isDecreasing && (
              <div className="stat-row">
                <span className="stat-label">Assay Mode</span>
                <span className="stat-value" style={{ color: 'var(--mauve)', fontWeight: 'bold' }}>Competitive / Decreasing</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 5: UNIFIED ACTIONS */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
        <button 
          onClick={handleCopyMetrics} 
          style={{
            flex: 1,
            padding: '8px 4px',
            borderRadius: '6px',
            backgroundColor: 'var(--surface2)',
            color: 'var(--text)',
            fontWeight: 'bold',
            border: '1px solid var(--surface1)',
            cursor: 'pointer',
            fontSize: '0.72rem',
            transition: 'all 0.15s ease-in-out'
          }}
          title="Copy full analytics report as Markdown to clipboard"
        >
          Copy Report
        </button>
        <button 
          onClick={handleExportCSV} 
          style={{
            flex: 1,
            padding: '8px 4px',
            borderRadius: '6px',
            backgroundColor: 'var(--green)',
            color: 'var(--base)',
            fontWeight: 'bold',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.72rem',
            transition: 'all 0.15s ease-in-out'
          }}
          title="Download complete experimental analysis as CSV"
        >
          Export CSV
        </button>
      </div>

    </div>
  );
};
