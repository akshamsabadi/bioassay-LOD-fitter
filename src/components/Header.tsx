import React, { useRef } from 'react';
import { type AdvancedLoDResult } from '../utils/calculations';

interface HeaderProps {
  theme: 'dark' | 'light';
  subtheme: string;
  setSubtheme: (subtheme: string) => void;
  toggleTheme: () => void;
  handleClearData: () => void;
  handleLoadDemo: () => void;
  demoName: string;
  handleImportCSV: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDownloadTemplate: () => void;
  handleExportCSV: () => void;
  results: AdvancedLoDResult | null;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  subtheme,
  setSubtheme,
  toggleTheme,
  handleClearData,
  handleLoadDemo,
  demoName,
  handleImportCSV,
  handleDownloadTemplate,
  handleExportCSV,
  results,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="app-header">
      <div className="header-content">
        <h1>Bioassay LOD Fitter v0.5.18</h1>
        <p className="header-description">Sigmoidal fitting with LOD validation.</p>
      </div>
      
      <div className="toolbar-container">
        {/* SECTION 1: DATA PRESETS */}
        <div className="toolbar-section" title="Data Presets">
          <span className="toolbar-section-label">Data</span>
          <button className="toolbar-btn" onClick={handleClearData} title="Clear all input standard and blank data">Clear Data</button>
          <button className="toolbar-btn primary-btn" onClick={handleLoadDemo} title={"Load the next experimental dataset preset: " + demoName}>Load Demo</button>
        </div>

        {/* SECTION 2: CSV ACTIONS */}
        <div className="toolbar-section" title="CSV Actions">
          <span className="toolbar-section-label">CSV</span>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportCSV}
            style={{ display: 'none' }}
            accept=".csv"
          />
          <button className="toolbar-btn" onClick={handleDownloadTemplate} title="Download a pre-formatted CSV template with demo data">Template</button>
          <button className="toolbar-btn" onClick={() => fileInputRef.current?.click()} title="Import standards and blanks from CSV file">Import</button>
          <div
            className="help-tooltip"
            data-tooltip="CSV IMPORT FORMAT RULES:&#10;1. First column must be the Concentration (numeric value).&#10;2. Use 0, 'blank', or 'blanks' to specify blank rows.&#10;3. Subsequent columns are your measured signal replicates.&#10;4. Any row starting with '#' is ignored as a comment.&#10;&#10;Click 'Template' to download an example!"
            style={{
              fontSize: '11px',
              color: 'var(--subtext0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              border: '1px solid var(--surface2)',
              backgroundColor: 'var(--surface0)',
              fontWeight: 'bold',
              userSelect: 'none',
              cursor: 'help'
            }}
          >
            ?
          </div>
          {results && (
            <button className="toolbar-btn success-btn" onClick={handleExportCSV} title="Export raw data and analysis results as CSV">Export Report</button>
          )}
        </div>

        {/* SECTION 3: THEME SETTINGS */}
        <div className="toolbar-section" title="Theme Settings">
          <span className="toolbar-section-label">Theme</span>
          <select
            value={subtheme}
            onChange={e => setSubtheme(e.target.value)}
            className="toolbar-select"
            title="Choose your preferred Observable theme style"
          >
            {theme === 'dark' ? (
              <>
                <option value="slate">Slate</option>
                <option value="midnight">Midnight</option>
                <option value="deep-space">Deep Space</option>
                <option value="ink">Ink</option>
              </>
            ) : (
              <>
                <option value="air">Air</option>
                <option value="cotton">Cotton</option>
                <option value="glacier">Glacier</option>
                <option value="parchment">Parchment</option>
              </>
            )}
          </select>
          <div className="theme-toggle-pill" onClick={toggleTheme} title="Toggle Light/Dark Mode">
            <span className={`toggle-track ${theme}`}>
              <span className="toggle-thumb">
                {theme === 'dark' ? '🌙' : '☀️'}
              </span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
