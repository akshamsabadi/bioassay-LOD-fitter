import React, { useRef } from "react";

interface HeaderProps {
  theme: "dark" | "light";
  toggleTheme: () => void;
  handleClearData: () => void;
  handleLoadDemo: () => void;
  demoName: string;
  handleImportCSV: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDownloadTemplate: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  toggleTheme,
  handleClearData,
  handleLoadDemo,
  demoName,
  handleImportCSV,
  handleDownloadTemplate,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="app-header">
      <div className="header-content">
        <h1 style={{ margin: 0, fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "8px" }}>
          Bioassay LOD Fitter
          <span style={{ fontSize: "0.65rem", padding: "2px 6px", backgroundColor: "var(--surface2)", borderRadius: "10px", color: "var(--subtext1)", fontWeight: "normal", fontFamily: "monospace" }}>v0.6.19</span>
        </h1>
      </div>
      
      <div className="toolbar-container">
        {/* SECTION 1: DATA PRESETS */}
        <div className="toolbar-section" title="Data Presets">
          <button className="toolbar-btn" onClick={handleClearData} title="Clear all input standard and blank data" style={{ padding: "6px 12px", fontSize: "0.75rem" }}>Clear Data</button>
          <button className="toolbar-btn primary-btn" onClick={handleLoadDemo} title={"Load next experimental dataset: " + demoName} style={{ padding: "6px 12px", fontSize: "0.75rem" }}>Load Demo</button>
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
          <button className="toolbar-btn" onClick={handleDownloadTemplate} title="Download a pre-formatted CSV template with demo data" style={{ padding: "6px 12px", fontSize: "0.75rem" }}>Template ↓</button>
          <button className="toolbar-btn" onClick={() => fileInputRef.current?.click()} title="Import standards and blanks from CSV or TSV file" style={{ padding: "6px 12px", fontSize: "0.75rem" }}>Import ↑</button>
          <div
            className="help-tooltip"
            data-tooltip="SPREADSHEET / CSV IMPORT RULES:&#10;1. Column 1: Concentration (numeric).&#10;2. Use 0, 'blank', or 'blanks' for blanks.&#10;3. Columns 2+: Replicate signal readings.&#10;4. You can also paste directly from Excel or Google Sheets (Ctrl+V / Cmd+V) into the sidebar!&#10;&#10;Click 'Template' to download an example."
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
  );
};
