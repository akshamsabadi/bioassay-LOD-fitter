import React, { useState, useMemo } from "react";
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
  pendingSeriesName?: string;
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
  pendingSeriesName,
  leaderboardItems,
  onSelectSeries,
  xAxisLabel,
  fitMethod,
  setFitMethod,
  handleCopyMetrics,
  handleExportCSV,
}) => {
  const [showStats, setShowStats] = useState(false);
  const [sortField, setSortField] = useState<"name" | "model" | "lod" | "r2" | "fold" | null>("lod");
  const [sortAsc, setSortAsc] = useState(true);
  const isMultiCurve = leaderboardItems.length > 1;

  const handleSort = (field: "name" | "model" | "lod" | "r2" | "fold") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedLeaderboard = useMemo(() => {
    if (!sortField) return leaderboardItems;
    return [...leaderboardItems].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "model") cmp = a.results.fit.method.localeCompare(b.results.fit.method);
      else if (sortField === "lod") cmp = (a.results.lodConc || Infinity) - (b.results.lodConc || Infinity);
      else if (sortField === "r2") cmp = a.results.fit.metrics.r2 - b.results.fit.metrics.r2;
      else if (sortField === "fold") cmp = (a.results.lodConc || 0) - (b.results.lodConc || 0);
      return sortAsc ? cmp : -cmp;
    });
  }, [leaderboardItems, sortField, sortAsc]);

  return (
    <div className="results-side-panel">
      
      {pendingSeriesName && (
        <div style={{
          padding: "10px 14px",
          borderRadius: "var(--radius-md)",
          backgroundColor: "color-mix(in srgb, var(--indigo) 8%, var(--surface0))",
          border: "1px dashed var(--indigo)",
          fontSize: "0.76rem",
          color: "var(--subtext1)",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span style={{ fontSize: "0.9rem" }}>✏️</span>
          <span>
            Entering <strong>{pendingSeriesName}</strong> in sidebar · Showing <strong>{activeSeries.name}</strong>
          </span>
        </div>
      )}
      
      {/* SECTION 0: MULTI-CURVE COMPARATIVE LEADERBOARD */}
      {isMultiCurve && (
        <div className="stats-card">
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <h3 style={{ margin: 0, color: "var(--text)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🏆</span> Sensitivity Leaderboard
            </h3>
            <span style={{ fontSize: "0.68rem", color: "var(--subtext0)" }}>Click header to sort</span>
          </div>

          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("name")} style={{ whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }} title="Sort by curve name">
                    Curve {sortField === "name" && (sortAsc ? "▲" : "▼")}
                  </th>
                  <th onClick={() => handleSort("model")} style={{ whiteSpace: "nowrap", textAlign: "center", cursor: "pointer", userSelect: "none" }} title="Sort by model">
                    Model {sortField === "model" && (sortAsc ? "▲" : "▼")}
                  </th>
                  <th onClick={() => handleSort("lod")} style={{ whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }} title="Sort by LOD">
                    LOD {sortField === "lod" && (sortAsc ? "▲" : "▼")}
                  </th>
                  <th onClick={() => handleSort("r2")} style={{ whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }} title="Sort by R²">
                    R² {sortField === "r2" && (sortAsc ? "▲" : "▼")}
                  </th>
                  <th onClick={() => handleSort("fold")} style={{ whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }} title="Sort by Sensitivity">
                    vs Ref {sortField === "fold" && (sortAsc ? "▲" : "▼")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedLeaderboard.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onSelectSeries(item.id)}
                    className={item.isActive ? "selected-row" : ""}
                    style={{
                      cursor: "pointer",
                      transition: "all 0.15s ease-in-out"
                    }}
                    title={`Click to inspect ${item.name}`}
                  >
                    <td style={{ fontWeight: 700, padding: "8px 12px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: item.color, flexShrink: 0 }} />
                        <span style={{ color: item.isActive ? "var(--text)" : "var(--subtext1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "105px" }} title={item.name}>
                          {item.name}
                        </span>
                        {item.isActive && <span style={{ fontSize: "0.65rem", color: item.color, flexShrink: 0 }}>●</span>}
                      </div>
                    </td>
                    <td style={{ whiteSpace: "nowrap", textAlign: "center", fontSize: "0.68rem" }}>{item.results.fit.method.toUpperCase()}</td>
                    <td style={{ whiteSpace: "nowrap", fontWeight: 700, color: "var(--yellow)", fontFamily: "'JetBrains Mono', monospace" }} className="tabular-nums">
                      {item.results.lodConc.toExponential(2)}
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontFamily: "'JetBrains Mono', monospace" }} className="tabular-nums">{item.results.fit.metrics.r2.toFixed(3)}</td>
                    <td style={{
                      whiteSpace: "nowrap",
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

      {/* SECTION 1: MODERN BIOTECH HERO METRIC CARD (Limit of Detection) */}
      <div className="stats-card hero-card">
        {/* Header */}
        <div style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="22" y1="12" x2="18" y2="12" />
              <line x1="6" y1="12" x2="2" y2="12" />
              <line x1="12" y1="6" x2="12" y2="2" />
              <line x1="12" y1="22" x2="12" y2="18" />
            </svg>
            <span style={{ 
              fontSize: "0.82rem", 
              color: "var(--text)", 
              fontWeight: 700,
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}>
              {isMultiCurve ? `${activeSeries.name} · Limit of Detection` : "Limit of Detection (LOD)"}
            </span>
          </div>
          <span style={{
            fontSize: "0.68rem",
            padding: "2px 8px",
            borderRadius: "var(--radius-pill)",
            backgroundColor: "color-mix(in srgb, var(--blue) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--blue) 25%, transparent)",
            color: "var(--blue)",
            fontWeight: 700,
            whiteSpace: "nowrap",
            flexShrink: 0
          }}>
            {activeResults.fit.method.toUpperCase()} Fit
          </span>
        </div>

        {/* Card Body */}
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--subtext0)", fontWeight: 700, marginBottom: "4px" }}>
              Calculated Threshold
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span className="hero-value tabular-nums">
                {isNaN(activeResults.lodConc) ? "N/A" : activeResults.lodConc.toExponential(3)}
              </span>
              {xAxisLabel && (
                <span style={{ 
                  fontSize: "0.92rem", 
                  fontWeight: 600, 
                  color: "var(--subtext0)"
                }}>
                  {xAxisLabel.includes("(") ? xAxisLabel.split("(")[1].replace(")", "") : xAxisLabel}
                </span>
              )}
            </div>

            {!isNaN(activeResults.lodConc) && !isNaN(activeResults.lodCI.low) ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "var(--subtext0)", marginTop: "6px", flexWrap: "wrap" }}>
                <span>95% CI:</span>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--lavender)",
                  fontWeight: 600,
                  backgroundColor: "color-mix(in srgb, var(--lavender) 12%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--lavender) 25%, transparent)",
                  padding: "2px 8px",
                  borderRadius: "var(--radius-pill)"
                }} className="tabular-nums">
                  {activeResults.lodCI.low.toExponential(2)} – {activeResults.lodCI.high.toExponential(2)}
                </span>
              </div>
            ) : isNaN(activeResults.lodConc) ? (
              <div style={{ fontSize: "0.72rem", color: "var(--red)", marginTop: "6px", backgroundColor: "color-mix(in srgb, var(--red) 10%, transparent)", padding: "4px 8px", borderRadius: "var(--radius-sm)" }}>
                ⚠️ L<sub>D</sub> signal ({activeResults.ld.toFixed(3)}) falls outside dynamic range
              </div>
            ) : null}
          </div>

          {/* Three Modern Metric KPI Sub-Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "2px" }}>
            <div style={{ backgroundColor: "var(--surface0)", borderRadius: "var(--radius-md)", padding: "10px 12px", border: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "3px" }}>
              <span style={{ fontSize: "0.62rem", color: "var(--subtext0)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Fit (R²)</span>
              <span style={{ fontSize: "1.05rem", fontWeight: 800, color: activeResults.fit.metrics.r2 >= 0.99 ? "var(--green)" : "var(--text)", fontFamily: "'JetBrains Mono', monospace" }} className="tabular-nums">
                {activeResults.fit.metrics.r2.toFixed(4)}
              </span>
            </div>
            <div style={{ backgroundColor: "var(--surface0)", borderRadius: "var(--radius-md)", padding: "10px 12px", border: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "3px" }}>
              <span style={{ fontSize: "0.62rem", color: "var(--subtext0)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>AICc</span>
              <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text)", fontFamily: "'JetBrains Mono', monospace" }} className="tabular-nums">
                {isFinite(activeResults.fit.metrics.aicc) ? activeResults.fit.metrics.aicc.toFixed(1) : "—"}
              </span>
            </div>
            <div style={{ backgroundColor: "var(--surface0)", borderRadius: "var(--radius-md)", padding: "10px 12px", border: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "3px" }}>
              <span style={{ fontSize: "0.62rem", color: "var(--subtext0)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Points</span>
              <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text)", fontFamily: "'JetBrains Mono', monospace" }} className="tabular-nums">
                {activeResults.fit.actualX.length}
              </span>
            </div>
          </div>

          {/* Micro-grid of fitted parameters */}
          <div style={{
            paddingTop: "12px",
            borderTop: "1px solid var(--border-subtle)"
          }}>
            <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--subtext0)", fontWeight: 700, marginBottom: "8px" }}>
              Sigmoidal Parameters
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px 8px"
            }}>
              {Object.entries(activeResults.fit.parameters).map(([name, val]) => {
                const cleanName = name.replace("EC50", "EC₅₀").split("(")[0].trim();
                return (
                  <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 10px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--surface0)", border: "1px solid var(--border-subtle)", fontSize: "0.74rem" }}>
                    <span style={{ color: "var(--subtext1)", fontWeight: 600 }}>{cleanName}</span>
                    <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "var(--text)" }} className="tabular-nums">
                      {Math.abs(val) >= 1000 || (Math.abs(val) > 0 && Math.abs(val) < 0.01) ? val.toExponential(2) : val.toFixed(3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: MODEL SELECTION & COMPARISON */}
      <div className="stats-card">
        {/* Header */}
        <div style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <h3 style={{ margin: 0, color: "var(--text)", fontSize: "0.82rem", letterSpacing: "-0.01em", fontWeight: 700 }}>
              Model Selection
            </h3>
          </div>
          <button
            onClick={() => setFitMethod("auto")}
            style={{
              padding: "3px 10px",
              borderRadius: "var(--radius-pill)",
              fontSize: "0.7rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              border: fitMethod === "auto" ? "1px solid var(--green)" : "1px solid var(--border-subtle)",
              backgroundColor: fitMethod === "auto" ? "color-mix(in srgb, var(--green) 14%, var(--surface0))" : "transparent",
              color: fitMethod === "auto" ? "var(--green)" : "var(--subtext0)",
              transition: "all 0.15s ease-in-out"
            }}
            title="Automatically select model with lowest AICc"
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: fitMethod === "auto" ? "var(--green)" : "var(--subtext0)" }} />
            {fitMethod === "auto" ? "Auto-Selected" : "Auto-Select"}
          </button>
        </div>

        <div className="comparison-table-wrapper">
          <table className="comparison-table">
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
                const isBetter = activeResults.comparison.betterMethod === method;
                return (
                  <tr 
                    key={method} 
                    className={`${isSelected ? "selected-row" : ""}`}
                    onClick={() => setFitMethod(method as "linear" | "langmuir" | "4pl" | "5pl" | "auto")}
                    style={{
                      cursor: "pointer",
                      transition: "all 0.15s ease-in-out"
                    }}
                    title={`Click to select ${method.toUpperCase()} model`}
                  >
                    <td style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>{method.toUpperCase()}</span>
                      {isBetter && (
                        <span style={{
                          fontSize: "0.62rem",
                          fontWeight: 700,
                          backgroundColor: "color-mix(in srgb, var(--green) 14%, transparent)",
                          color: "var(--green)",
                          border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)",
                          padding: "1px 6px",
                          borderRadius: "var(--radius-pill)"
                        }}>
                          Best Fit
                        </span>
                      )}
                      {isSelected && (
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--blue)" }} title="Active model" />
                      )}
                    </td>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace" }} className="tabular-nums">{fit.metrics.r2.toFixed(4)}</td>
                    <td style={{ color: isBetter ? "var(--green)" : "inherit", fontWeight: isBetter ? 700 : 500, fontFamily: "'JetBrains Mono', monospace" }} className="tabular-nums">
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
      <div className="stats-card">
        <div 
          onClick={() => setShowStats(!showStats)}
          style={{
            padding: "12px 16px",
            borderBottom: showStats ? "1px solid var(--border-subtle)" : "none",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            userSelect: "none"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--peach)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12h20M2 12l5-5m-5 5 5 5" />
            </svg>
            <h3 style={{ margin: 0, color: "var(--text)", fontSize: "0.82rem", letterSpacing: "-0.01em", fontWeight: 700 }}>
              Statistical Limits & Noise
            </h3>
          </div>
          <span style={{ fontSize: "0.75rem", transform: showStats ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", color: "var(--subtext0)" }}>▶</span>
        </div>

        {showStats && (
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
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
                <span className="stat-value" style={{ color: "var(--mauve)" }}>Competitive / Decreasing</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 4: UNIFIED MODERN ACTION BUTTONS */}
      <div style={{ display: "flex", gap: "10px", marginTop: "2px" }}>
        <button 
          onClick={handleCopyMetrics} 
          className="action-btn-pill"
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--surface0)",
            color: "var(--text)",
            fontWeight: 600,
            fontSize: "0.78rem",
            height: "40px"
          }}
          title="Copy analytics report as Markdown"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span>Copy Report</span>
        </button>
        <button 
          onClick={handleExportCSV} 
          className="action-btn-pill"
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--green)",
            color: "#ffffff",
            fontWeight: 700,
            border: "none",
            fontSize: "0.78rem",
            boxShadow: "0 2px 10px rgba(16, 185, 129, 0.3)",
            height: "40px"
          }}
          title="Download experimental audit as CSV"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Export CSV</span>
        </button>
      </div>

    </div>
  );
};
