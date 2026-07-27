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
  onRemoveRow,
  hoveredPoint,
  setTableHoveredRowId,
  results,
  qualityChecks,
}) => {
  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* SECTION 1: MODEL OPTIONS */}
      <section className="sidebar-section" style={{ margin: 0 }}>
        <span className="section-title" style={{ color: 'var(--mauve)', display: 'block', marginBottom: '8px' }}>Fitting Model</span>
        <select value={fitMethod} onChange={e => setFitMethod(e.target.value as any)} className="method-select" style={{ width: '100%' }}>
          <option value="auto">Automatic (AICc Optimised)</option>
          <option value="linear">Linear</option>
          <option value="langmuir">Langmuir</option>
          <option value="4pl">4-Parameter Logistic (4PL)</option>
          <option value="5pl">5-Parameter Logistic (5PL)</option>
        </select>
      </section>
      
      {/* SECTION 2: PLOT LABELS */}
      <section className="sidebar-section" style={{ margin: 0 }}>
        <span className="section-title" style={{ color: 'var(--sapphire)', display: 'block', marginBottom: '8px' }}>Plot Labels</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input 
            type="text" 
            className="text-input" 
            placeholder="Plot Title" 
            value={plotTitle} 
            onChange={e => setPlotTitle(e.target.value)} 
            style={{ width: '100%' }} 
          />
          <div style={{ display: 'flex', gap: '8px' }}>
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
      </section>

      {/* SECTION 3: BLANKS DATA ENTRY */}
      <section className="sidebar-section" style={{ margin: 0 }}>
        <span className="section-title" style={{ color: 'var(--peach)', marginBottom: '10px' }}>Blanks</span>
        <div className="data-row"
             onMouseEnter={() => setTableHoveredRowId('blank')}
             onMouseLeave={() => setTableHoveredRowId(null)}
             style={{ paddingRight: '16px' }} /* Keep gutter consistent with Standards */>
          <div className="conc-input disabled" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: hoveredPoint?.id === 'blank' ? 'var(--pink)' : 'var(--overlay0)' }}>0</div>
          <div style={{ position: 'relative', flex: 1 }}>
            <input type="text" className="signals-input" placeholder="e.g. 0.08, 0.12, 0.10" value={blankSignals} onChange={e => setBlankSignals(e.target.value)} style={{ width: '100%', color: hoveredPoint?.id === 'blank' ? 'transparent' : 'var(--text)' }} />
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
      
      {/* SECTION 4: STANDARDS DATA ENTRY */}
      <section className="sidebar-section" style={{ margin: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <span className="section-title" style={{ color: 'var(--green)', marginBottom: '10px' }}>Standards</span>
        
        {/* Fixed design flaw: paddingRight: '16px' ensures the scrollbar does NOT mask the red X delete button */}
        <div className="rows-container" style={{ flex: 1, overflowY: 'auto', marginBottom: '12px', paddingRight: '16px' }}>
          {standardRows.map((r) => (
            <div key={r.id} className="data-row"
                 onMouseEnter={() => setTableHoveredRowId(r.id)}
                 onMouseLeave={() => setTableHoveredRowId(null)}>
              <div style={{ position: 'relative' }}>
                <input type="text" className="conc-input" placeholder="e.g. 0.1" value={r.conc} onChange={e => updateRow(r.id, 'conc', e.target.value)} style={{ color: hoveredPoint?.id === r.id ? 'var(--pink)' : 'var(--text)' }} />
              </div>
              <div style={{ position: 'relative', flex: 1 }}>
                <input type="text" className="signals-input" placeholder="e.g. 0.15, 0.17, 0.16" value={r.signals} onChange={e => updateRow(r.id, 'signals', e.target.value)} style={{ width: '100%', color: hoveredPoint?.id === r.id ? 'transparent' : 'var(--text)' }} />
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
        
        {/* Modern dashed outline "Add Point" (+) button */}
        <button
          onClick={onAddRow}
          style={{
            width: 'calc(100% - 16px)', /* Match width of inputs by subtracting padding gutter */
            padding: '8px',
            backgroundColor: 'transparent',
            border: '1px dashed var(--surface2)',
            borderRadius: '6px',
            color: 'var(--subtext0)',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '4px'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--blue)';
            e.currentTarget.style.color = 'var(--blue)';
            e.currentTarget.style.backgroundColor = 'var(--surface0)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--surface2)';
            e.currentTarget.style.color = 'var(--subtext0)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          +
        </button>
      </section>

      {/* SECTION 5: ASSAY DIAGNOSTICS */}
      {results && (
        <section className="sidebar-section" style={{
          margin: 0,
          borderTop: '1px solid var(--surface1)',
          paddingTop: '16px'
        }}>
          {/* Visual Harmony: match header colors to the rest of the Catppuccin interface */}
          <span className="section-title" style={{ color: 'var(--pink)', display: 'block', marginBottom: '10px' }}>Assay Diagnostics</span>
          {qualityChecks && qualityChecks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {qualityChecks.map((warning, index) => (
                <div key={index} style={{
                  fontSize: '0.75rem',
                  color: 'var(--text)',
                  backgroundColor: 'var(--surface0)',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  lineHeight: '1.4',
                  border: '1px solid var(--surface1)',
                  borderLeft: '4px solid var(--pink)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <span style={{ marginRight: '6px' }}>⚠️</span> {warning}
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text)',
              backgroundColor: 'var(--surface0)',
              padding: '10px 14px',
              borderRadius: '6px',
              lineHeight: '1.4',
              border: '1px solid var(--surface1)',
              borderLeft: '4px solid var(--green)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <span style={{ fontSize: '1rem', color: 'var(--green)' }}>✨</span>
              <span>All quality checks passed successfully!</span>
            </div>
          )}
        </section>
      )}
    </aside>
  );
};
