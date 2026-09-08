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
        <div className="header-brand">
          <div className="header-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 19c3.5 0 5-6 8-6s4.5 6 10 6" />
              <path d="M3 5c5.5 0 7 12 10 12s4.5-6 8-6" opacity="0.6" strokeDasharray="2 2" />
              <circle cx="11" cy="13" r="2" fill="currentColor" />
            </svg>
          </div>
          <div className="header-title-wrap">
            <h1 className="header-title">Bioassay LOD Fitter</h1>
            <span className="header-version-pill">v0.7.5</span>
          </div>
        </div>
        
        <div className="toolbar-container">
          {/* GROUP 1: PRESETS & CLEAR */}
          <div className="toolbar-pill-group">
            <div style={{ display: "flex", alignItems: "center", paddingLeft: "8px", color: "var(--subtext0)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <select
              className="toolbar-select-pill"
              value={selectedPresetIndex}
              onChange={(e) => onSelectPreset(Number(e.target.value))}
              title="Select a preconfigured standard curve or multi-curve panel"
              style={{ maxWidth: "210px", textOverflow: "ellipsis" }}
            >
              {presets.map((preset, idx) => (
                <option key={idx} value={idx}>
                  {preset.name}
                </option>
              ))}
            </select>
            <button 
              className="toolbar-btn-pill danger" 
              onClick={() => setShowClearConfirm(true)} 
              title="Clear all input standard and blank data"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>Clear</span>
            </button>
          </div>

          {/* GROUP 2: CSV ACTIONS */}
          <div className="toolbar-pill-group">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportCSV}
              style={{ display: "none" }}
              accept=".csv,.tsv,.txt"
            />
            <button 
              className="toolbar-btn-pill" 
              onClick={handleDownloadTemplate} 
              title="Download a pre-formatted CSV template with demo data"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Template</span>
            </button>
            <button 
              className="toolbar-btn-pill" 
              onClick={() => fileInputRef.current?.click()} 
              title="Import standards and blanks from CSV or TSV file"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Import</span>
            </button>
            <div
              className="help-tooltip"
              data-tooltip="SPREADSHEET / CSV IMPORT RULES:&#10;1. Column 1: Concentration (numeric).&#10;2. Use 0, 'blank', or 'blanks' for blanks.&#10;3. Columns 2+: Replicate signal readings.&#10;4. You can drag and drop any CSV/TSV file anywhere onto the page!&#10;&#10;Click 'Template' to download an example."
              style={{
                fontSize: "11px",
                color: "var(--subtext0)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "22px",
                height: "22px",
                borderRadius: "var(--radius-pill)",
                backgroundColor: "var(--surface1)",
                fontWeight: 700,
                userSelect: "none",
                cursor: "help",
                marginRight: "2px"
              }}
            >
              ?
            </div>
          </div>

          {/* GROUP 3: THEME TOGGLE */}
          <div className="theme-toggle-pill" onClick={toggleTheme} title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}>
            <span className={`toggle-track ${theme}`}>
              <span className="toggle-thumb">
                {theme === "dark" ? "🌙" : "☀️"}
              </span>
            </span>
          </div>
        </div>
      </header>

      {/* CONFIRMATION MODAL FOR CLEAR DATA */}
      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "380px" }}>
            <div className="modal-header">
              <h3 style={{ color: "var(--red)", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ 
                  display: "inline-flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  width: "26px", 
                  height: "26px", 
                  borderRadius: "var(--radius-pill)", 
                  backgroundColor: "color-mix(in srgb, var(--red) 14%, transparent)" 
                }}>
                  ⚠️
                </span> 
                Clear Assay Data?
              </h3>
              <button className="modal-close-btn" onClick={() => setShowClearConfirm(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--subtext0)", lineHeight: 1.55 }}>
                Are you sure you want to clear the blanks and standards for the active curve? Any unsaved entries will be lost.
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="action-btn-pill" 
                onClick={() => setShowClearConfirm(false)}
                style={{ padding: "8px 16px", borderRadius: "var(--radius-pill)" }}
              >
                Cancel
              </button>
              <button 
                className="action-btn-pill" 
                onClick={() => {
                  handleClearData();
                  setShowClearConfirm(false);
                }}
                style={{
                  backgroundColor: "var(--red)",
                  color: "#ffffff",
                  borderColor: "transparent",
                  padding: "8px 18px",
                  borderRadius: "var(--radius-pill)",
                  fontWeight: 700,
                  boxShadow: "0 2px 10px rgba(244, 63, 94, 0.3)"
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
