import React, { useState } from 'react';
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
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* SECTION 1: DATA INPUTS (BLANKS & STANDARDS) - Primary sidebar focus */}
      <section className="sidebar-section" style={{ margin: 0 }}>
        <span className="section-title" style={{ color: 'var(--peach)', marginBottom: '10px' }}>Blanks</span>
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
      
      <section className="sidebar-section" style={{ margin: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <span className="section-title" style={{ color: 'var(--green)', marginBottom: '10px' }}>Standards</span>
        <div className="rows-container" style={{ flex: 1, overflowY: 'auto', marginBottom: '12px', paddingRight: '4px' }}>
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
          <button className="add-row-btn" style={{ flex: 1, padding: '10px' }} onClick={onAddRow}>+ Add Point</button>
          {standardRows.length > 1 && (
            <button className="remove-last-btn" style={{ flex: 1, padding: '10px' }} onClick={onRemoveLast}>- Remove Last</button>
          )}
        </div>
      </section>

      {/* SECTION 2: COLLAPSIBLE ADVANCED CONFIGURATION */}
      <section className="sidebar-section" style={{
        margin: 0,
        borderTop: '1px solid var(--surface1)',
        paddingTop: '16px'
      }}>
        <div 
          onClick={() => setShowAdvanced(!showAdvanced)} 
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            color: 'var(--subtext1)',
            padding: '4px 0'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚙️</span> Advanced Options
          </span>
          <span style={{ transition: 'transform 0.2s', transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            ▶
          </span>
        </div>

        {showAdvanced && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }} className="fade-in">
            {/* Model Fitting Config */}
            <div>
              <span className="section-title" style={{ color: 'var(--mauve)', display: 'block', marginBottom: '8px' }}>Fitting Model</span>
              <select value={fitMethod} onChange={e => setFitMethod(e.target.value as any)} className="method-select" style={{ width: '100%' }}>
                <option value="auto">Automatic (AICc Optimised)</option>
                <option value="linear">Linear</option>
                <option value="langmuir">Langmuir</option>
                <option value="4pl">4-Parameter Logistic (4PL)</option>
                <option value="5pl">5-Parameter Logistic (5PL)</option>
              </select>
            </div>
            
            {/* Plot Titles & Axis Labels Config */}
            <div>
              <span className="section-title" style={{ color: 'var(--sapphire)', display: 'block', marginBottom: '8px' }}>Plot Labels</span>
              <div className="input-group" style={{ marginBottom: '8px' }}>
                <input type="text" className="text-input" placeholder="Title" value={plotTitle} onChange={e => setPlotTitle(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" className="text-input" placeholder="X Axis" value={xAxisLabel} onChange={e => setXAxisLabel(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                <input type="text" className="text-input" placeholder="Y Axis" value={yAxisLabel} onChange={e => setYAxisLabel(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
              </div>
            </div>
          </div>
        )}
      </section>
    </aside>
  );
};
