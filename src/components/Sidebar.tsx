import React from "react";
import { type AdvancedLoDResult } from "../utils/calculations";
import { parseCSVData } from "../utils/csvParser";

export interface StandardRow {
  id: string;
  conc: string;
  signals: string;
}

interface SidebarProps {
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
  onRemoveLast?: () => void;
  onRemoveRow: (id: string) => void;
  hoveredPoint: { id: string; y: number; cx: number; cy: number; conc: number | string } | null;
  setTableHoveredRowId: (id: string | null) => void;
  results: AdvancedLoDResult | null;
  qualityChecks: string[] | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
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
}) => {
  // Global table paste handler: supports copying directly from Excel or Google Sheets
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

  return (
    <aside className="sidebar" onPaste={handleGlobalPaste}>
      
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
        <span className="section-title" style={{ color: "var(--peach)", marginBottom: "8px" }}>Blanks (0 Conc)</span>
        <div className="data-row"
             onMouseEnter={() => setTableHoveredRowId("blank")}
             onMouseLeave={() => setTableHoveredRowId(null)}
             style={{ paddingRight: "16px" }}>
          <div className="conc-input disabled" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: hoveredPoint?.id === "blank" ? "var(--pink)" : "var(--overlay0)" }}>0</div>
          <div style={{ position: "relative", flex: 1 }}>
            <input
              type="text"
              className="signals-input"
              placeholder="e.g. 0.08, 0.12, 0.10"
              value={blankSignals}
              onChange={e => setBlankSignals(e.target.value)}
              onPaste={handleBlankPaste}
              style={{ width: "100%", color: hoveredPoint?.id === "blank" ? "transparent" : "var(--text)" }}
            />
            {hoveredPoint?.id === "blank" && (
              <div className="signals-input" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "transparent", borderColor: "transparent", pointerEvents: "none", whiteSpace: "pre", overflow: "hidden" }}>
                {blankSignals.split(/(,)/).map((part, i) => {
                  if (part === ",") return <span key={i} style={{ color: "var(--text)" }}>,</span>;
                  const isTarget = !isNaN(parseFloat(part)) && Math.abs(parseFloat(part.trim()) - hoveredPoint.y) < 1e-8;
                  return <span key={i} style={{ color: isTarget ? "var(--pink)" : "var(--text)", fontWeight: isTarget ? "bold" : "normal" }}>{part}</span>;
                })}
              </div>
            )}
          </div>
        </div>
      </section>
      
      {/* SECTION 3: STANDARDS DATA ENTRY */}
      <section className="sidebar-section" style={{ margin: 0, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
          <span className="section-title" style={{ color: "var(--green)", margin: 0 }}>Standards</span>
          <span style={{ fontSize: "0.68rem", color: "var(--subtext0)" }} title="You can copy a table from Excel or Google Sheets and paste anywhere in the sidebar">
            📋 Paste from Excel/Sheets supported
          </span>
        </div>
        
        <div className="rows-container" style={{ flex: 1, overflowY: "auto", marginBottom: "8px", paddingRight: "16px" }}>
          {standardRows.map((r) => (
            <div key={r.id} className="data-row"
                 onMouseEnter={() => setTableHoveredRowId(r.id)}
                 onMouseLeave={() => setTableHoveredRowId(null)}>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="conc-input"
                  placeholder="Conc"
                  value={r.conc}
                  onChange={e => updateRow(r.id, "conc", e.target.value)}
                  style={{ color: hoveredPoint?.id === r.id ? "var(--pink)" : "var(--text)" }}
                />
              </div>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type="text"
                  className="signals-input"
                  placeholder="Replicate signals (e.g. 0.15, 0.17, 0.16)"
                  value={r.signals}
                  onChange={e => updateRow(r.id, "signals", e.target.value)}
                  onPaste={e => handleSignalPaste(r.id, e)}
                  style={{ width: "100%", color: hoveredPoint?.id === r.id ? "transparent" : "var(--text)" }}
                />
                {hoveredPoint?.id === r.id && (
                  <div className="signals-input" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "transparent", borderColor: "transparent", pointerEvents: "none", whiteSpace: "pre", overflow: "hidden" }}>
                    {r.signals.split(/(,)/).map((part, i) => {
                      if (part === ",") return <span key={i} style={{ color: "var(--text)" }}>,</span>;
                      const isTarget = !isNaN(parseFloat(part)) && Math.abs(parseFloat(part.trim()) - hoveredPoint.y) < 1e-8;
                      return <span key={i} style={{ color: isTarget ? "var(--pink)" : "var(--text)", fontWeight: isTarget ? "bold" : "normal" }}>{part}</span>;
                    })}
                  </div>
                )}
              </div>
              <button className="remove-row-btn" onClick={() => onRemoveRow(r.id)} title="Delete row">×</button>
            </div>
          ))}
        </div>
        
        {/* Modern dashed outline "Add Point" (+) button */}
        <button
          onClick={onAddRow}
          style={{
            width: "calc(100% - 16px)",
            padding: "6px",
            backgroundColor: "transparent",
            border: "1px dashed var(--surface2)",
            borderRadius: "6px",
            color: "var(--subtext0)",
            fontSize: "0.9rem",
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: "2px"
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
          title="Add a new standard concentration point"
        >
          + Add Point
        </button>
      </section>

      {/* SECTION 4: ASSAY DIAGNOSTICS */}
      {results && (
        <section className="sidebar-section" style={{
          margin: 0,
          borderTop: "1px solid var(--surface1)",
          paddingTop: "12px"
        }}>
          <span className="section-title" style={{ color: "var(--pink)", display: "block", marginBottom: "8px" }}>Assay Diagnostics</span>
          {qualityChecks && qualityChecks.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {qualityChecks.map((warning, index) => (
                <div key={index} style={{
                  fontSize: "0.72rem",
                  color: "var(--text)",
                  backgroundColor: "var(--surface0)",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  lineHeight: "1.4",
                  border: "1px solid var(--surface1)",
                  borderLeft: "4px solid var(--pink)",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}>
                  <span style={{ marginRight: "6px" }}>⚠️</span> {warning}
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              fontSize: "0.72rem",
              color: "var(--text)",
              backgroundColor: "var(--surface0)",
              padding: "8px 12px",
              borderRadius: "6px",
              lineHeight: "1.4",
              border: "1px solid var(--surface1)",
              borderLeft: "4px solid var(--green)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
              <span>All quality checks passed successfully!</span>
            </div>
          )}
        </section>
      )}
    </aside>
  );
};
