import React from "react";
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
}) => {
  const activeSeries = seriesList.find(s => s.id === activeSeriesId) || seriesList[0];

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

  return (
    <aside className="sidebar" onPaste={handleGlobalPaste}>
      
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
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: s.color, display: "inline-block" }} />
                <span>{s.name}</span>
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
                  {s.visible ? "👁" : "🕶"}
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
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: activeSeries.color }} />
          <span className="section-title" style={{ color: "var(--peach)", margin: 0 }}>
            {activeSeries.name} Blanks (0 Conc)
          </span>
        </div>
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
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: activeSeries.color }} />
            <span className="section-title" style={{ color: "var(--green)", margin: 0 }}>
              {activeSeries.name} Standards
            </span>
          </div>
          <span style={{ fontSize: "0.68rem", color: "var(--subtext0)" }} title="Paste from Excel or Google Sheets (Ctrl+V)">
            📋 Excel paste supported
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
                  border: "1px solid var(--surface1)",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}>
                  <div style={{
                    backgroundColor: "color-mix(in srgb, var(--pink) 12%, var(--surface0))",
                    borderBottom: "1.5px solid color-mix(in srgb, var(--pink) 50%, var(--surface1))",
                    padding: "4px 8px",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: "var(--pink)",
                    letterSpacing: "0.6px",
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    <span>⚠️</span> QUALITY ADVISORY
                  </div>
                  <div style={{ padding: "8px 10px", lineHeight: "1.4" }}>
                    {warning}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              fontSize: "0.72rem",
              color: "var(--text)",
              backgroundColor: "var(--surface0)",
              borderRadius: "6px",
              overflow: "hidden",
              border: "1px solid var(--surface1)",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
              <div style={{
                backgroundColor: "color-mix(in srgb, var(--green) 12%, var(--surface0))",
                borderBottom: "1.5px solid color-mix(in srgb, var(--green) 50%, var(--surface1))",
                padding: "4px 8px",
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "var(--green)",
                letterSpacing: "0.6px",
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}>
                <span>✓</span> QUALITY VERIFICATION
              </div>
              <div style={{ padding: "8px 10px", lineHeight: "1.4" }}>
                All quality checks passed for this curve.
              </div>
            </div>
          )}
        </section>
      )}
    </aside>
  );
};
