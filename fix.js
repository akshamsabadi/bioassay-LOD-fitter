const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = content.split('\n');
const startIndex = lines.findIndex(line => line.includes('<div className="stats-card">'));
const cleanLines = lines.slice(0, startIndex);
const newEnding = `                <div className="stats-card">
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
            <div className="empty-prompt"><p>Loading Bioassay LOD Fitter v0.3.3...</p></div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
`;
fs.writeFileSync('src/App.tsx', cleanLines.join('\n') + '\n' + newEnding);
