import React, { useRef, useState, useEffect } from "react";
import { type DemoPreset, APP_VERSION } from "../constants";

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
  const [showImportHelp, setShowImportHelp] = useState(false);
  const helpContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showImportHelp) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (helpContainerRef.current && !helpContainerRef.current.contains(e.target as Node)) {
        setShowImportHelp(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowImportHelp(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showImportHelp]);

  return (
    <>
      <header className="app-header">
        <div className="header-brand">
          <div className="header-logo-icon">
            <svg viewBox="0 0 32 32" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M 4,4 L 4,28 L 28,28" stroke="#6c7086" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
              <defs>
                <linearGradient id="headerLogoGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fab387" />
                  <stop offset="50%" stopColor="#cba6f7" />
                  <stop offset="100%" stopColor="#89b4fa" />
                </linearGradient>
              </defs>
              <path d="M 5,25 C 14,25 12,7 27,7" stroke="url(#headerLogoGrad)" strokeWidth="3" strokeLinecap="round" fill="none" />
              <circle cx="8" cy="24" r="1.5" fill="#f38ba8" />
              <circle cx="12" cy="22" r="1.5" fill="#f38ba8" />
              <circle cx="16" cy="16" r="1.5" fill="#f38ba8" />
              <circle cx="20" cy="10" r="1.5" fill="#f38ba8" />
              <circle cx="24" cy="8" r="1.5" fill="#f38ba8" />
            </svg>
          </div>
          <div className="header-title-wrap">
            <h1 className="header-title">Bioassay LOD Fitter</h1>
            <span className="header-version-pill">v{APP_VERSION}</span>
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
            <div className="help-button-container" ref={helpContainerRef}>
              <button
                type="button"
                className={`help-info-btn ${showImportHelp ? "active" : ""}`}
                onClick={() => setShowImportHelp(prev => !prev)}
                aria-label="CSV and TSV file import instructions and formatting guide"
                title="CSV/TSV Import Guide & Tips"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </button>

              {showImportHelp && (
                <div className="help-popover-card" role="tooltip">
                  <div className="help-popover-header">
                    <span className="help-popover-title">CSV & TSV Import Guide</span>
                    <button 
                      type="button" 
                      className="help-popover-close" 
                      onClick={() => setShowImportHelp(false)}
                      aria-label="Close guide"
                    >
                      ×
                    </button>
                  </div>
                  <div className="help-popover-body">
                    <div className="help-rule-item">
                      <span className="rule-badge">Col 1</span>
                      <div><strong>Concentrations:</strong> Standard concentrations (numeric). For blanks, use <code>0</code>, <code>blank</code>, or <code>blanks</code>.</div>
                    </div>
                    <div className="help-rule-item">
                      <span className="rule-badge">Col 2+</span>
                      <div><strong>Signals:</strong> Direct detector readings per row (separated by commas or tabs).</div>
                    </div>
                    <div className="help-rule-item">
                      <span className="rule-badge">Multi</span>
                      <div><strong>Multi-Series:</strong> Columns like <code>Series1_Rep1</code>, <code>Series2_Rep1</code> or stacked rows with a <code>Series</code> column are parsed automatically.</div>
                    </div>
                    <div className="help-rule-item">
                      <span className="rule-badge">Tip</span>
                      <div><strong>Drag & Drop:</strong> You can drop any <code>.csv</code> or <code>.tsv</code> file anywhere onto the page!</div>
                    </div>
                  </div>
                  <div className="help-popover-footer">
                    <span>Need a reference template?</span>
                    <button
                      type="button"
                      className="help-popover-action"
                      onClick={() => {
                        handleDownloadTemplate();
                        setShowImportHelp(false);
                      }}
                    >
                      Download Template
                    </button>
                  </div>
                </div>
              )}
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
