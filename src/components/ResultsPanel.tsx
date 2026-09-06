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
    <div className="results-side-panel" style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%", overflowY: "auto", paddingRight: "4px" }}>
      
      {/* SECTION 0: MULTI-CURVE COMPARATIVE LEADERBOARD (Shown when multiple curves exist) */}
      {isMultiCurve && (
        <div className="stats-card" style={{ margin: 0, padding: 0, overflow: "visible", border: "1px solid var(--surface1)", borderRadius: "10px", background: "var(--surface0)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          {/* Top header banner */}
          <div style={{
            backgroundColor: "color-mix(in srgb, var(--surface1) 50%, var(--surface0))",
            borderBottom: "1px solid var(--surface1)",
            borderTopLeftRadius: "9px",
            borderTopRightRadius: "9px",
            padding: "8px 12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <h3 style={{ margin: 0, color: "var(--text)", fontSize: "0.76rem", textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
              <span>🏆</span> SENSITIVITY LEADERBOARD
            </h3>
            <span style={{ fontSize: "0.68rem", color: "var(--subtext0)" }}>Click headers to sort</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="comparison-table" style={{ margin: 0, width: "100%", fontSize: "0.72rem" }}>
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
                    style={{
                      cursor: "pointer",
                      backgroundColor: item.isActive ? "color-mix(in srgb, var(--surface1) 70%, var(--surface0))" : "transparent",
                      transition: "all 0.15s ease-in-out"
                    }}
                    title={`Click to inspect ${item.name}`}
                  >
                    <td style={{ fontWeight: 700, padding: "6px 8px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: item.color, flexShrink: 0 }} />
                        <span style={{ color: item.isActive ? "var(--text)" : "var(--subtext1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "115px" }} title={item.name}>
                          {item.name}
                        </span>
                        {item.isActive && <span style={{ fontSize: "0.65rem", color: item.color, flexShrink: 0 }}>●</span>}
                      </div>
                    </td>
                    <td style={{ whiteSpace: "nowrap", textAlign: "center", fontSize: "0.68rem" }}>{item.results.fit.method.toUpperCase()}</td>
                    <td style={{ whiteSpace: "nowrap", fontWeight: 700, color: "var(--yellow)", fontFamily: '"Google Sans Mono", monospace' }}>
                      {item.results.lodConc.toExponential(2)}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{item.results.fit.metrics.r2.toFixed(3)}</td>
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
      <div className="stats-card hero-card" style={{
        margin: 0,
        padding: 0,
        overflow: "visible",
        border: "1px solid var(--surface1)",
        borderRadius: "10px",
        background: "var(--surface0)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)"
      }}>
        {/* Top header banner */}
        <div style={{
          backgroundColor: isMultiCurve ? `color-mix(in srgb, ${activeSeries.color} 12%, var(--surface0))` : "color-mix(in srgb, var(--surface1) 50%, var(--surface0))",
          borderBottom: "1px solid var(--surface1)",
          borderTopLeftRadius: "9px",
          borderTopRightRadius: "9px",
          padding: "10px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="22" y1="12" x2="18" y2="12" />
              <line x1="6" y1="12" x2="2" y2="12" />
              <line x1="12" y1="6" x2="12" y2="2" />
              <line x1="12" y1="22" x2="12" y2="18" />
            </svg>
            <span style={{ 
              fontSize: "0.78rem", 
              color: "var(--text)", 
              fontWeight: 700,
              letterSpacing: "0.2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}>
              {isMultiCurve ? `${activeSeries.name} · Limit of Detection` : "Limit of Detection (LOD)"}
            </span>
          </div>
          <span style={{
            fontSize: "0.7rem",
            padding: "3px 8px",
            borderRadius: "9999px",
            backgroundColor: "color-mix(in srgb, var(--blue) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--blue) 25%, transparent)",
            color: "var(--blue)",
            fontWeight: 600,
            whiteSpace: "nowrap",
            flexShrink: 0
          }}>
            {activeResults.fit.method.toUpperCase()} Fit
          </span>
        </div>

        {/* Card Body */}
        <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <div style={{ fontSize: "0.66rem", textTransform: "uppercase", letterSpacing: "0.6px", color: "var(--subtext0)", fontWeight: 600, marginBottom: "4px" }}>
              Calculated Threshold
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{ 
                fontSize: "2.3rem", 
                fontWeight: 800, 
                color: "var(--yellow)", 
                fontFamily: '"Google Sans", -apple-system, sans-serif',
                lineHeight: 1,
                letterSpacing: "-0.02em"
              }}>
                {isNaN(activeResults.lodConc) ? "N/A" : activeResults.lodConc.toExponential(3)}
              </span>
              {xAxisLabel && (
                <span style={{ 
                  fontSize: "0.95rem", 
                  fontWeight: 600, 
                  color: "var(--subtext0)"
                }}>
                  {xAxisLabel.includes("(") ? xAxisLabel.split("(")[1].replace(")", "") : xAxisLabel}
                </span>
              )}
            </div>

            {!isNaN(activeResults.lodConc) && !isNaN(activeResults.lodCI.low) ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.76rem", color: "var(--subtext0)", marginTop: "6px", flexWrap: "wrap" }}>
                <span>95% Confidence Interval:</span>
                <span style={{
                  fontFamily: '"Google Sans Mono", monospace',
                  color: "var(--lavender)",
                  fontWeight: 600,
                  backgroundColor: "color-mix(in srgb, var(--lavender) 12%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--lavender) 25%, transparent)",
                  padding: "2px 6px",
                  borderRadius: "4px"
                }}>
                  {activeResults.lodCI.low.toExponential(2)} – {activeResults.lodCI.high.toExponential(2)}
                </span>
              </div>
            ) : isNaN(activeResults.lodConc) ? (
              <div style={{ fontSize: "0.72rem", color: "var(--red)", marginTop: "6px", backgroundColor: "color-mix(in srgb, var(--red) 10%, transparent)", padding: "4px 8px", borderRadius: "6px" }}>
                ⚠️ L<sub>D</sub> signal ({activeResults.ld.toFixed(3)}) falls outside dynamic range
              </div>
            ) : null}
          </div>

          {/* Three Modern Metric KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "4px" }}>
            <div style={{ backgroundColor: "color-mix(in srgb, var(--surface1) 50%, var(--surface0))", borderRadius: "8px", padding: "8px 10px", border: "1px solid var(--surface1)", display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontSize: "0.62rem", color: "var(--subtext0)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Fit (R²)</span>
              <span style={{ fontSize: "1.02rem", fontWeight: 700, color: activeResults.fit.metrics.r2 >= 0.99 ? "var(--green)" : "var(--text)", fontFamily: '"Google Sans Mono", monospace' }}>
                {activeResults.fit.metrics.r2.toFixed(4)}
              </span>
            </div>
            <div style={{ backgroundColor: "color-mix(in srgb, var(--surface1) 50%, var(--surface0))", borderRadius: "8px", padding: "8px 10px", border: "1px solid var(--surface1)", display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontSize: "0.62rem", color: "var(--subtext0)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>AICc</span>
              <span style={{ fontSize: "1.02rem", fontWeight: 700, color: "var(--text)", fontFamily: '"Google Sans Mono", monospace' }}>
                {isFinite(activeResults.fit.metrics.aicc) ? activeResults.fit.metrics.aicc.toFixed(1) : "—"}
              </span>
            </div>
            <div style={{ backgroundColor: "color-mix(in srgb, var(--surface1) 50%, var(--surface0))", borderRadius: "8px", padding: "8px 10px", border: "1px solid var(--surface1)", display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontSize: "0.62rem", color: "var(--subtext0)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Points</span>
              <span style={{ fontSize: "1.02rem", fontWeight: 700, color: "var(--text)", fontFamily: '"Google Sans Mono", monospace' }}>
                {activeResults.fit.actualX.length}
              </span>
            </div>
          </div>

          {/* Micro-grid of fitted parameters */}
          <div style={{
            paddingTop: "10px",
            borderTop: "1px solid var(--surface1)"
          }}>
            <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.6px", color: "var(--subtext0)", fontWeight: 600, marginBottom: "8px" }}>
              Sigmoidal Parameters
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px 10px"
            }}>
              {Object.entries(activeResults.fit.parameters).map(([name, val]) => {
                const cleanName = name.replace("EC50", "EC₅₀").split("(")[0].trim();
                return (
                  <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", borderRadius: "6px", backgroundColor: "color-mix(in srgb, var(--surface1) 40%, transparent)", fontSize: "0.72rem" }}>
                    <span style={{ color: "var(--subtext1)", fontWeight: 500 }}>{cleanName}</span>
                    <span style={{ fontWeight: 600, fontFamily: '"Google Sans Mono", monospace', color: "var(--text)" }}>
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
      <div className="stats-card model-comparison-card" style={{
        margin: 0,
        padding: 0,
        overflow: "visible",
        border: "1px solid var(--surface1)",
        borderRadius: "10px",
        background: "var(--surface0)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)"
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: "color-mix(in srgb, var(--surface1) 50%, var(--surface0))",
          borderBottom: "1px solid var(--surface1)",
          borderTopLeftRadius: "9px",
          borderTopRightRadius: "9px",
          padding: "10px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <h3 style={{ margin: 0, color: "var(--text)", fontSize: "0.78rem", letterSpacing: "0.2px", fontWeight: 700 }}>
              Model Selection
            </h3>
          </div>
          <button
            onClick={() => setFitMethod("auto")}
            style={{
              padding: "3px 10px",
              borderRadius: "9999px",
              fontSize: "0.68rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              border: fitMethod === "auto" ? "1px solid var(--green)" : "1px solid var(--surface2)",
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

        <div className="comparison-table-wrapper" style={{ overflowX: "auto" }}>
          <table className="comparison-table" style={{ margin: 0, width: "100%", fontSize: "0.72rem" }}>
            <thead>
              <tr>
                <th style={{ padding: "8px 12px" }}>Model</th>
                <th style={{ padding: "8px 12px" }}>R²</th>
                <th style={{ padding: "8px 12px" }}>AICc</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(activeResults.comparison.fits).map(([method, fit]) => {
                const isSelected = activeResults.fit.method === method;
                const isBetter = activeResults.comparison.betterMethod === method;
                return (
                  <tr 
                    key={method} 
                    className={`${isSelected ? "selected-row" : ""} ${isBetter ? "better-row" : ""}`}
                    onClick={() => setFitMethod(method as any)}
                    style={{
                      cursor: "pointer",
                      transition: "all 0.15s ease-in-out",
                      backgroundColor: isSelected ? "color-mix(in srgb, var(--blue) 12%, var(--surface0))" : "transparent"
                    }}
                    title={`Click to select ${method.toUpperCase()} model`}
                  >
                    <td style={{ padding: "8px 12px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>{method.toUpperCase()}</span>
                      {isBetter && (
                        <span style={{
                          fontSize: "0.62rem",
                          fontWeight: 700,
                          backgroundColor: "color-mix(in srgb, var(--green) 14%, transparent)",
                          color: "var(--green)",
                          border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)",
                          padding: "1px 6px",
                          borderRadius: "4px"
                        }}>
                          Best Fit
                        </span>
                      )}
                      {isSelected && (
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--blue)" }} title="Active model" />
                      )}
                    </td>
                    <td style={{ padding: "8px 12px" }}>{fit.metrics.r2.toFixed(4)}</td>
                    <td style={{ padding: "8px 12px", color: isBetter ? "var(--green)" : "inherit", fontWeight: isBetter ? "bold" : "normal" }}>
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
      <div className="stats-card" style={{
        margin: 0,
        padding: 0,
        overflow: "visible",
        border: "1px solid var(--surface1)",
        borderRadius: "10px",
        background: "var(--surface0)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)"
      }}>
        <div 
          onClick={() => setShowStats(!showStats)}
          style={{
            backgroundColor: "color-mix(in srgb, var(--surface1) 50%, var(--surface0))",
            borderBottom: showStats ? "1px solid var(--surface1)" : "none",
            borderTopLeftRadius: "9px",
            borderTopRightRadius: "9px",
            borderBottomLeftRadius: showStats ? "0" : "9px",
            borderBottomRightRadius: showStats ? "0" : "9px",
            padding: "10px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            userSelect: "none"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--peach)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12h20M2 12l5-5m-5 5 5 5" />
            </svg>
            <h3 style={{ margin: 0, color: "var(--text)", fontSize: "0.78rem", letterSpacing: "0.2px", fontWeight: 700 }}>
              Statistical Limits & Noise
            </h3>
          </div>
          <span style={{ fontSize: "0.7rem", transform: showStats ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", color: "var(--subtext0)" }}>▶</span>
        </div>

        {showStats && (
          <div className="fade-in" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div className="stat-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
              <span className="stat-label-wrap" data-tooltip="Decision Limit (LC): Signal threshold above which response is statistically distinct from noise (α=0.05)." title="Decision Limit (LC): Signal threshold above which response is statistically distinct from noise (α=0.05).">
                <span className="stat-label" style={{ color: "var(--subtext1)" }}>Critical Level (L<sub>C</sub>)</span>
              </span>
              <span className="stat-value" style={{ color: "var(--peach)", fontWeight: 700, fontFamily: '"Google Sans Mono", monospace' }}>{activeResults.lc.toFixed(4)}</span>
            </div>
            <div className="stat-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
              <span className="stat-label-wrap" data-tooltip="Detection Limit Signal (LD): Signal level ensuring 95% detection probability above LC (β=0.05)." title="Detection Limit Signal (LD): Signal level ensuring 95% detection probability above LC (β=0.05).">
                <span className="stat-label" style={{ color: "var(--subtext1)" }}>Signal Limit (L<sub>D</sub>)</span>
              </span>
              <span className="stat-value" style={{ color: "var(--green)", fontWeight: 700, fontFamily: '"Google Sans Mono", monospace' }}>{activeResults.ld.toFixed(4)}</span>
            </div>
            <div className="stat-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}><span className="stat-label" style={{ color: "var(--subtext1)" }}>Blank Mean</span><span className="stat-value" style={{ fontFamily: '"Google Sans Mono", monospace' }}>{activeResults.meanBlank.toFixed(4)}</span></div>
            <div className="stat-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}><span className="stat-label" style={{ color: "var(--subtext1)" }}>Blank SD</span><span className="stat-value" style={{ fontFamily: '"Google Sans Mono", monospace' }}>{activeResults.sdBlank.toFixed(4)}</span></div>
            <div className="stat-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}><span className="stat-label" style={{ color: "var(--subtext1)" }}>Pooled Replicate SD</span><span className="stat-value" style={{ fontFamily: '"Google Sans Mono", monospace' }}>{activeResults.sdPooled.toFixed(4)}</span></div>
            {activeResults.isDecreasing && (
              <div className="stat-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                <span className="stat-label" style={{ color: "var(--subtext1)" }}>Assay Mode</span>
                <span className="stat-value" style={{ color: "var(--mauve)", fontWeight: "bold" }}>Competitive / Decreasing</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 4: UNIFIED MODERN ACTION BUTTONS */}
      <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
        <button 
          onClick={handleCopyMetrics} 
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "8px",
            backgroundColor: "var(--surface1)",
            color: "var(--text)",
            fontWeight: 600,
            border: "1px solid var(--surface2)",
            cursor: "pointer",
            fontSize: "0.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            transition: "all 0.15s ease-in-out"
          }}
          title="Copy analytics report as Markdown"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy Report
        </button>
        <button 
          onClick={handleExportCSV} 
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "8px",
            backgroundColor: "var(--green)",
            color: "var(--base)",
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            fontSize: "0.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            boxShadow: "0 2px 8px color-mix(in srgb, var(--green) 35%, transparent)",
            transition: "all 0.15s ease-in-out"
          }}
          title="Download experimental audit as CSV"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
      </div>

    </div>
  );
};
