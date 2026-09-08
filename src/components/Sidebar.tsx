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
  const [dilutionSteps, setDilutionSteps] = useState<number | string>(8);
  const [dilutionDirection, setDilutionDirection] = useState<"dilution" | "serial">("dilution");

  // Replicate Statistics Calculation Helper
  const computeRowStats = (signalsStr: string) => {
    const parts = signalsStr.split(",").map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    if (parts.length === 0) return null;
    const mean = parts.reduce((a, b) => a + b, 0) / parts.length;
    if (parts.length === 1) return { n: 1, mean, sd: 0, cv: 0 };
    const sd = Math.sqrt(parts.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / (parts.length - 1));
    const cv = Math.abs(mean) > 1e-12 ? (sd / Math.abs(mean)) * 100 : 0;
    return { n: parts.length, mean, sd, cv };
  };

  const handleGenerateDilution = () => {
    const start = parseFloat(dilutionStartConc);
    const factor = parseFloat(dilutionFactor);
    const steps = typeof dilutionSteps === "number" ? dilutionSteps : parseInt(dilutionSteps) || 8;
    if (isNaN(start) || start <= 0 || isNaN(factor) || factor <= 1) {
      alert("Please enter a valid starting concentration (>0) and dilution factor (>1).");
      return;
    }
    const newRows: StandardRow[] = [];
    for (let i = 0; i < steps; i++) {
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
    newRows.sort((a, b) => parseFloat(a.conc) - parseFloat(b.conc));
    setStandardRows(newRows);
    setShowDilutionModal(false);
  };

  const handleConcKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById(`signals-input-${index}`)?.focus();
    }
  };

  const handleSignalKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (index === standardRows.length - 1) {
        onAddRow();
        setTimeout(() => {
          document.getElementById(`conc-input-${index + 1}`)?.focus();
        }, 50);
      } else {
        document.getElementById(`conc-input-${index + 1}`)?.focus();
      }
    }
  };

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

    const lower = text.toLowerCase();
    const isFullTable = (lower.includes("conc") || lower.includes("dose")) && (text.includes("\t") || text.includes("\n"));
    if (isFullTable) {
      const parsed = parseCSVData(text);
      if (parsed.standards.length > 0) {
        e.preventDefault();
        if (parsed.blankSignals) setBlankSignals(parsed.blankSignals);
        setStandardRows(parsed.standards);
        return;
      }
    }

    if (text.includes("\t") || text.includes("\n") || text.includes(";")) {
      const numbers = text.split(/[\t\r\n,;]+/).map(s => s.trim().replace(",", ".")).filter(s => !isNaN(parseFloat(s)));
      if (numbers.length > 0) {
        e.preventDefault();
        setBlankSignals(numbers.join(", "));
      }
    }
  };

  const handleSignalPaste = (id: string, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!text) return;

    const lower = text.toLowerCase();
    const isFullTable = (lower.includes("conc") || lower.includes("dose")) && (text.includes("\t") || text.includes("\n"));
    if (isFullTable) {
      const parsed = parseCSVData(text);
      if (parsed.standards.length > 0) {
        e.preventDefault();
        if (parsed.blankSignals) setBlankSignals(parsed.blankSignals);
        setStandardRows(parsed.standards);
        return;
      }
    }

    if (text.includes("\t") || text.includes("\n") || text.includes(";")) {
      const numbers = text.split(/[\t\r\n,;]+/).map(s => s.trim().replace(",", ".")).filter(s => !isNaN(parseFloat(s)));
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
        <section className="sidebar-section" style={{ margin: 0, paddingBottom: "12px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <span className="section-title">Curves & Conditions</span>
            <span style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: "var(--radius-pill)", backgroundColor: "var(--surface1)", color: "var(--subtext0)" }}>
              {seriesList.length} {seriesList.length === 1 ? "curve" : "curves"}
            </span>
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexWrap: "wrap",
            paddingBottom: "4px"
          }}>
            {seriesList.map(s => {
              const isActive = s.id === activeSeriesId;
              return (
                <div 
                  key={s.id}
                  onClick={() => setActiveSeriesId(s.id)}
                  className={`curve-pill ${isActive ? "active" : ""}`}
                  style={{
                    boxShadow: isActive ? `0 0 0 1.5px ${s.color}` : "none",
                    borderColor: isActive ? "transparent" : undefined
                  }}
                  title={`Click to edit ${s.name}`}
                >
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: s.color, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ maxWidth: "105px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleSeriesVisibility(s.id); }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      opacity: s.visible ? 1 : 0.35,
                      color: "inherit",
                      display: "flex",
                      alignItems: "center"
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
              className="curve-pill"
              style={{
                backgroundColor: "transparent",
                borderStyle: "dashed",
                borderColor: "var(--border-hover)",
                color: "var(--indigo)",
                fontWeight: 600
              }}
              title="Overlay a new curve series onto the plot"
            >
              <span style={{ fontSize: "0.85rem" }}>+</span> Add Curve
            </button>
          </div>

          {/* Active Curve Rename Input */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--subtext0)", whiteSpace: "nowrap" }}>Curve Label:</span>
            <input
              type="text"
              className="text-input"
              value={activeSeries.name}
              onChange={e => onUpdateSeriesName(activeSeries.id, e.target.value)}
              style={{ flex: 1, padding: "5px 10px", fontSize: "0.75rem", height: "28px" }}
              placeholder="Series Name"
            />
          </div>
        </section>

        {/* SECTION 1: AXIS LABELS & TITLE */}
        <section className="sidebar-section" style={{ margin: 0, paddingBottom: "12px", borderBottom: "1px solid var(--border-subtle)" }}>
          <details style={{ margin: 0, fontSize: "0.8rem" }}>
            <summary style={{
              cursor: "pointer",
              fontWeight: 600,
              color: "var(--subtext0)",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 0"
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Axis Labels & Title</span>
            </summary>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
              <input 
                type="text" 
                className="text-input" 
                placeholder="Chart Title" 
                value={plotTitle} 
                onChange={e => setPlotTitle(e.target.value)} 
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

        {/* UNIFIED DATA ENTRY TABLE */}
        <section className="sidebar-section" style={{ margin: 0, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: activeSeries.color, flexShrink: 0 }} />
              <span className="section-title">
                {seriesList.length > 1 ? `${activeSeries.name} Data` : "Calibration Data"}
              </span>
            </div>
            <span style={{ fontSize: "0.68rem", color: "var(--subtext0)", cursor: "help" }} title="Paste table from Excel or Google Sheets (Ctrl+V into any cell)">
              📋 Excel paste
            </span>
          </div>

          {/* Table Column Headers */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center", paddingRight: "16px", marginBottom: "4px" }}>
            <span style={{ width: "62px", fontSize: "0.68rem", fontWeight: 700, color: "var(--subtext0)", textAlign: "center", letterSpacing: "0.04em", userSelect: "none" }}>
              CONC
            </span>
            <span style={{ flex: 1, fontSize: "0.68rem", fontWeight: 700, color: "var(--subtext0)", paddingLeft: "6px", letterSpacing: "0.04em", userSelect: "none" }}>
              REPLICATES (SIGNALS)
            </span>
            <span style={{ width: "24px" }} />
          </div>
          
          <div className="rows-container" style={{ flex: 1, overflowY: "auto", marginBottom: "8px", paddingRight: "6px" }}>
            {/* Blank Row (Conc = 0) */}
            <div
              className={`data-row ${blankStats && blankStats.cv > 15 ? "has-warning" : ""}`}
              onMouseEnter={() => setTableHoveredRowId("blank")}
              onMouseLeave={() => setTableHoveredRowId(null)}
              title={blankStats ? `Blank (0 conc): n=${blankStats.n}, Mean=${blankStats.mean.toFixed(4)}, SD=${blankStats.sd.toFixed(4)}, CV=${blankStats.cv.toFixed(1)}%${blankStats.cv > 15 ? ' (⚠️ High Variance)' : ''}` : "Assay Blank (Conc = 0)"}
            >
              <div
                className="conc-input disabled"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: hoveredPoint?.id === "blank" ? "var(--pink)" : undefined,
                  cursor: "default"
                }}
                title="Blank (0 Conc)"
              >
                0
              </div>
              <input
                type="text"
                className="signals-input"
                placeholder="Blank signals (e.g. 0.08, 0.12)"
                value={blankSignals}
                onChange={e => setBlankSignals(e.target.value)}
                onPaste={handleBlankPaste}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    document.getElementById("conc-input-0")?.focus();
                  }
                }}
                style={{
                  color: hoveredPoint?.id === "blank" ? "var(--pink)" : undefined,
                  borderColor: hoveredPoint?.id === "blank" ? "var(--pink)" : undefined
                }}
                title={blankStats ? `Blanks: n=${blankStats.n} · Mean=${blankStats.mean.toFixed(4)} · CV=${blankStats.cv.toFixed(1)}%${blankStats.cv > 15 ? ' (⚠️ High Variance)' : ''}` : "Enter blank replicates separated by commas"}
              />
              <div style={{ width: "24px", minWidth: "24px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {blankStats && blankStats.cv > 15 && (
                  <span title={`High Variance: Blank CV is ${blankStats.cv.toFixed(1)}% (>15%)`} style={{ fontSize: "0.8rem", cursor: "help", lineHeight: 1 }}>⚠️</span>
                )}
              </div>
            </div>

            {/* Standard Concentration Rows */}
            {standardRows.map((r, idx) => {
              const stats = computeRowStats(r.signals);
              const hasHighCV = stats && stats.cv > 15;
              const isHovered = hoveredPoint?.id === r.id;
              const rowTooltip = stats
                ? `Conc: ${r.conc || "—"} | n=${stats.n}, Mean=${stats.mean.toFixed(4)}, SD=${stats.sd.toFixed(4)}, CV=${stats.cv.toFixed(1)}%${hasHighCV ? ' (⚠️ High Variance)' : ''}`
                : undefined;

              return (
                <div
                  key={r.id}
                  className={`data-row ${hasHighCV ? "has-warning" : ""}`}
                  onMouseEnter={() => setTableHoveredRowId(r.id)}
                  onMouseLeave={() => setTableHoveredRowId(null)}
                  title={rowTooltip}
                >
                  <input
                    id={`conc-input-${idx}`}
                    type="text"
                    className="conc-input"
                    placeholder="Conc"
                    value={r.conc}
                    onChange={e => updateRow(r.id, "conc", e.target.value)}
                    onKeyDown={e => handleConcKeyDown(idx, e)}
                    style={{
                      color: isHovered ? "var(--pink)" : undefined,
                      borderColor: isHovered ? "var(--pink)" : undefined
                    }}
                  />
                  <input
                    id={`signals-input-${idx}`}
                    type="text"
                    className="signals-input"
                    placeholder="Replicates (e.g. 0.15, 0.17, 0.16)"
                    value={r.signals}
                    onChange={e => updateRow(r.id, "signals", e.target.value)}
                    onPaste={e => handleSignalPaste(r.id, e)}
                    onKeyDown={e => handleSignalKeyDown(idx, e)}
                    style={{
                      color: isHovered ? "var(--pink)" : undefined,
                      borderColor: isHovered ? "var(--pink)" : undefined
                    }}
                    title={rowTooltip}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "2px", width: "24px", minWidth: "24px", flexShrink: 0, justifyContent: "flex-end" }}>
                    {hasHighCV && (
                      <span title={`High Variance: CV is ${stats.cv.toFixed(1)}% (>15%)`} style={{ fontSize: "0.8rem", cursor: "help", lineHeight: 1, flexShrink: 0 }}>⚠️</span>
                    )}
                    <button className="remove-row-btn" onClick={() => onRemoveRow(r.id)} title="Delete row">×</button>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div style={{ display: "flex", gap: "8px", width: "100%", marginTop: "4px" }}>
            <button
              onClick={onAddRow}
              className="action-btn-pill"
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--surface0)",
                color: "var(--indigo)",
                fontWeight: 600,
                border: "1px dashed var(--border-hover)",
                fontSize: "0.8rem"
              }}
              title="Add a new standard concentration point (or press Enter)"
            >
              <span style={{ fontSize: "0.9rem" }}>+</span> Add Point
            </button>

            <button
              onClick={() => setShowDilutionModal(true)}
              className="action-btn-pill"
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--surface0)",
                color: "var(--yellow)",
                fontWeight: 600,
                border: "1px dashed var(--border-hover)",
                fontSize: "0.8rem"
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
                <h3 style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--yellow)" }}>
                  <span>⚡</span> Serial Dilution Generator
                </h3>
                <button className="modal-close-btn" onClick={() => setShowDilutionModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--subtext0)" }}>
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

                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--subtext0)" }}>
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
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--subtext0)" }}>
                      Number of Steps:
                    </label>
                    <input
                      type="number"
                      className="text-input"
                      value={dilutionSteps}
                      onChange={e => setDilutionSteps(e.target.value)}
                      onBlur={() => {
                        const parsed = parseInt(String(dilutionSteps), 10);
                        setDilutionSteps(isNaN(parsed) ? 8 : Math.max(3, Math.min(24, parsed)));
                      }}
                      min="3"
                      max="24"
                    />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--subtext0)" }}>
                    Dilution Mode:
                  </label>
                  <div style={{ display: "flex", gap: "8px", backgroundColor: "var(--surface0)", padding: "4px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border-subtle)" }}>
                    <button
                      type="button"
                      onClick={() => setDilutionDirection("dilution")}
                      style={{
                        flex: 1,
                        padding: "6px 12px",
                        borderRadius: "var(--radius-pill)",
                        fontSize: "0.76rem",
                        cursor: "pointer",
                        border: "none",
                        backgroundColor: dilutionDirection === "dilution" ? "var(--surface2)" : "transparent",
                        color: dilutionDirection === "dilution" ? "var(--text)" : "var(--subtext0)",
                        fontWeight: dilutionDirection === "dilution" ? 700 : 500,
                        transition: "all 0.18s ease"
                      }}
                    >
                      Serial Dilution (÷ factor)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDilutionDirection("serial")}
                      style={{
                        flex: 1,
                        padding: "6px 12px",
                        borderRadius: "var(--radius-pill)",
                        fontSize: "0.76rem",
                        cursor: "pointer",
                        border: "none",
                        backgroundColor: dilutionDirection === "serial" ? "var(--surface2)" : "transparent",
                        color: dilutionDirection === "serial" ? "var(--text)" : "var(--subtext0)",
                        fontWeight: dilutionDirection === "serial" ? 700 : 500,
                        transition: "all 0.18s ease"
                      }}
                    >
                      Multiplication (× factor)
                    </button>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="action-btn-pill"
                  onClick={() => setShowDilutionModal(false)}
                  style={{ padding: "8px 16px", borderRadius: "var(--radius-pill)" }}
                >
                  Cancel
                </button>
                <button
                  className="action-btn-pill"
                  onClick={handleGenerateDilution}
                  style={{
                    backgroundColor: "var(--indigo)",
                    color: "#ffffff",
                    borderColor: "transparent",
                    padding: "8px 18px",
                    borderRadius: "var(--radius-pill)",
                    fontWeight: 700,
                    boxShadow: "0 2px 10px rgba(99, 102, 241, 0.35)"
                  }}
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
            borderTop: "1px solid var(--border-subtle)",
            paddingTop: "12px"
          }}>
            <span className="section-title" style={{ color: "var(--subtext0)", display: "block", marginBottom: "4px" }}>
              {activeSeries.name} Diagnostics
            </span>
            {qualityChecks && qualityChecks.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {qualityChecks.map((warning, index) => (
                  <div key={index} style={{
                    fontSize: "0.74rem",
                    color: "var(--text)",
                    backgroundColor: "color-mix(in srgb, var(--peach) 8%, var(--surface0))",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid color-mix(in srgb, var(--peach) 25%, transparent)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    padding: "8px 12px"
                  }}>
                    <span style={{ fontSize: "0.85rem", lineHeight: 1 }}>⚠️</span>
                    <span style={{ lineHeight: 1.4 }}>{warning}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                fontSize: "0.74rem",
                color: "var(--green)",
                backgroundColor: "color-mix(in srgb, var(--green) 8%, var(--surface0))",
                borderRadius: "var(--radius-sm)",
                padding: "8px 12px",
                border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span style={{ fontWeight: "bold" }}>✓</span>
                <span>All quality metrics within expected ranges.</span>
              </div>
            )}
          </section>
        )}
      </aside>
    </>
  );
};
