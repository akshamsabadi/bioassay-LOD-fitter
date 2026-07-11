import { useState, useMemo, useEffect } from 'react';
import { calculateAdvancedLoD, type StandardData, type AdvancedLoDResult } from './utils/calculations';
import { parseCSVData } from './utils/csvParser';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChartCard } from './components/ChartCard';
import { ResultsPanel } from './components/ResultsPanel';
import {
  DEMO_PRESETS,
  DEFAULT_STANDARDS,
  DEFAULT_BLANKS,
  type StandardRow
} from './constants';
import './App.css';

function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('app-theme') as 'dark' | 'light') || 'dark';
  });
  const [blankSignals, setBlankSignals] = useState(DEFAULT_BLANKS);
  const [standardRows, setStandardRows] = useState<StandardRow[]>(DEFAULT_STANDARDS);
  const [demoIndex, setDemoIndex] = useState(1);
  const [subtheme, setSubtheme] = useState<string>(() => {
    const saved = localStorage.getItem('app-subtheme');
    if (saved) return saved;
    return theme === 'dark' ? 'slate' : 'air';
  });
  const [fitMethod, setFitMethod] = useState<'linear' | 'langmuir' | '4pl' | '5pl' | 'auto'>('auto');
  const [plotTitle, setPlotTitle] = useState('Concentration-Response Fitting');
  const [xAxisLabel, setXAxisLabel] = useState('Concentration (mM)');
  const [yAxisLabel, setYAxisLabel] = useState('Signal Intensity');
  const [hoveredPoint, setHoveredPoint] = useState<{ id: string; y: number; cx: number; cy: number; conc: number | string } | null>(null);
  const [tableHoveredRowId, setTableHoveredRowId] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-subtheme', subtheme);
    localStorage.setItem('app-theme', theme);
    localStorage.setItem('app-subtheme', subtheme);
  }, [theme, subtheme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      setSubtheme(next === 'dark' ? 'slate' : 'air');
      return next;
    });
  };

  const results = useMemo((): AdvancedLoDResult | null => {
    try {
      const blanks = blankSignals.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
      const standards: StandardData[] = [];
      standardRows.forEach(row => {
        const c = parseFloat(row.conc);
        if (isNaN(c)) return;
        row.signals.split(',').forEach(s => {
          const val = parseFloat(s.trim());
          if (!isNaN(val)) standards.push({ concentration: c, readout: val });
        });
      });
      if (blanks.length < 2 || standards.length < 3) return null;
      return calculateAdvancedLoD(blanks, standards, fitMethod);
    } catch { return null; }
  }, [blankSignals, standardRows, fitMethod]);

  const { xTicks, xDomain, breakStart, breakEnd } = useMemo(() => {
    if (!results) return { xTicks: [], xDomain: [0, 0] as [number, number], breakStart: 0, breakEnd: 0 };
    const minX = Math.min(...results.fit.actualX.filter(x => x > 0));
    const maxX = Math.max(...results.fit.actualX);
    const zeroX = minX / 10;
    const maxAxisValue = maxX * 1.5;
    const breakCenterLog = (Math.log10(zeroX) + Math.log10(minX)) / 2;
    const breakStart = Math.pow(10, breakCenterLog - 0.05);
    const breakEnd = Math.pow(10, breakCenterLog + 0.05);
    const logMin = Math.floor(Math.log10(zeroX));
    const logMax = Math.ceil(Math.log10(maxAxisValue));
    const ticks = [zeroX, breakStart, breakEnd];
    for (let i = logMin; i <= logMax; i++) {
      const majorVal = Math.pow(10, i);
      if (majorVal <= maxAxisValue && majorVal > zeroX + 1e-10) {
        if (majorVal < breakStart || majorVal > breakEnd) ticks.push(majorVal);
      }
      if (i < logMax) {
        for (let j = 2; j <= 9; j++) {
          const minorVal = j * Math.pow(10, i);
          if (minorVal <= maxAxisValue && minorVal > zeroX + 1e-10) {
            if (minorVal < breakStart || minorVal > breakEnd) ticks.push(minorVal);
          }
        }
      }
    }
    return { xTicks: ticks, xDomain: [zeroX, maxAxisValue] as [number, number], breakStart, breakEnd };
  }, [results]);

  const leftChartData = useMemo(() => {
    if (!results || !breakStart) return [];
    const minX = Math.min(...results.fit.actualX.filter(x => x > 0));
    const zeroX = minX / 10;
    const data = [];
    const steps = 20;
    const logMin = Math.log10(zeroX);
    const logMax = Math.log10(breakStart);
    for (let i = 0; i <= steps; i++) {
      const xVal = Math.pow(10, logMin + i * (logMax - logMin) / steps);
      const pred = results.fit.predict(0);
      const { low, high } = results.fit.getCI(0);
      data.push({ x: xVal, trend: pred, ciRange: [low, high] });
    }
    return data;
  }, [results, breakStart]);

  const rightChartData = useMemo(() => {
    if (!results || !breakEnd) return [];
    const maxX = Math.max(...results.fit.actualX);
    const data = [];
    const steps = 80;
    const logMin = Math.log10(breakEnd);
    const logMax = Math.log10(maxX * 1.5);
    for (let i = 0; i <= steps; i++) {
      const xVal = Math.pow(10, logMin + i * (logMax - logMin) / steps);
      const pred = results.fit.predict(xVal);
      const { low, high } = results.fit.getCI(xVal);
      data.push({ x: xVal, trend: pred, ciRange: [low, high] });
    }
    return data;
  }, [results, breakEnd]);

  const lcLeftData = useMemo(() => {
    if (!results || !breakStart) return [];
    return [{ x: xDomain[0], y: results.lc }, { x: breakStart, y: results.lc }];
  }, [results, xDomain, breakStart]);

  const lcRightData = useMemo(() => {
    if (!results || !breakEnd) return [];
    return [{ x: breakEnd, y: results.lc }, { x: xDomain[1], y: results.lc }];
  }, [results, xDomain, breakEnd]);

  const ldLeftData = useMemo(() => {
    if (!results || !breakStart) return [];
    return [{ x: xDomain[0], y: results.ld }, { x: breakStart, y: results.ld }];
  }, [results, xDomain, breakStart]);

  const ldRightData = useMemo(() => {
    if (!results || !breakEnd) return [];
    return [{ x: breakEnd, y: results.ld }, { x: xDomain[1], y: results.ld }];
  }, [results, xDomain, breakEnd]);

  const scatterData = useMemo(() => {
    if (!results) return [];
    const minX = Math.min(...results.fit.actualX.filter(x => x > 0));
    const zeroX = minX / 10;
    const points: any[] = [];
    const blanks = blankSignals.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    blanks.forEach(y => points.push({ x: zeroX, y, id: 'blank', actualX: '0', isScatterData: true }));
    standardRows.forEach(row => {
      const c = parseFloat(row.conc);
      if (isNaN(c)) return;
      row.signals.split(',').forEach(s => {
        const val = parseFloat(s.trim());
        if (!isNaN(val)) points.push({ x: c === 0 ? zeroX : c, y: val, id: row.id, actualX: c, isScatterData: true });
      });
    });
    return points;
  }, [results, blankSignals, standardRows]);

  const qualityChecks = useMemo(() => {
    if (!results) return null;
    const warnings: string[] = [];
    if (results.fit.metrics.r2 < 0.95) {
      warnings.push(`Poor fit quality (R² = ${results.fit.metrics.r2.toFixed(4)}). Consider manual model selection.`);
    }
    standardRows.forEach((row) => {
      const c = parseFloat(row.conc);
      if (isNaN(c)) return;
      const sigs = row.signals.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
      if (sigs.length > 1) {
        const mean = sigs.reduce((a, b) => a + b, 0) / sigs.length;
        if (mean > 0) {
          const sd = Math.sqrt(sigs.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / (sigs.length - 1));
          const cv = sd / mean;
          if (cv > 0.15) {
            warnings.push(`High replicate variance at concentration ${c} (CV = ${(cv * 100).toFixed(1)}%). Check for pipetting errors.`);
          }
        }
      }
    });
    const sortedStandards = [...standardRows]
      .map(row => {
        const c = parseFloat(row.conc);
        const sigs = row.signals.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        const mean = sigs.length > 0 ? sigs.reduce((a, b) => a + b, 0) / sigs.length : 0;
        return { conc: c, mean };
      })
      .filter(item => !isNaN(item.conc))
      .sort((a, b) => a.conc - b.conc);
    if (sortedStandards.length > 2) {
      let increases = 0;
      let decreases = 0;
      for (let i = 1; i < sortedStandards.length; i++) {
        const diff = sortedStandards[i].mean - sortedStandards[i - 1].mean;
        if (diff > 0.05) increases++;
        else if (diff < -0.05) decreases++;
      }
      if (increases > 0 && decreases > 0) {
        warnings.push("Non-monotonic response detected (Hook Effect / signal drop at high concentration). Calibration curve may be compromised.");
      }
    }
    return warnings;
  }, [results, standardRows]);

  const { yDomain, yTicks, yMajorTicks } = useMemo(() => {
    if (!results) return { yDomain: [0, 1] as [number, number], yTicks: undefined, yMajorTicks: [] as number[] };
    const maxData = Math.max(...results.fit.actualY, results.ld);
    const minData = Math.min(...results.fit.actualY, 0);
    const niceMax = Math.ceil(maxData * 1.1);
    const niceMin = Math.floor(minData);
    const majorTicks = [];
    const step = niceMax <= 5 ? 1 : Math.ceil(niceMax / 5);
    for (let i = niceMin; i <= niceMax; i += step) {
      majorTicks.push(i);
    }
    const allTicks = [];
    for (let i = niceMin; i <= niceMax; i++) {
      allTicks.push(i);
    }
    return { yDomain: [niceMin, niceMax] as [number, number], yTicks: allTicks, yMajorTicks: majorTicks };
  }, [results]);

  const leftAxisData = useMemo(() => {
    if (!results || !breakStart) return [];
    return [{ x: xDomain[0], y: yDomain[0] }, { x: breakStart, y: yDomain[0] }];
  }, [results, xDomain, breakStart, yDomain]);

  const rightAxisData = useMemo(() => {
    if (!results || !breakEnd) return [];
    return [{ x: breakEnd, y: yDomain[0] }, { x: xDomain[1], y: yDomain[0] }];
  }, [results, xDomain, breakEnd, yDomain]);

  const updateRow = (id: string, field: 'conc' | 'signals', value: string) => {
    setStandardRows(standardRows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleClearData = () => {
    setBlankSignals('');
    setStandardRows([{ id: '1', conc: '', signals: '' }]);
  };

  const handleLoadDemo = () => {
    const preset = DEMO_PRESETS[demoIndex];
    setBlankSignals(preset.blanks);
    setStandardRows(preset.standards);
    setFitMethod(preset.fitMethod);
    setPlotTitle(preset.plotTitle);
    setDemoIndex(prev => (prev + 1) % DEMO_PRESETS.length);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const { blankSignals: parsedBlanks, standards: parsedStandards } = parseCSVData(text);
      if (parsedBlanks || parsedStandards.length > 0) {
        if (parsedBlanks) setBlankSignals(parsedBlanks);
        if (parsedStandards.length > 0) setStandardRows(parsedStandards);
        alert('CSV Data imported successfully!');
      } else {
        alert('Could not find any valid concentration-signal data in the uploaded CSV file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportCSV = () => {
    if (!results) return;
    const csvRows: string[] = [];
    csvRows.push('# ===================================================');
    csvRows.push('# BIOASSAY LOD FITTER - INPUT DATA TEMPLATE');
    csvRows.push('# ===================================================');
    csvRows.push('Concentration,Signals');
    if (blankSignals) csvRows.push(`0,${blankSignals}`);
    standardRows.forEach(row => {
      if (row.conc && row.signals) csvRows.push(`${row.conc},${row.signals}`);
    });
    csvRows.push('', '# ===================================================', '# ANALYSIS SUMMARY & STATISTICAL RESULTS', '# ===================================================', 'Parameter,Value');
    csvRows.push('App Version,v0.5.18');
    csvRows.push(`Requested Fit Method,${fitMethod}`, `Best/Selected Model,${results.fit.method.toUpperCase()}`);
    csvRows.push(`Limit of Detection (LOD),${results.lodConc.toExponential(6)}`);
    csvRows.push(`LOD 95% Confidence Interval Low,${results.lodCI.low.toExponential(6)}`, `LOD 95% Confidence Interval High,${results.lodCI.high.toExponential(6)}`);
    csvRows.push(`AICc Score,${results.fit.metrics.aicc.toFixed(4)}`, `R² (Coefficient of Determination),${results.fit.metrics.r2.toFixed(6)}`);
    csvRows.push(`Blank Mean,${results.meanBlank.toFixed(6)}`, `Blank SD,${results.sdBlank.toFixed(6)}`, `Pooled SD (Standards),${results.sdPooled.toFixed(6)}`);
    csvRows.push(`Critical Level (LC),${results.lc.toFixed(6)}`, `Detection Limit Signal (LD),${results.ld.toFixed(6)}`);
    csvRows.push('', '# ===================================================', '# FITTED MODEL PARAMETERS', '# ===================================================', 'Model Parameter,Value');
    Object.entries(results.fit.parameters).forEach(([param, value]) => {
      csvRows.push(`"${param}",${value.toFixed(6)}`);
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bioassay_lod_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = () => {
    const csvRows = [
      '# ===================================================',
      '# BIOASSAY LOD FITTER - IMPORT TEMPLATE',
      '# ===================================================',
      'Concentration,Replicate1,Replicate2,Replicate3',
      '0,0.07,0.13,0.08',
      '0.001,0.08,0.15,0.09',
      '0.003,0.10,0.18,0.11',
      '0.01,0.14,0.10,0.19',
      '0.03,0.20,0.32,0.23',
      '0.1,0.45,0.65,0.52',
      '0.3,1.05,1.45,1.20',
      '1,2.30,2.80,2.45',
      '3,3.50,4.00,3.65',
      '10,4.30,4.75,4.45',
      '30,4.65,5.05,4.75',
      '100,4.80,5.20,4.85',
      '300,4.85,5.25,4.90'
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'bioassay_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyMetrics = () => {
    if (!results) return;
    const text = `Bioassay Results\nLOD: ${results.lodConc.toExponential(3)}\nAICc: ${results.fit.metrics.aicc.toFixed(2)}\nR2: ${results.fit.metrics.r2.toFixed(5)}\nLC: ${results.lc.toFixed(4)}\nLD: ${results.ld.toFixed(4)}`;
    navigator.clipboard.writeText(text);
    alert('Metrics copied to clipboard!');
  };

  return (
    <div className="app-wrapper">
      <Header
        theme={theme}
        subtheme={subtheme}
        setSubtheme={setSubtheme}
        toggleTheme={toggleTheme}
        handleClearData={handleClearData}
        handleLoadDemo={handleLoadDemo}
        demoName={DEMO_PRESETS[demoIndex].name}
        handleImportCSV={handleImportCSV}
        handleDownloadTemplate={handleDownloadTemplate}
        handleExportCSV={handleExportCSV}
        results={results}
      />
      <main className="main-container">
        <Sidebar
          fitMethod={fitMethod}
          setFitMethod={setFitMethod}
          plotTitle={plotTitle}
          setPlotTitle={setPlotTitle}
          xAxisLabel={xAxisLabel}
          setXAxisLabel={setXAxisLabel}
          yAxisLabel={yAxisLabel}
          setYAxisLabel={setYAxisLabel}
          blankSignals={blankSignals}
          setBlankSignals={setBlankSignals}
          standardRows={standardRows}
          updateRow={updateRow}
          onAddRow={() => setStandardRows(prev => [...prev, { id: Math.random().toString(36), conc: '', signals: '' }])}
          onRemoveLast={() => setStandardRows(prev => prev.slice(0, -1))}
          onRemoveRow={id => setStandardRows(prev => prev.filter(r => r.id !== id))}
          hoveredPoint={hoveredPoint}
          setTableHoveredRowId={setTableHoveredRowId}
          results={results}
          qualityChecks={qualityChecks}
        />
        <section className="content-area">
          {results ? (
            <div className="dashboard-grid">
              <ChartCard
                plotTitle={plotTitle}
                results={results}
                xAxisLabel={xAxisLabel}
                yAxisLabel={yAxisLabel}
                breakStart={breakStart}
                breakEnd={breakEnd}
                xTicks={xTicks}
                xDomain={xDomain}
                yDomain={yDomain}
                yTicks={yTicks}
                yMajorTicks={yMajorTicks}
                leftChartData={leftChartData}
                rightChartData={rightChartData}
                lcLeftData={lcLeftData}
                lcRightData={lcRightData}
                ldLeftData={ldLeftData}
                ldRightData={ldRightData}
                scatterData={scatterData}
                leftAxisData={leftAxisData}
                rightAxisData={rightAxisData}
                hoveredPoint={hoveredPoint}
                setHoveredPoint={setHoveredPoint}
                tableHoveredRowId={tableHoveredRowId}
                handleExportCSV={handleExportCSV}
              />
              <ResultsPanel
                results={results}
                xAxisLabel={xAxisLabel}
                handleCopyMetrics={handleCopyMetrics}
              />
            </div>
          ) : (
            <div className="empty-prompt">
              <p>Loading Bioassay LOD Fitter v0.5.18...</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
