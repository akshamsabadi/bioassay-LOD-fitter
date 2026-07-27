import React, { useRef } from 'react';

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
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="app-header" style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 24px',
      backgroundColor: 'var(--mantle)',
      borderBottom: '1px solid var(--surface1)',
      gap: '16px',
      flexWrap: 'wrap',
      minHeight: '60px'
    }}>
      <div className="header-content" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Bioassay LOD Fitter
          <span style={{ fontSize: '0.65rem', padding: '2px 6px', backgroundColor: 'var(--surface2)', borderRadius: '10px', color: 'var(--subtext1)', fontWeight: 'normal', fontFamily: 'monospace' }}>v0.6.8</span>
        </h1>
        <p className="header-description" style={{ margin: 0, display: 'none' }}>Sigmoidal fitting with LOD validation.</p>
      </div>
      
      <div className="toolbar-container" style={{ margin: 0, display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* SECTION 1: DATA PRESETS */}
        <div className="toolbar-section" title="Data Presets" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button className="toolbar-btn" onClick={handleClearData} title="Clear all input standard and blank data" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>Clear Data</button>
          <button className="toolbar-btn primary-btn" onClick={handleLoadDemo} title={"Load the next experimental dataset preset: " + demoName} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>Load Demo</button>
        </div>

        {/* SECTION 2: CSV ACTIONS */}
        <div className="toolbar-section" title="CSV Actions" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportCSV}
            style={{ display: 'none' }}
            accept=".csv"
          />
          <button className="toolbar-btn" onClick={handleDownloadTemplate} title="Download a pre-formatted CSV template with demo data" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>Template ↓</button>
          <button className="toolbar-btn" onClick={() => fileInputRef.current?.click()} title="Import standards and blanks from CSV file" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>Import ↑</button>
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
        </div>

        {/* SECTION 3: THEME SETTINGS */}
        <div className="toolbar-section" title="Theme Settings" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <select
            value={subtheme}
            onChange={e => setSubtheme(e.target.value)}
            className="toolbar-select"
            title="Choose your preferred Observable theme style"
            style={{ padding: '4px 8px', fontSize: '0.75rem', height: '28px' }}
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
          <div className="theme-toggle-pill" onClick={toggleTheme} title="Toggle Light/Dark Mode" style={{ height: '24px', width: '48px', padding: '2px' }}>
            <span className={`toggle-track ${theme}`}>
              <span className="toggle-thumb" style={{ fontSize: '10px', height: '18px', width: '18px', lineHeight: '18px' }}>
                {theme === 'dark' ? '🌙' : '☀️'}
              </span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
