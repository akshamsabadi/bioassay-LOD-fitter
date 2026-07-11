import React from 'react';
import { type AdvancedLoDResult } from '../utils/calculations';

export interface StandardRow {
  id: string;
  conc: string;
  signals: string;
}

interface SidebarProps {
  fitMethod: 'linear' | 'langmuir' | '4pl' | '5pl' | 'auto';
  setFitMethod: (val: 'linear' | 'langmuir' | '4pl' | '5pl' | 'auto') => void;
  plotTitle: string;
  setPlotTitle: (val: string) => void;
  xAxisLabel: string;
  setXAxisLabel: (val: string) => void;
  yAxisLabel: string;
  setYAxisLabel: (val: string) => void;
  blankSignals: string;
  setBlankSignals: (val: string) => void;
  standardRows: StandardRow[];
  updateRow: (id: string, field: 'conc' | 'signals', value: string) => void;
  onAddRow: () => void;
  onRemoveLast: () => void;
  onRemoveRow: (id: string) => void;
  hoveredPoint: { id: string; y: number; cx: number; cy: number; conc: number | string } | null;
  setTableHoveredRowId: (id: string | null) => void;
  results: AdvancedLoDResult | null;
  qualityChecks: string[] | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  fitMethod,
  setFitMethod,
  plotTitle,
  setPlotTitle,
  xAxisLabel,
  setXAxisLabel,
  yAxisLabel,
  setYAxisLabel,
  blankSignals,
  setBlankSignals,
  standardRows,
  updateRow,
  onAddRow,
  onRemoveLast,
  onRemoveRow,
  hoveredPoint,
  setTableHoveredRowId,
  results,
  qualityChecks,
}) => {
  return (
    <aside className="sidebar">
      <section className="sidebar-section">
        <span className="section-title" style={{ color: 'var(--mauve)' }}>Model Options</span>
        <select value={fitMethod} onChange={e => setFitMethod(e.target.value as any)} className="method-select">
          <option value="auto">Automatic (AICc Optimised)</option>
          <option value="linear">Linear</option>
          <option value="langmuir">Langmuir</option>
          <option value="4pl">4-Parameter Logistic (4PL)</option>
          <option value="5pl">5-Parameter Logistic (5PL)</option>
        </select>
      </section>
      
      <section className="sidebar-section">
        <span className="section-title" style={{ color: 'var(--sapphire)' }}>Plot Settings</span>
        <div className="input-group">
          <input type="text" className="text-input" placeholder="Title" value={plotTitle} onChange={e => setPlotTitle(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="text" className="text-input" placeholder="X Axis" value={xAxisLabel} onChange={e => setXAxisLabel(e.target.value)} />
          <input type="text" className="text-input" placeholder="Y Axis" value={yAxisLabel} onChange={e => setYAxisLabel(e.target.value)} />
        </div>
      </section>
      
      <section className="sidebar-section">
        <span className="section-title" style={{ color: 'var(--peach)' }}>Blanks</span>
        <div className="data-row"
             onMouseEnter={() => setTableHoveredRowId('blank')}
             onMouseLeave={() => setTableHoveredRowId(null)}>
          <div className="conc-input disabled" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: hoveredPoint?.id === 'blank' ? 'var(--pink)' : 'var(--overlay0)' }}>0</div>
          <div style={{ position: 'relative', flex: 1 }}>
            <input type="text" className="signals-input" placeholder="Comma separated..." value={blankSignals} onChange={e => setBlankSignals(e.target.value)} style={{ width: '100%', color: hoveredPoint?.id === 'blank' ? 'transparent' : 'var(--text)' }} />
            {hoveredPoint?.id === 'blank' && (
              <div className="signals-input" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'transparent', borderColor: 'transparent', pointerEvents: 'none', whiteSpace: 'pre', overflow: 'hidden' }}>
                {blankSignals.split(/(,)/).map((part, i) => {
                  if (part === ',') return <span key={i} style={{ color: 'var(--text)' }}>,</span>;
                  const isTarget = !isNaN(parseFloat(part)) && Math.abs(parseFloat(part.trim()) - hoveredPoint.y) < 1e-8;
                  return <span key={i} style={{ color: isTarget ? 'var(--pink)' : 'var(--text)', fontWeight: isTarget ? 'bold' : 'normal' }}>{part}</span>;
                })}
              </div>
            )}
          </div>
        </div>
      </section>
      
      <section className="sidebar-section">
        <span className="section-title" style={{ color: 'var(--green)' }}>Standards</span>
        <div className="rows-container">
          {standardRows.map((r) => (
            <div key={r.id} className="data-row"
                 onMouseEnter={() => setTableHoveredRowId(r.id)}
                 onMouseLeave={() => setTableHoveredRowId(null)}>
              <div style={{ position: 'relative' }}>
                <input type="text" className="conc-input" placeholder="Conc" value={r.conc} onChange={e => updateRow(r.id, 'conc', e.target.value)} style={{ color: hoveredPoint?.id === r.id ? 'var(--pink)' : 'var(--text)' }} />
              </div>
              <div style={{ position: 'relative', flex: 1 }}>
                <input type="text" className="signals-input" placeholder="Signals..." value={r.signals} onChange={e => updateRow(r.id, 'signals', e.target.value)} style={{ width: '100%', color: hoveredPoint?.id === r.id ? 'transparent' : 'var(--text)' }} />
                {hoveredPoint?.id === r.id && (
                  <div className="signals-input" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'transparent', borderColor: 'transparent', pointerEvents: 'none', whiteSpace: 'pre', overflow: 'hidden' }}>
                    {r.signals.split(/(,)/).map((part, i) => {
                      if (part === ',') return <span key={i} style={{ color: 'var(--text)' }}>,</span>;
                      const isTarget = !isNaN(parseFloat(part)) && Math.abs(parseFloat(part.trim()) - hoveredPoint.y) < 1e-8;
                      return <span key={i} style={{ color: isTarget ? 'var(--pink)' : 'var(--text)', fontWeight: isTarget ? 'bold' : 'normal' }}>{part}</span>;
                    })}
                  </div>
                )}
              </div>
              <button className="remove-row-btn" onClick={() => onRemoveRow(r.id)}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="add-row-btn" style={{ flex: 1 }} onClick={onAddRow}>+ Add Point</button>
          {standardRows.length > 1 && (
            <button className="remove-last-btn" style={{ flex: 1 }} onClick={onRemoveLast}>- Remove Last</button>
          )}
        </div>
      </section>

      {results && (
        <section className="sidebar-section">
          <span className="section-title" style={{ color: 'var(--peach)' }}>Assay Quality Checks</span>
          {qualityChecks && qualityChecks.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--green)', fontWeight: 'bold', fontSize: '0.8rem', marginTop: '4px' }}>
              <span style={{ fontSize: '1rem', color: 'var(--green)' }}>✓</span> All Checks Passed (Optimal Run)
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              {qualityChecks?.map((warning, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', color: 'var(--flamingo)', lineHeight: '1.4' }}>
                  <span style={{ color: 'var(--pink)', fontWeight: 'bold' }}>⚠️</span>
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </aside>
  );
};
