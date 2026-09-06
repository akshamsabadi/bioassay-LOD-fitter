import React, { useRef, useState } from "react";
import { type DemoPreset } from "../constants";

interface HeaderProps {
  theme: "dark" | "light";
  toggleTheme: () => void;
  handleClearData: () => void;
  presets: DemoPreset[];
  selectedPresetIndex: number;
  onSelectPreset: (index: number) => void;
  handleImportCSV: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDownloadTemplate: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  toggleTheme,
  handleClearData,
  presets,
  selectedPresetIndex,
  onSelectPreset,
  handleImportCSV,
  handleDownloadTemplate,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
    <>
      <header className="app-header">
        <div className="header-content">
          <h1 style={{ margin: 0, fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "8px" }}>
            Bioassay LOD Fitter
            <span style={{ fontSize: "0.65rem", padding: "2px 6px", backgroundColor: "var(--surface2)", borderRadius: "10px", color: "var(--subtext1)", fontWeight: "normal", fontFamily: "monospace" }}>v0.6.29</span>
          </h1>
        </div>
        
        <div className="toolbar-container">
          {/* SECTION 1: DATA PRESETS */}
          <div className="toolbar-section" title="Data Presets">
            <span className="toolbar-section-label">Presets</span>
            <select
              className="toolbar-select"
              value={selectedPresetIndex}
              onChange={(e) => onSelectPreset(Number(e.target.value))}
              title="Select a preconfigured standard curve or multi-curve panel"
              style={{ maxWidth: "210px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}
            >
              {presets.map((preset, idx) => (
                <option key={idx} value={idx}>
                  {preset.name}
                </option>
              ))}
            </select>
            <button 
              className="toolbar-btn" 
              onClick={() => setShowClearConfirm(true)} 
              title="Clear all input standard and blank data" 
              style={{ padding: "0 10px", fontSize: "0.75rem", color: "var(--red)" }}
            >
              Clear
            </button>
          </div>

          {/* SECTION 2: CSV ACTIONS */}
          <div className="toolbar-section" title="CSV & Spreadsheet Actions">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportCSV}
              style={{ display: "none" }}
              accept=".csv,.tsv,.txt"
            />
            <button className="toolbar-btn" onClick={handleDownloadTemplate} title="Download a pre-formatted CSV template with demo data" style={{ padding: "0 10px", fontSize: "0.75rem" }}>Template ↓</button>
            <button className="toolbar-btn" onClick={() => fileInputRef.current?.click()} title="Import standards and blanks from CSV or TSV file" style={{ padding: "0 10px", fontSize: "0.75rem" }}>Import ↑</button>
            <div
              className="help-tooltip"
              data-tooltip="SPREADSHEET / CSV IMPORT RULES:&#10;1. Column 1: Concentration (numeric).&#10;2. Use 0, 'blank', or 'blanks' for blanks.&#10;3. Columns 2+: Replicate signal readings.&#10;4. You can drag and drop any CSV/TSV file anywhere onto the page!&#10;&#10;Click 'Template' to download an example."
              style={{
                fontSize: "11px",
                color: "var(--subtext0)",
                justifyContent: "center",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                border: "1px solid var(--surface2)",
                backgroundColor: "var(--surface0)",
                fontWeight: "bold",
                userSelect: "none",
                cursor: "help"
              }}
            >
              ?
            </div>
          </div>

          {/* SECTION 3: THEME TOGGLE */}
          <div className="toolbar-section" title="Toggle Light/Dark Theme">
            <div className="theme-toggle-pill" onClick={toggleTheme} title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}>
              <span className={`toggle-track ${theme}`}>
                <span className="toggle-thumb">
                  {theme === "dark" ? "🌙" : "☀️"}
                </span>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* CONFIRMATION MODAL FOR CLEAR DATA */}
      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "380px" }}>
            <div className="modal-header">
              <h3 style={{ color: "var(--red)", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>⚠️</span> Clear Assay Data?
              </h3>
              <button className="modal-close-btn" onClick={() => setShowClearConfirm(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--subtext0)", lineHeight: 1.5 }}>
                Are you sure you want to clear the blanks and standards for the active curve? Any unsaved entries will be lost.
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="toolbar-btn" 
                onClick={() => setShowClearConfirm(false)}
                style={{ padding: "0 14px", height: "32px" }}
              >
                Cancel
              </button>
              <button 
                className="toolbar-btn" 
                onClick={() => {
                  handleClearData();
                  setShowClearConfirm(false);
                }}
                style={{
                  backgroundColor: "var(--red)",
                  color: "#fff",
                  borderColor: "var(--red)",
                  padding: "0 14px",
                  height: "32px"
                }}
              >
                Clear Data
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
