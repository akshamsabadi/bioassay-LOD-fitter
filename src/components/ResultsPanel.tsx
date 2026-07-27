import React, { useState, type ReactNode } from 'react';
import { type AdvancedLoDResult } from '../utils/calculations';

interface ResultsPanelProps {
  results: AdvancedLoDResult;
  xAxisLabel: string;
  handleCopyMetrics: () => void;
  fitMethod: 'linear' | 'langmuir' | '4pl' | '5pl' | 'auto';
  setFitMethod: (val: 'linear' | 'langmuir' | '4pl' | '5pl' | 'auto') => void;
}

const formatSuperscript = (val: number): ReactNode => {
  if (isNaN(val)) {
    return <span className="out-of-bounds-lod" style={{ fontSize: '1.2rem', color: 'var(--maroon)', fontWeight: 'bold' }}>Out of Bounds</span>;
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
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'models'>('summary');
  const [showFit, setShowFit] = useState(true);
  const [showStats, setShowStats] = useState(true);

  return (
    <div className="results-side-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Segmented Tab Controls */}
      <div className="results-tabs" style={{
        display: 'flex',
        backgroundColor: 'var(--surface0)',
        padding: '4px',
        borderRadius: '8px',
        border: '1px solid var(--surface1)',
        gap: '2px'
      }}>
        <button
          onClick={() => setActiveTab('summary')}
          className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          style={{
            flex: 1,
            padding: '8px 4px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            transition: 'all 0.2s',
            backgroundColor: activeTab === 'summary' ? 'var(--surface2)' : 'transparent',
            color: activeTab === 'summary' ? 'var(--blue)' : 'var(--subtext0)'
          }}
        >
          Summary
        </button>
        <button
          onClick={() => setActiveTab('models')}
          className={`tab-btn ${activeTab === 'models' ? 'active' : ''}`}
          style={{
            flex: 1,
            padding: '8px 4px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            transition: 'all 0.2s',
            backgroundColor: activeTab === 'models' ? 'var(--surface2)' : 'transparent',
            color: activeTab === 'models' ? 'var(--green)' : 'var(--subtext0)'
          }}
        >
          Model Comparison
        </button>
      </div>

      {/* TAB 1: SUMMARY (Contains LOD Hero, Collapsible Curve Fitting, and Collapsible Assay Stats) */}
      {activeTab === 'summary' && (
        <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* LOD Hero Card */}
          <div className="lod-hero-card" style={{ margin: 0 }}>
            <label>LOD</label>
            <div className="lod-hero-value">{formatSuperscript(results.lodConc)}</div>
            {!isNaN(results.lodConc) && !isNaN(results.lodCI.low) && (
              <span className="lod-hero-ci" style={{ fontSize: '0.75rem', color: 'var(--subtext1)', marginTop: '4px', marginBottom: '4px', display: 'block' }}>
                95% CI: [{results.lodCI.low.toExponential(2)}, {results.lodCI.high.toExponential(2)}]
              </span>
            )}
            <span className="lod-hero-unit">{xAxisLabel.split('(')[0].trim()}</span>
          </div>

          {/* Curve Fitting details */}
          <div className="stats-card" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div 
              onClick={() => setShowFit(!showFit)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
            >
              <h3 style={{ margin: 0, color: 'var(--blue)', fontSize: '0.85rem' }}>Curve Fitting</h3>
              <span style={{ fontSize: '0.75rem', transform: showFit ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--overlay1)' }}>▶</span>
            </div>
            
            {showFit && (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                <div className="stat-row"><span className="stat-label-wrap" data-tooltip="Akaike Information Criterion (corrected). Lower scores indicate a superior balance of model fit and simplicity."><span className="stat-label">AICc Score</span></span><span className="stat-value">{results.fit.metrics.aicc.toFixed(2)}</span></div>
                
                <div className="stat-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="stat-label-wrap" data-tooltip="Coefficient of determination. Closer to 1.0 indicates a stronger fit."><span className="stat-label">R² (Fit)</span></span>
                    <span className="stat-value">{results.fit.metrics.r2.toFixed(5)}</span>
                  </div>
                  {/* R² Visual Progress Bar */}
                  <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--surface0)', borderRadius: '2px', overflow: 'hidden', marginTop: '2px' }}>
                    <div style={{
                      width: `${Math.min(100, Math.max(0, results.fit.metrics.r2 * 100))}%`,
                      height: '100%',
                      backgroundColor: results.fit.metrics.r2 >= 0.99 ? 'var(--green)' : results.fit.metrics.r2 >= 0.95 ? 'var(--peach)' : 'var(--red)',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                <div className="stat-row"><span className="stat-label-wrap" data-tooltip="The lower asymptote of the sigmoidal curve, representing the theoretical background signal at analyte concentration zero."><span className="stat-label">Bottom (a)</span></span><span className="stat-value">{results.fit.parameters['Bottom (a)']?.toFixed(4) || 'N/A'}</span></div>
                <div className="stat-row"><span className="stat-label-wrap" data-tooltip="The Hill coefficient characterizing the steepness of the sigmoidal curve at the inflection point."><span className="stat-label">Hill Slope (b)</span></span><span className="stat-value">{results.fit.parameters['Hill Slope (b)']?.toFixed(4) || 'N/A'}</span></div>
                <div className="stat-row"><span className="stat-label-wrap" data-tooltip="The concentration corresponding to a response halfway between the lower and upper asymptotes."><span className="stat-label">EC50 (c)</span></span><span className="stat-value">{results.fit.parameters['EC50 (c)']?.toFixed(4) || 'N/A'}</span></div>
                <div className="stat-row"><span className="stat-label-wrap" data-tooltip="The upper asymptote of the sigmoidal curve, representing the maximum theoretical response (saturation)."><span className="stat-label">Top (d)</span></span><span className="stat-value">{results.fit.parameters['Top (d)']?.toFixed(4) || 'N/A'}</span></div>
                {results.fit.parameters['Asymmetry (g)'] !== undefined && (
                  <div className="stat-row"><span className="stat-label-wrap" data-tooltip="An asymmetry parameter in the 5PL model that allows the curve to approach the asymptotes at different rates."><span className="stat-label">Asymmetry (g)</span></span><span className="stat-value">{results.fit.parameters['Asymmetry (g)'].toFixed(4)}</span></div>
                )}
              </div>
            )}
          </div>

          {/* Assay Parameters */}
          <div className="stats-card" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div 
              onClick={() => setShowStats(!showStats)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
            >
              <h3 style={{ margin: 0, color: 'var(--red)', fontSize: '0.85rem' }}>Assay Parameters</h3>
              <span style={{ fontSize: '0.75rem', transform: showStats ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--overlay1)' }}>▶</span>
            </div>

            {showStats && (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                <div className="stat-row"><span className="stat-label-wrap" data-tooltip="The arithmetic mean of measured blank replicate signals."><span className="stat-label">Blank Mean</span></span><span className="stat-value">{results.meanBlank.toFixed(4)}</span></div>
                <div className="stat-row"><span className="stat-label-wrap" data-tooltip="The sample standard deviation of blank replicates."><span className="stat-label">Blank SD</span></span><span className="stat-value">{results.sdBlank.toFixed(4)}</span></div>
                <div className="stat-row"><span className="stat-label-wrap" data-tooltip="The pooled standard deviation of standard replicates, providing robust variance estimates."><span className="stat-label">Pooled SD</span></span><span className="stat-value">{results.sdPooled.toFixed(4)}</span></div>
                <div className="stat-row"><span className="stat-label-wrap" data-tooltip="The Decision Limit (LC) is the signal threshold above which response is considered statistically distinct from noise (α=0.05)."><span className="stat-label">L<sub>C</sub></span></span><span className="stat-value" style={{color: 'var(--peach)'}}>{results.lc.toFixed(4)}</span></div>
                <div className="stat-row"><span className="stat-label-wrap" data-tooltip="The Detection Limit Signal (LD) is the signal level at which there is a 95% probability that the response falls above LC (β=0.05)."><span className="stat-label">L<sub>D</sub></span></span><span className="stat-value" style={{color: 'var(--green)'}}>{results.ld.toFixed(4)}</span></div>
              </div>
            )}
          </div>

          {/* Symmetrical, beautiful Copy Report button */}
          <button 
            onClick={handleCopyMetrics} 
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--blue)',
              color: 'var(--base)',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              transition: 'all 0.15s ease-in-out',
              marginTop: '4px',
              fontSize: '0.8rem'
            }}
            onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
            onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1.0)'}
          >
            📋 Copy Analytics Report
          </button>
        </div>
      )}

      {/* TAB 2: MODELS (Contains Active Selector row for Auto selection, and Clickable Interactive model comparison cards) */}
      {activeTab === 'models' && (
        <div className="tab-content stats-card model-comparison-card" style={{ margin: 0 }}>
          <h3 style={{ color: 'var(--mauve)', marginBottom: '12px' }}>Select & Compare Models</h3>
          
          {/* Interactive Automatic Model selection row */}
          <div 
            onClick={() => setFitMethod('auto')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: fitMethod === 'auto' ? 'color-mix(in srgb, var(--green) 10%, var(--surface0))' : 'var(--surface0)',
              border: fitMethod === 'auto' ? '1px solid var(--green)' : '1px solid var(--surface1)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              marginBottom: '12px',
              transition: 'all 0.2s',
              color: fitMethod === 'auto' ? 'var(--green)' : 'var(--text)'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              🤖 Automatic (AICc Optimised)
            </span>
            {fitMethod === 'auto' && <span style={{ fontSize: '0.9rem' }}>✓</span>}
          </div>

          {/* Symmetrical clickable model rows */}
          <div className="comparison-table-wrapper" style={{ border: '1px solid var(--surface1)', borderRadius: '8px', overflow: 'hidden' }}>
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
                    >
                      <td style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', height: '36px' }}>
                        {method.toUpperCase()}
                        {isBetter && <span className="better-tag" title="Lowest AICc Score (Best Theoretical Model)">★</span>}
                        {isSelected && <span className="active-dot" title="Currently Plotted Fit Model"></span>}
                      </td>
                      <td>{fit.metrics.r2.toFixed(4)}</td>
                      <td style={{ color: isBetter ? 'var(--green)' : 'inherit', fontWeight: isBetter ? 'bold' : 'normal' }}>
                        {fit.metrics.aicc.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="comparison-footnote" style={{ marginTop: '12px', fontSize: '0.65rem', lineHeight: '1.4' }}>
            * AICc penalizes model complexity to guard against overfitting. Lower scores indicate superior mathematical balance. Click on any model above to select and fit it!
          </p>
        </div>
      )}
    </div>
  );
};
