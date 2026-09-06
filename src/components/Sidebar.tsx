import React, { useState } from "react";
import { type AdvancedLoDResult } from "../utils/calculations";
import { parseCSVData } from "../utils/csvParser";
import { type AssaySeries, type StandardRow } from "../constants";

export { type StandardRow };

interface SidebarProps {
  seriesList: AssaySeries[];
  activeSeriesId: string;
  setActiveSeriesId: (id: string) => void;
  onAddSeries: () => void;
  onRemoveSeries: (id: string) => void;
  onToggleSeriesVisibility: (id: string) => void;
  onUpdateSeriesName: (id: string, name: string) => void;

  plotTitle: string;
  setPlotTitle: (val: string) => void;
  xAxisLabel: string;
  setXAxisLabel: (val: string) => void;
  yAxisLabel: string;
  setYAxisLabel: (val: string) => void;

  blankSignals: string;
  setBlankSignals: (val: string) => void;
  standardRows: StandardRow[];
  setStandardRows: React.Dispatch<React.SetStateAction<StandardRow[]>>;
  updateRow: (id: string, field: "conc" | "signals", value: string) => void;
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;

  hoveredPoint: { id: string; y: number; cx: number; cy: number; conc: number | string } | null;
  setTableHoveredRowId: (id: string | null) => void;
  results: AdvancedLoDResult | null;
  qualityChecks: string[] | null;
  isCollapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  seriesList,
  activeSeriesId,
  setActiveSeriesId,
  onAddSeries,
  onRemoveSeries,
  onToggleSeriesVisibility,
  onUpdateSeriesName,

  plotTitle,
  setPlotTitle,
  xAxisLabel,
  setXAxisLabel,
  yAxisLabel,
  setYAxisLabel,

  blankSignals,
  setBlankSignals,
  standardRows,
  setStandardRows,
  updateRow,
  onAddRow,
  onRemoveRow,

  hoveredPoint,
  setTableHoveredRowId,
  results,
  qualityChecks,
  isCollapsed = false,
}) => {
  const activeSeries = seriesList.find(s => s.id === activeSeriesId) || seriesList[0];

  // Serial Dilution Generator State
  const [showDilutionModal, setShowDilutionModal] = useState(false);
  const [dilutionStartConc, setDilutionStartConc] = useState("10");
  const [dilutionFactor, setDilutionFactor] = useState("3");
  const [dilutionSteps, setDilutionSteps] = useState(8);
  const [dilutionDirection, setDilutionDirection] = useState<"dilution" | "serial">("dilution");

  // Replicate Statistics Calculation Helper
  const computeRowStats = (signalsStr: string) => {
    const parts = signalsStr.split(",").map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    if (parts.length === 0) return null;
    const mean = parts.reduce((a, b) => a + b, 0) / parts.length;
    if (parts.length === 1) return { n: 1, mean, sd: 0, cv: 0 };
    const sd = Math.sqrt(parts.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / (parts.length - 1));
    const cv = mean !== 0 ? (sd / Math.abs(mean)) * 100 : 0;
    return { n: parts.length, mean, sd, cv };
  };

  const handleGenerateDilution = () => {
    const start = parseFloat(dilutionStartConc);
    const factor = parseFloat(dilutionFactor);
    if (isNaN(start) || start <= 0 || isNaN(factor) || factor <= 1) {
      alert("Please enter a valid starting concentration (>0) and dilution factor (>1).");
      return;
    }
    const newRows: StandardRow[] = [];
    for (let i = 0; i < dilutionSteps; i++) {
      const val = dilutionDirection === "dilution"
        ? start / Math.pow(factor, i)
        : start * Math.pow(factor, i);
      const formatted = parseFloat(val.toPrecision(4)).toString();
      newRows.push({
        id: Math.random().toString(36).substring(2, 9),
        conc: formatted,
        signals: ""
      });
    }
    // If dilution (decreasing), sort concentrations ascending from low to high
    newRows.sort((a, b) => parseFloat(a.conc) - parseFloat(b.conc));
    setStandardRows(newRows);
    setShowDilutionModal(false);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (index === standardRows.length - 1) {
        onAddRow();
        setTimeout(() => {
          const nextConc = document.getElementById(`conc-input-${index + 1}`);
          nextConc?.focus();
        }, 50);
      } else {
        const nextConc = document.getElementById(`conc-input-${index + 1}`);
        nextConc?.focus();
      }
    }
  };

  // Clipboard paste handler for spreadsheet table data
  const handleGlobalPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    if (!text) return;

    if (text.includes("\t") || text.includes("\n")) {
      const parsed = parseCSVData(text);
      if (parsed.standards.length > 0 || parsed.blankSignals) {
        e.preventDefault();
        if (parsed.blankSignals) {
          setBlankSignals(parsed.blankSignals);
        }
        if (parsed.standards.length > 0) {
          setStandardRows(parsed.standards);
        }
      }
    }
  };

  const handleBlankPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!text) return;

    if (text.includes("\t") || text.includes("\n")) {
      const parsed = parseCSVData(text);
      if (parsed.standards.length > 0) {
        e.preventDefault();
        if (parsed.blankSignals) setBlankSignals(parsed.blankSignals);
        setStandardRows(parsed.standards);
        return;
      }
      const numbers = text.split(/[\t\r\n,;]+/).map(s => s.trim()).filter(s => !isNaN(parseFloat(s)));
      if (numbers.length > 0) {
        e.preventDefault();
        setBlankSignals(numbers.join(", "));
      }
    }
  };

  const handleSignalPaste = (id: string, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!text) return;

    if (text.includes("\t") || text.includes("\n")) {
      const parsed = parseCSVData(text);
      if (parsed.standards.length > 0) {
        e.preventDefault();
        if (parsed.blankSignals) setBlankSignals(parsed.blankSignals);
        setStandardRows(parsed.standards);
        return;
      }
      const numbers = text.split(/[\t\r\n,;]+/).map(s => s.trim()).filter(s => !isNaN(parseFloat(s)));
      if (numbers.length > 0) {
        e.preventDefault();
        updateRow(id, "signals", numbers.join(", "));
      }
    }
  };

  const blankStats = computeRowStats(blankSignals);

  return (
    <>
      <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`} onPaste={handleGlobalPaste}>
        
        {/* SECTION 0: MULTI-CURVE SERIES SELECTOR PILLS */}
        <section className="sidebar-section" style={{ margin: 0, paddingBottom: "10px", borderBottom: "1px solid var(--surface1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span className="section-title" style={{ color: "var(--blue)", margin: 0 }}>Curves / Conditions</span>
            <span style={{ fontSize: "0.68rem", color: "var(--subtext0)" }}>{seriesList.length} {seriesList.length === 1 ? "curve" : "curves"}</span>
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            overflowX: "auto",
            paddingBottom: "4px",
            scrollbarWidth: "thin"
          }}>
            {seriesList.map(s => {
              const isActive = s.id === activeSeriesId;
              return (
                <div 
                  key={s.id}
                  onClick={() => setActiveSeriesId(s.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 8px",
                    borderRadius: "14px",
                    fontSize: "0.72rem",
                    fontWeight: isActive ? 700 : 500,
                    backgroundColor: isActive ? "var(--surface1)" : "var(--surface0)",
                    border: isActive ? `1.5px solid ${s.color}` : "1px solid var(--surface1)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    color: isActive ? "var(--text)" : "var(--subtext0)",
                    transition: "all 0.15s",
                    boxShadow: isActive ? `0 0 6px ${s.color}33` : "none"
                  }}
                  title={`Click to edit ${s.name}`}
                >
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: s.color, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ maxWidth: "110px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleSeriesVisibility(s.id); }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      opacity: s.visible ? 1 : 0.35,
                      fontSize: "0.75rem",
                      lineHeight: 1
                    }}
                    title={s.visible ? "Hide curve on plot" : "Show curve on plot"}
                  >
                    {s.visible ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8-11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    )}
                  </button>
                  {seriesList.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveSeries(s.id); }}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        color: "var(--subtext0)",
                        fontSize: "0.85rem",
                        lineHeight: 1
                      }}
                      title="Delete this curve"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}

            <button
              onClick={onAddSeries}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "14px",
                fontSize: "0.72rem",
                fontWeight: 600,
                backgroundColor: "transparent",
                border: "1px dashed var(--surface2)",
                color: "var(--subtext0)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "var(--blue)";
                e.currentTarget.style.color = "var(--blue)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "var(--surface2)";
                e.currentTarget.style.color = "var(--subtext0)";
              }}
              title="Overlay a new curve series onto the plot"
            >
              + Add Curve
            </button>
          </div>

          {/* Active Curve Rename Input */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--subtext0)", whiteSpace: "nowrap" }}>Curve Label:</span>
            <input
              type="text"
              className="text-input"
              value={activeSeries.name}
              onChange={e => onUpdateSeriesName(activeSeries.id, e.target.value)}
              style={{ flex: 1, padding: "3px 8px", fontSize: "0.75rem", height: "24px" }}
              placeholder="Series Name"
            />
          </div>
        </section>

        {/* SECTION 1: COLLAPSIBLE PLOT LABELS */}
        <section className="sidebar-section" style={{ margin: 0, paddingBottom: "10px", borderBottom: "1px solid var(--surface1)" }}>
          <details style={{ margin: 0, fontSize: "0.8rem" }}>
            <summary style={{
              cursor: "pointer",
              fontWeight: 600,
              color: "var(--subtext0)",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "2px 0"
            }}>
              <span>⚙️ Axis Labels & Title</span>
            </summary>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
              <input 
                type="text" 
                className="text-input" 
                placeholder="Chart Title" 
                value={plotTitle} 
                onChange={e => setPlotTitle(e.target.value)} 
                style={{ width: "100%" }} 
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder="X Axis (Conc)" 
                  value={xAxisLabel} 
                  onChange={e => setXAxisLabel(e.target.value)} 
                  style={{ flex: 1, minWidth: 0 }} 
                />
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder="Y Axis (Signal)" 
                  value={yAxisLabel} 
                  onChange={e => setYAxisLabel(e.target.value)} 
                  style={{ flex: 1, minWidth: 0 }} 
                />
              </div>
            </div>
          </details>
        </section>

        {/* SECTION 2: BLANKS DATA ENTRY */}
        <section className="sidebar-section" style={{ margin: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: activeSeries.color, flexShrink: 0 }} />
              <span className="section-title" style={{ color: "var(--peach)", margin: 0 }}>
                {seriesList.length > 1 ? `${activeSeries.name} Blanks (0 Conc)` : "Assay Blanks (0 Conc)"}
              </span>
            </div>
          </div>
          <div className="data-row-container" style={{ paddingRight: "16px" }}>
            <div className={`data-row ${blankStats && blankStats.cv > 15 ? "has-warning" : ""}`}
                 onMouseEnter={() => setTableHoveredRowId("blank")}
                 onMouseLeave={() => setTableHoveredRowId(null)}>
              <div className="conc-input disabled" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: hoveredPoint?.id === "blank" ? "var(--pink)" : "var(--overlay0)" }}>0</div>
              <input
                type="text"
                className="signals-input"
                placeholder="e.g. 0.08, 0.12, 0.10"
                value={blankSignals}
                onChange={e => setBlankSignals(e.target.value)}
                onPaste={handleBlankPaste}
                style={{ color: hoveredPoint?.id === "blank" ? "var(--pink)" : "var(--text)", borderColor: hoveredPoint?.id === "blank" ? "var(--pink)" : undefined }}
              />
            </div>
            {blankStats && (
              <div className="data-row-meta">
                <span className="row-meta-stat">n={blankStats.n} · μ={blankStats.mean.toFixed(3)}</span>
                <span
                  className={`replicate-stat-badge ${blankStats.cv > 15 ? "cv-warning" : ""}`}
                  title={`Blanks: n=${blankStats.n}\nMean: ${blankStats.mean.toFixed(4)}\nSD: ${blankStats.sd.toFixed(4)}\nCV: ${blankStats.cv.toFixed(1)}%`}
                >
                  {blankStats.n >= 2 ? `CV ${blankStats.cv.toFixed(1)}%` : `n=${blankStats.n}`}
                  {blankStats.cv > 15 && " ⚠️ High Variance"}
                </span>
              </div>
            )}
          </div>
        </section>
        
        {/* SECTION 3: STANDARDS DATA ENTRY */}
        <section className="sidebar-section" style={{ margin: 0, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: activeSeries.color, flexShrink: 0 }} />
              <span className="section-title" style={{ color: "var(--green)", margin: 0 }}>
                {seriesList.length > 1 ? `${activeSeries.name} Standards` : "Assay Standards"}
              </span>
            </div>
            <span style={{ fontSize: "0.68rem", color: "var(--subtext0)" }} title="Paste from Excel or Google Sheets (Ctrl+V)">
              📋 Excel paste
            </span>
          </div>
          
          <div className="rows-container" style={{ flex: 1, overflowY: "auto", marginBottom: "8px", paddingRight: "16px" }}>
            {standardRows.map((r, idx) => {
              const stats = computeRowStats(r.signals);
              const hasHighCV = stats && stats.cv > 15;
              const isHovered = hoveredPoint?.id === r.id;
              return (
                <div key={r.id} className="data-row-container">
                  <div className={`data-row ${hasHighCV ? "has-warning" : ""}`}
                       onMouseEnter={() => setTableHoveredRowId(r.id)}
                       onMouseLeave={() => setTableHoveredRowId(null)}>
                    <input
                      id={`conc-input-${idx}`}
                      type="text"
                      className="conc-input"
                      placeholder="Conc"
                      value={r.conc}
                      onChange={e => updateRow(r.id, "conc", e.target.value)}
                      onKeyDown={e => handleKeyDown(idx, e)}
                      style={{ color: isHovered ? "var(--pink)" : "var(--text)", borderColor: isHovered ? "var(--pink)" : undefined }}
                    />
                    <input
                      id={`signals-input-${idx}`}
                      type="text"
                      className="signals-input"
                      placeholder="Replicates (e.g. 0.15, 0.17, 0.16)"
                      value={r.signals}
                      onChange={e => updateRow(r.id, "signals", e.target.value)}
                      onPaste={e => handleSignalPaste(r.id, e)}
                      onKeyDown={e => handleKeyDown(idx, e)}
                      style={{ color: isHovered ? "var(--pink)" : "var(--text)", borderColor: isHovered ? "var(--pink)" : undefined }}
                    />
                    <button className="remove-row-btn" onClick={() => onRemoveRow(r.id)} title="Delete row">×</button>
                  </div>
                  {stats && (
                    <div className="data-row-meta">
                      <span className="row-meta-stat">n={stats.n} · μ={stats.mean.toFixed(3)}</span>
                      <span
                        className={`replicate-stat-badge ${hasHighCV ? "cv-warning" : ""}`}
                        title={`n=${stats.n}\nMean: ${stats.mean.toFixed(4)}\nSD: ${stats.sd.toFixed(4)}\nCV: ${stats.cv.toFixed(1)}%`}
                      >
                        {stats.n >= 2 ? `CV ${stats.cv.toFixed(1)}%` : `n=${stats.n}`}
                        {hasHighCV && " ⚠️ High Variance"}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div style={{ display: "flex", gap: "8px", width: "calc(100% - 16px)", marginTop: "2px" }}>
            <button
              onClick={onAddRow}
              style={{
                flex: 1,
                padding: "6px",
                backgroundColor: "transparent",
                border: "1px dashed var(--surface2)",
                borderRadius: "6px",
                color: "var(--subtext0)",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "var(--blue)";
                e.currentTarget.style.color = "var(--blue)";
                e.currentTarget.style.backgroundColor = "var(--surface0)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "var(--surface2)";
                e.currentTarget.style.color = "var(--subtext0)";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              title="Add a new standard concentration point (or press Enter)"
            >
              + Add Point
            </button>

            <button
              onClick={() => setShowDilutionModal(true)}
              style={{
                flex: 1,
                padding: "6px",
                backgroundColor: "transparent",
                border: "1px dashed var(--surface2)",
                borderRadius: "6px",
                color: "var(--subtext0)",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "var(--yellow)";
                e.currentTarget.style.color = "var(--yellow)";
                e.currentTarget.style.backgroundColor = "var(--surface0)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "var(--surface2)";
                e.currentTarget.style.color = "var(--subtext0)";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              title="Auto-generate a serial dilution series"
            >
              ⚡ Auto-Dilute
            </button>
          </div>
        </section>

        {/* SERIAL DILUTION GENERATOR MODAL */}
        {showDilutionModal && (
          <div className="modal-overlay" onClick={() => setShowDilutionModal(false)}>
            <div className="modal-dialog" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--yellow)" }}>
                  <span>⚡</span> Serial Dilution Generator
                </h3>
                <button className="modal-close-btn" onClick={() => setShowDilutionModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--subtext0)" }}>
                    Starting Concentration:
                  </label>
                  <input
                    type="number"
                    className="text-input"
                    value={dilutionStartConc}
                    onChange={e => setDilutionStartConc(e.target.value)}
                    placeholder="e.g. 10"
                    step="any"
                  />
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--subtext0)" }}>
                      Dilution Factor:
                    </label>
                    <input
                      type="number"
                      className="text-input"
                      value={dilutionFactor}
                      onChange={e => setDilutionFactor(e.target.value)}
                      placeholder="e.g. 3 for 1:3"
                      step="any"
                      min="1.01"
                    />
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--subtext0)" }}>
                      Number of Steps:
                    </label>
                    <input
                      type="number"
                      className="text-input"
                      value={dilutionSteps}
                      onChange={e => setDilutionSteps(Math.max(3, Math.min(24, parseInt(e.target.value) || 8)))}
                      min="3"
                      max="24"
                    />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--subtext0)" }}>
                    Mode:
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setDilutionDirection("dilution")}
                      style={{
                        flex: 1,
                        padding: "6px 10px",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        border: dilutionDirection === "dilution" ? "1px solid var(--blue)" : "1px solid var(--surface2)",
                        backgroundColor: dilutionDirection === "dilution" ? "color-mix(in srgb, var(--blue) 12%, var(--surface0))" : "var(--surface0)",
                        color: dilutionDirection === "dilution" ? "var(--blue)" : "var(--subtext0)",
                        fontWeight: dilutionDirection === "dilution" ? 700 : 500
                      }}
                    >
                      Serial Dilution (÷ factor)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDilutionDirection("serial")}
                      style={{
                        flex: 1,
                        padding: "6px 10px",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        border: dilutionDirection === "serial" ? "1px solid var(--blue)" : "1px solid var(--surface2)",
                        backgroundColor: dilutionDirection === "serial" ? "color-mix(in srgb, var(--blue) 12%, var(--surface0))" : "var(--surface0)",
                        color: dilutionDirection === "serial" ? "var(--blue)" : "var(--subtext0)",
                        fontWeight: dilutionDirection === "serial" ? 700 : 500
                      }}
                    >
                      Multiplication (× factor)
                    </button>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="toolbar-btn"
                  onClick={() => setShowDilutionModal(false)}
                  style={{ padding: "0 12px", height: "32px" }}
                >
                  Cancel
                </button>
                <button
                  className="toolbar-btn primary-btn"
                  onClick={handleGenerateDilution}
                  style={{ padding: "0 14px", height: "32px" }}
                >
                  Generate Series
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: ASSAY DIAGNOSTICS */}
        {results && (
          <section className="sidebar-section" style={{
            margin: 0,
            borderTop: "1px solid var(--surface1)",
            paddingTop: "12px"
          }}>
            <span className="section-title" style={{ color: "var(--pink)", display: "block", marginBottom: "8px" }}>
              {activeSeries.name} Diagnostics
            </span>
            {qualityChecks && qualityChecks.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {qualityChecks.map((warning, index) => (
                  <div key={index} style={{
                    fontSize: "0.72rem",
                    color: "var(--text)",
                    backgroundColor: "var(--surface0)",
                    borderRadius: "6px",
                    overflow: "hidden",
                    border: "1px solid color-mix(in srgb, var(--peach) 25%, var(--surface1))",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    padding: "8px 10px"
                  }}>
                    <span style={{ fontSize: "0.85rem", lineHeight: 1 }}>⚠️</span>
                    <span style={{ lineHeight: 1.4 }}>{warning}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                fontSize: "0.72rem",
                color: "var(--green)",
                backgroundColor: "var(--surface0)",
                borderRadius: "6px",
                padding: "8px 10px",
                border: "1px solid color-mix(in srgb, var(--green) 25%, var(--surface1))",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}>
                <span>✓</span> All quality metrics within expected ranges.
              </div>
            )}
          </section>
        )}
      </aside>
    </>
  );
};
