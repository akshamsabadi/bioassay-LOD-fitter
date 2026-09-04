import React, { useState } from "react";
import { type AdvancedLoDResult } from "../utils/calculations";
import { type AssaySeries } from "../constants";

export interface SeriesLeaderboardItem {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  results: AdvancedLoDResult;
  foldChangeVsRef: string;
}

interface ResultsPanelProps {
  activeSeries: AssaySeries;
  activeResults: AdvancedLoDResult;
  leaderboardItems: SeriesLeaderboardItem[];
  onSelectSeries: (id: string) => void;
  xAxisLabel: string;
  fitMethod: "linear" | "langmuir" | "4pl" | "5pl" | "auto";
  setFitMethod: (val: "linear" | "langmuir" | "4pl" | "5pl" | "auto") => void;
  handleCopyMetrics: () => void;
  handleExportCSV: () => void;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  activeSeries,
  activeResults,
  leaderboardItems,
  onSelectSeries,
  fitMethod,
  setFitMethod,
  handleCopyMetrics,
  handleExportCSV,
}) => {
  const [showStats, setShowStats] = useState(false);

  return (
    <div className="results-side-panel" style={{ display: "flex", flexDirection: "column", gap: "10px", height: "100%", overflowY: "auto", paddingRight: "4px" }}>
      
      {/* SECTION 0: MULTI-CURVE COMPARATIVE LEADERBOARD (Shown when multiple curves exist) */}
      {leaderboardItems.length > 1 && (
        <div className="stats-card" style={{ margin: 0, display: "flex", flexDirection: "column", gap: "8px", border: "1px solid var(--surface2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, color: "var(--blue)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              Multi-Curve Sensitivity Comparison
            </h3>
            <span style={{ fontSize: "0.68rem", color: "var(--subtext0)" }}>Click row to switch</span>
          </div>

          <div style={{ border: "1px solid var(--surface1)", borderRadius: "6px", overflow: "hidden" }}>
            <table className="comparison-table" style={{ margin: 0, fontSize: "0.72rem" }}>
              <thead>
                <tr>
                  <th>Curve</th>
                  <th>Model</th>
                  <th>LOD</th>
                  <th>R²</th>
                  <th>vs Ref</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onSelectSeries(item.id)}
                    style={{
                      cursor: "pointer",
                      backgroundColor: item.isActive ? "color-mix(in srgb, var(--surface1) 70%, var(--surface0))" : "transparent",
                      transition: "all 0.15s ease-in-out"
                    }}
                    title={`Click to inspect ${item.name}`}
                  >
                    <td style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", height: "28px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: item.color }} />
                      <span style={{ color: item.isActive ? "var(--text)" : "var(--subtext1)" }}>{item.name}</span>
                      {item.isActive && <span style={{ fontSize: "0.65rem", color: item.color }}>●</span>}
                    </td>
                    <td>{item.results.fit.method.toUpperCase()}</td>
                    <td style={{ fontWeight: 700, color: "var(--yellow)", fontFamily: '"Google Sans Mono", monospace' }}>
                      {item.results.lodConc.toExponential(2)}
                    </td>
                    <td>{item.results.fit.metrics.r2.toFixed(3)}</td>
                    <td style={{
                      fontWeight: 600,
                      color: item.foldChangeVsRef.includes("higher") ? "var(--green)" : (item.foldChangeVsRef.includes("lower") ? "var(--peach)" : "var(--subtext0)")
                    }}>
                      {item.foldChangeVsRef}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 1: HERO METRIC CARD (Active Curve LOD) */}
      <div className="stats-card hero-card" style={{ margin: 0, display: "flex", flexDirection: "column", gap: "6px", borderLeft: `4px solid ${activeSeries.color}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: "0.72rem", color: "var(--subtext0)", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700 }}>
            {activeSeries.name} · Limit of Detection
          </span>
          <span style={{
            fontSize: "0.68rem",
            padding: "2px 6px",
            borderRadius: "4px",
            backgroundColor: "var(--surface1)",
            color: "var(--subtext1)",
            fontWeight: 600
          }}>
            {activeResults.fit.method.toUpperCase()} Model
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "2px" }}>
          <span style={{ fontSize: "1.7rem", fontWeight: 800, color: "var(--yellow)", fontFamily: '"Google Sans Mono", monospace', lineHeight: 1 }}>
            {activeResults.lodConc.toExponential(3)}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "var(--subtext1)", marginTop: "2px" }}>
          <span>95% CI:</span>
          <span style={{ fontFamily: '"Google Sans Mono", monospace', color: "var(--lavender)", fontWeight: 600 }}>
            [{activeResults.lodCI.low.toExponential(2)}, {activeResults.lodCI.high.toExponential(2)}]
          </span>
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "6px", paddingTop: "6px", borderTop: "1px solid var(--surface1)", fontSize: "0.72rem" }}>
          <div>
            <span style={{ color: "var(--subtext0)" }}>R²: </span>
            <span style={{ fontWeight: 700, color: "var(--text)" }}>{activeResults.fit.metrics.r2.toFixed(4)}</span>
          </div>
          <div>
            <span style={{ color: "var(--subtext0)" }}>AICc: </span>
            <span style={{ fontWeight: 700, color: "var(--text)" }}>
              {isFinite(activeResults.fit.metrics.aicc) ? activeResults.fit.metrics.aicc.toFixed(1) : "—"}
            </span>
          </div>
          <div>
            <span style={{ color: "var(--subtext0)" }}>Points: </span>
            <span style={{ fontWeight: 700, color: "var(--text)" }}>{activeResults.fit.actualX.length}</span>
          </div>
        </div>

        {/* Micro-grid of fitted parameters */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4px 10px",
          marginTop: "4px",
          paddingTop: "6px",
          borderTop: "1px solid var(--surface1)"
        }}>
          {Object.entries(activeResults.fit.parameters).map(([name, val]) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem" }}>
              <span style={{ color: "var(--subtext0)" }}>{name.split("(")[0].trim()}:</span>
              <span style={{ fontWeight: 600, fontFamily: '"Google Sans Mono", monospace', color: "var(--text)" }}>
                {Math.abs(val) >= 1000 || (Math.abs(val) > 0 && Math.abs(val) < 0.01) ? val.toExponential(2) : val.toFixed(3)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: MODEL COMPARISON & SELECTION (For Active Curve) */}
      <div className="stats-card model-comparison-card" style={{ margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, color: "var(--mauve)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.8px" }}>
            Model Selection ({activeSeries.name})
          </h3>
          <button
            onClick={() => setFitMethod("auto")}
            style={{
              padding: "2px 8px",
              borderRadius: "6px",
              fontSize: "0.68rem",
              fontWeight: 700,
              cursor: "pointer",
              border: fitMethod === "auto" ? "1px solid var(--green)" : "1px solid var(--surface1)",
              backgroundColor: fitMethod === "auto" ? "color-mix(in srgb, var(--green) 12%, var(--surface0))" : "var(--surface0)",
              color: fitMethod === "auto" ? "var(--green)" : "var(--subtext0)",
              transition: "all 0.15s"
            }}
            title="Automatically select model with lowest AICc"
          >
            {fitMethod === "auto" ? "✓ Auto (AICc)" : "Set Auto"}
          </button>
        </div>

        <div className="comparison-table-wrapper" style={{ border: "1px solid var(--surface1)", borderRadius: "6px", overflow: "hidden" }}>
          <table className="comparison-table" style={{ margin: 0, fontSize: "0.72rem" }}>
            <thead>
              <tr>
                <th>Model</th>
                <th>R²</th>
                <th>AICc</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(activeResults.comparison.fits).map(([method, fit]) => {
                const isSelected = activeResults.fit.method === method;
                const isActiveSelection = fitMethod === method;
                const isBetter = activeResults.comparison.betterMethod === method;
                return (
                  <tr 
                    key={method} 
                    className={`${isActiveSelection ? "selected-row" : ""} ${isBetter ? "better-row" : ""}`}
                    onClick={() => setFitMethod(method as any)}
                    style={{ cursor: "pointer", transition: "all 0.15s ease-in-out" }}
                    title={`Click to select ${method.toUpperCase()} model for ${activeSeries.name}`}
                  >
                    <td style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", height: "30px" }}>
                      {method.toUpperCase()}
                      {isBetter && <span className="better-tag" title="Lowest AICc Score (Best Theoretical Model)">★</span>}
                      {isSelected && <span className="active-dot" title="Currently Plotted Fit Model" />}
                    </td>
                    <td>{fit.metrics.r2.toFixed(4)}</td>
                    <td style={{ color: isBetter ? "var(--green)" : "inherit", fontWeight: isBetter ? "bold" : "normal" }}>
                      {isFinite(fit.metrics.aicc) ? fit.metrics.aicc.toFixed(1) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: ASSAY STATISTICAL LIMITS */}
      <div className="stats-card" style={{ margin: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
        <div 
          onClick={() => setShowStats(!showStats)}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}
        >
          <h3 style={{ margin: 0, color: "var(--peach)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.8px" }}>
            {activeSeries.name} Limits & Noise
          </h3>
          <span style={{ fontSize: "0.7rem", transform: showStats ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", color: "var(--overlay1)" }}>▶</span>
        </div>

        {showStats && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
            <div className="stat-row">
              <span className="stat-label-wrap" data-tooltip="Decision Limit (LC): Signal threshold above which response is statistically distinct from noise (α=0.05).">
                <span className="stat-label">Critical Level (L<sub>C</sub>)</span>
              </span>
              <span className="stat-value" style={{ color: "var(--peach)" }}>{activeResults.lc.toFixed(4)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label-wrap" data-tooltip="Detection Limit Signal (LD): Signal level ensuring 95% detection probability above LC (β=0.05).">
                <span className="stat-label">Signal Limit (L<sub>D</sub>)</span>
              </span>
              <span className="stat-value" style={{ color: "var(--green)" }}>{activeResults.ld.toFixed(4)}</span>
            </div>
            <div className="stat-row"><span className="stat-label">Blank Mean</span><span className="stat-value">{activeResults.meanBlank.toFixed(4)}</span></div>
            <div className="stat-row"><span className="stat-label">Blank SD</span><span className="stat-value">{activeResults.sdBlank.toFixed(4)}</span></div>
            <div className="stat-row"><span className="stat-label">Pooled Replicate SD</span><span className="stat-value">{activeResults.sdPooled.toFixed(4)}</span></div>
            {activeResults.isDecreasing && (
              <div className="stat-row">
                <span className="stat-label">Assay Mode</span>
                <span className="stat-value" style={{ color: "var(--mauve)", fontWeight: "bold" }}>Competitive / Decreasing</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 4: UNIFIED ACTIONS */}
      <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
        <button 
          onClick={handleCopyMetrics} 
          style={{
            flex: 1,
            padding: "8px 4px",
            borderRadius: "6px",
            backgroundColor: "var(--surface2)",
            color: "var(--text)",
            fontWeight: "bold",
            border: "1px solid var(--surface1)",
            cursor: "pointer",
            fontSize: "0.72rem",
            transition: "all 0.15s ease-in-out"
          }}
          title="Copy comparative multi-curve analytics report as Markdown"
        >
          Copy Report
        </button>
        <button 
          onClick={handleExportCSV} 
          style={{
            flex: 1,
            padding: "8px 4px",
            borderRadius: "6px",
            backgroundColor: "var(--green)",
            color: "var(--base)",
            fontWeight: "bold",
            border: "none",
            cursor: "pointer",
            fontSize: "0.72rem",
            transition: "all 0.15s ease-in-out"
          }}
          title="Download complete multi-curve experimental audit as CSV"
        >
          Export CSV
        </button>
      </div>

    </div>
  );
};
