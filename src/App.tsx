import { useState, useMemo, useEffect, useRef } from "react";
import {
  calculateAdvancedLoD,
  type StandardData,
  type AdvancedLoDResult,
  computeSensitivityFoldChange
} from "./utils/calculations";
import { parseCSVData } from "./utils/csvParser";
import { formatScientificUnicode } from "./utils/formatters";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { ChartCard, type MultiCurvePlotSeries, type ChartScatterPoint } from "./components/ChartCard";
import { ResultsPanel, type SeriesLeaderboardItem } from "./components/ResultsPanel";
import {
  DEMO_PRESETS,
  SERIES_COLORS,
  APP_VERSION,
  type AssaySeries,
  type StandardRow
} from "./constants";
import "./App.css";

function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("app-theme") as "dark" | "light") || "light";
  });

  const [seriesList, setSeriesList] = useState<AssaySeries[]>(() => {
    return structuredClone(DEMO_PRESETS[0].series);
  });
  const [activeSeriesId, setActiveSeriesId] = useState<string>(() => {
    return DEMO_PRESETS[0].series[0].id;
  });
  const [demoIndex, setDemoIndex] = useState(0);
  const [plotTitle, setPlotTitle] = useState(DEMO_PRESETS[0].plotTitle);
  const [xAxisLabel, setXAxisLabel] = useState("Concentration (mM)");
  const [yAxisLabel, setYAxisLabel] = useState("Signal Intensity");
  const [hoveredPoint, setHoveredPoint] = useState<{ id: string; y: number; cx: number; cy: number; conc: number | string; seriesName?: string } | null>(null);
  const [tableHoveredRowId, setTableHoveredRowId] = useState<string | null>(null);
  const [hoveredSeriesId, setHoveredSeriesId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounter = useRef(0);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-subtheme", theme === "dark" ? "obsidian" : "porcelain");
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  const handleSelectSeries = (id: string) => {
    setActiveSeriesId(id);
    setHoveredPoint(null);
    setTableHoveredRowId(null);
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  const activeSeries = useMemo(() => {
    return seriesList.find(s => s.id === activeSeriesId) || seriesList[0];
  }, [seriesList, activeSeriesId]);

  const updateActiveSeriesField = <K extends keyof AssaySeries>(field: K, value: AssaySeries[K]) => {
    setSeriesList(prev => prev.map(s => s.id === activeSeries.id ? { ...s, [field]: value } : s));
  };

  const handleAddSeries = () => {
    const nextIdx = seriesList.length;
    const newColor = SERIES_COLORS[nextIdx % SERIES_COLORS.length];
    const newId = "series-" + Math.random().toString(36).substring(2, 7);
    const newName = seriesList.length === 0 ? "Ref" : `Sample ${nextIdx}`;
    const newSeries: AssaySeries = {
      id: newId,
      name: newName,
      color: newColor,
      visible: true,
      fitMethod: "auto",
      blankSignals: activeSeries.blankSignals,
      standardRows: [
        { id: Math.random().toString(36), conc: "0.01", signals: "" },
        { id: Math.random().toString(36), conc: "0.1", signals: "" },
        { id: Math.random().toString(36), conc: "1.0", signals: "" },
      ]
    };
    setSeriesList(prev => [...prev, newSeries]);
    handleSelectSeries(newId);
  };

  const handleRemoveSeries = (id: string) => {
    if (seriesList.length <= 1) return;
    setSeriesList(prev => {
      const nextList = prev.filter(s => s.id !== id);
      if (activeSeriesId === id) {
        handleSelectSeries(nextList[0].id);
      }
      return nextList;
    });
  };

  const handleToggleSeriesVisibility = (id: string) => {
    setSeriesList(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
  };

  const handleUpdateSeriesName = (id: string, name: string) => {
    setSeriesList(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  };

  // Quality Checks computation
  const computeQualityChecks = (results: AdvancedLoDResult | null, standardRows: StandardRow[]): string[] => {
    if (!results) return [];
    const warnings: string[] = [];
    if (results.fit.metrics.r2 < 0.95) {
      warnings.push(`Poor fit quality (R² = ${results.fit.metrics.r2.toFixed(4)}). Consider manual model selection.`);
    }
    standardRows.forEach((row) => {
      const c = parseFloat(row.conc);
      if (isNaN(c)) return;
      const sigs = row.signals.split(",").map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
      if (sigs.length > 1) {
        const mean = sigs.reduce((a, b) => a + b, 0) / sigs.length;
        if (Math.abs(mean) > 1e-9) {
          const sd = Math.sqrt(sigs.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / (sigs.length - 1));
          const cv = sd / Math.abs(mean);
          if (cv > 0.15) {
            warnings.push(`High replicate variance at concentration ${c} (CV = ${(cv * 100).toFixed(1)}%). Check for pipetting errors.`);
          }
        }
      }
    });
    const sortedStandards = [...standardRows]
      .map(row => {
        const c = parseFloat(row.conc);
        const sigs = row.signals.split(",").map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        const mean = sigs.length > 0 ? sigs.reduce((a, b) => a + b, 0) / sigs.length : 0;
        return { conc: c, mean };
      })
      .filter(item => !isNaN(item.conc))
      .sort((a, b) => a.conc - b.conc);
    if (sortedStandards.length > 2) {
      const means = sortedStandards.map(s => s.mean);
      const signalSpan = Math.max(...means) - Math.min(...means);
      const threshold = Math.max(1e-9, signalSpan * 0.05);
      let increases = 0;
      let decreases = 0;
      for (let i = 1; i < sortedStandards.length; i++) {
        const diff = sortedStandards[i].mean - sortedStandards[i - 1].mean;
        if (diff > threshold) increases++;
        else if (diff < -threshold) decreases++;
      }
      if (increases > 0 && decreases > 0) {
        warnings.push("Non-monotonic response detected (Hook Effect / signal drop at high concentration).");
      }
    }
    return warnings;
  };

  // Fit calculations for each series in seriesList
  interface SeriesFitMapItem {
    series: AssaySeries;
    results: AdvancedLoDResult | null;
    qualityChecks: string[];
  }

  const seriesFitMap = useMemo((): SeriesFitMapItem[] => {
    return seriesList.map(s => {
      try {
        const blanks = s.blankSignals.split(",").map(str => parseFloat(str.trim())).filter(n => !isNaN(n));
        const standards: StandardData[] = [];
        s.standardRows.forEach(row => {
          const c = parseFloat(row.conc);
          if (isNaN(c)) return;
          row.signals.split(",").forEach(sig => {
            const val = parseFloat(sig.trim());
            if (!isNaN(val)) standards.push({ concentration: c, readout: val });
          });
        });
        if (blanks.length < 2 || standards.length < 3) {
          return { series: s, results: null, qualityChecks: [] };
        }
        const res = calculateAdvancedLoD(blanks, standards, s.fitMethod);
        const qc = computeQualityChecks(res, s.standardRows);
        return { series: s, results: res, qualityChecks: qc };
      } catch {
        return { series: s, results: null, qualityChecks: [] };
      }
    });
  }, [seriesList]);

  const activeFitItem = useMemo(() => {
    return seriesFitMap.find(item => item.series.id === activeSeries.id) || seriesFitMap[0];
  }, [seriesFitMap, activeSeries.id]);

  const activeResults = activeFitItem?.results || null;
  const activeQualityChecks = activeFitItem?.qualityChecks || [];

  const validVisibleSeries = useMemo(() => {
    return seriesFitMap.filter(item => item.series.visible && item.results !== null);
  }, [seriesFitMap]);

  // When adding a new curve that has no data yet, fallback to the first valid series for display
  const displayFitItem = useMemo(() => {
    if (activeResults) return activeFitItem;
    return validVisibleSeries[0] || activeFitItem;
  }, [activeResults, activeFitItem, validVisibleSeries]);

  const displayResults = displayFitItem?.results || null;
  const displaySeries = displayFitItem?.series || activeSeries;

  // Unified global logarithmic X domain
  const { xTicks, xDomain, breakStart, breakEnd } = useMemo(() => {
    if (validVisibleSeries.length === 0) {
      return { xTicks: [], xDomain: [0, 0] as [number, number], breakStart: 0, breakEnd: 0 };
    }
    const allX = validVisibleSeries.flatMap(item => item.results!.fit.actualX.filter(x => x > 0));
    if (allX.length === 0) return { xTicks: [], xDomain: [0, 0] as [number, number], breakStart: 0, breakEnd: 0 };

    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const zeroX = minX / 10;
    const maxAxisValue = maxX * 1.5;
    const logZero = Math.log10(zeroX);
    const logMinPositive = Math.log10(minX);
    const breakCenterLog = (logZero + logMinPositive) / 2;
    // Balanced break gap (0.26 decades wide) extending axes inward from both sides
    const breakHalfWidth = 0.13;
    const breakStart = Math.pow(10, breakCenterLog - breakHalfWidth);
    const breakEnd = Math.pow(10, breakCenterLog + breakHalfWidth);
    const logMin = Math.floor(Math.log10(zeroX));
    const logMax = Math.ceil(Math.log10(maxAxisValue));
    const ticks = [zeroX, breakStart, breakEnd];
    for (let i = logMin; i <= logMax; i++) {
      const majorVal = Math.pow(10, i);
      if (majorVal <= maxAxisValue && majorVal >= minX - 1e-10) {
        if (majorVal < breakStart || majorVal > breakEnd) ticks.push(majorVal);
      }
      if (i < logMax) {
        for (let j = 2; j <= 9; j++) {
          const minorVal = j * Math.pow(10, i);
          // Strictly only include minor ticks for calibrator standard concentrations (>= minX)
          if (minorVal <= maxAxisValue && minorVal >= minX - 1e-10) {
            if (minorVal < breakStart || minorVal > breakEnd) ticks.push(minorVal);
          }
        }
      }
    }
    return { xTicks: ticks, xDomain: [zeroX, maxAxisValue] as [number, number], breakStart, breakEnd };
  }, [validVisibleSeries]);

  // Unified global Y domain
  const { yDomain, yTicks, yMajorTicks } = useMemo(() => {
    if (validVisibleSeries.length === 0) {
      return { yDomain: [0, 1] as [number, number], yTicks: undefined, yMajorTicks: [] as number[] };
    }
    const allSignals = validVisibleSeries.flatMap(item => item.results!.fit.actualY.filter(v => isFinite(v)));
    const allKeyValues = [...allSignals];
    validVisibleSeries.forEach(item => {
      if (isFinite(item.results!.lc)) allKeyValues.push(item.results!.lc);
      if (isFinite(item.results!.ld)) allKeyValues.push(item.results!.ld);
    });

    const minData = allKeyValues.length > 0 ? Math.min(...allKeyValues) : 0;
    const maxData = allKeyValues.length > 0 ? Math.max(...allKeyValues) : 1;

    const span = maxData > minData ? maxData - minData : (Math.abs(maxData) || 1);
    const targetMin = minData < 0 ? minData - span * 0.05 : Math.max(0, minData - span * 0.05);
    const targetMax = maxData + span * 0.08;
    const roughSpan = Math.max(1e-9, targetMax - targetMin);

    const rawStep = roughSpan / 5;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalizedStep = rawStep / magnitude;

    let multiplier = 1;
    if (normalizedStep >= 1.5 && normalizedStep < 3.5) multiplier = 2;
    else if (normalizedStep >= 3.5 && normalizedStep < 7.5) multiplier = 5;
    else if (normalizedStep >= 7.5) multiplier = 10;

    const niceStep = multiplier * magnitude;
    const niceMin = Math.floor(targetMin / niceStep) * niceStep;
    const niceMax = Math.ceil(targetMax / niceStep) * niceStep;

    const numMajor = Math.max(1, Math.round((niceMax - niceMin) / niceStep));
    const majorTicks: number[] = [];
    for (let i = 0; i <= numMajor; i++) {
      majorTicks.push(Number((niceMin + i * niceStep).toPrecision(10)));
    }

    const subDiv = multiplier === 2 ? 2 : 5;
    const subStep = niceStep / subDiv;
    const numMinor = Math.round((niceMax - niceMin) / subStep);
    const allTicks: number[] = [];
    if (numMinor <= 40) {
      for (let i = 0; i <= numMinor; i++) {
        allTicks.push(Number((niceMin + i * subStep).toPrecision(10)));
      }
    } else {
      allTicks.push(...majorTicks);
    }

    return { yDomain: [niceMin, niceMax] as [number, number], yTicks: allTicks, yMajorTicks: majorTicks };
  }, [validVisibleSeries]);

  const leftAxisData = useMemo(() => {
    if (validVisibleSeries.length === 0 || !breakStart) return [];
    return [{ x: xDomain[0], y: yDomain[0] }, { x: breakStart, y: yDomain[0] }];
  }, [validVisibleSeries, xDomain, breakStart, yDomain]);

  const rightAxisData = useMemo(() => {
    if (validVisibleSeries.length === 0 || !breakEnd) return [];
    return [{ x: breakEnd, y: yDomain[0] }, { x: xDomain[1], y: yDomain[0] }];
  }, [validVisibleSeries, xDomain, breakEnd, yDomain]);

  // Generate chart data for all visible curves
  const curveSeriesList = useMemo((): MultiCurvePlotSeries[] => {
    if (validVisibleSeries.length === 0 || !breakStart || !breakEnd) return [];
    const zeroX = xDomain[0];
    const maxAxisValue = xDomain[1];

    return validVisibleSeries.map(item => {
      const res = item.results!;
      const s = item.series;
      const isActive = s.id === (activeResults ? activeSeries.id : displaySeries.id);

      // Left chart data (zero break)
      const leftData = [];
      const leftSteps = 20;
      const logMinLeft = Math.log10(zeroX);
      const logMaxLeft = Math.log10(breakStart);
      for (let i = 0; i <= leftSteps; i++) {
        const xVal = Math.pow(10, logMinLeft + i * (logMaxLeft - logMinLeft) / leftSteps);
        const pred = res.fit.predict(0);
        const { low, high } = res.fit.getCI(0);
        leftData.push({ x: xVal, trend: pred, ciRange: [low, high] });
      }

      // Right chart data (main curve)
      const rightData = [];
      const rightSteps = 80;
      const logMinRight = Math.log10(breakEnd);
      const logMaxRight = Math.log10(maxAxisValue);
      for (let i = 0; i <= rightSteps; i++) {
        const xVal = Math.pow(10, logMinRight + i * (logMaxRight - logMinRight) / rightSteps);
        const pred = res.fit.predict(xVal);
        const { low, high } = res.fit.getCI(xVal);
        rightData.push({ x: xVal, trend: pred, ciRange: [low, high] });
      }

      // Scatter points
      const scatter: ChartScatterPoint[] = [];
      // Blanks
      s.blankSignals.split(",").forEach(sig => {
        const val = parseFloat(sig.trim());
        if (!isNaN(val)) {
          scatter.push({
            x: zeroX,
            y: val,
            actualX: 0,
            id: `${s.id}-blank`,
            seriesId: s.id,
            seriesName: s.name,
            color: s.color
          });
        }
      });
      // Standards
      s.standardRows.forEach(row => {
        const c = parseFloat(row.conc);
        if (isNaN(c)) return;
        row.signals.split(",").forEach(sig => {
          const val = parseFloat(sig.trim());
          if (!isNaN(val)) {
            scatter.push({
              x: c,
              y: val,
              actualX: c,
              id: row.id,
              seriesId: s.id,
              seriesName: s.name,
              color: s.color
            });
          }
        });
      });

      const lcLeft = [{ x: zeroX, y: res.lc }, { x: breakStart, y: res.lc }];
      const lcRight = [{ x: breakEnd, y: res.lc }, { x: maxAxisValue, y: res.lc }];
      const ldLeft = [{ x: zeroX, y: res.ld }, { x: breakStart, y: res.ld }];
      const ldRight = [{ x: breakEnd, y: res.ld }, { x: maxAxisValue, y: res.ld }];

      return {
        id: s.id,
        name: s.name,
        color: s.color,
        visible: s.visible,
        isActive,
        results: res,
        leftChartData: leftData,
        rightChartData: rightData,
        scatterData: scatter,
        lcLeftData: lcLeft,
        lcRightData: lcRight,
        ldLeftData: ldLeft,
        ldRightData: ldRight
      };
    });
  }, [validVisibleSeries, breakStart, breakEnd, xDomain, activeSeries.id, activeResults, displaySeries.id]);

  // Comparative Leaderboard Items
  const leaderboardItems = useMemo((): SeriesLeaderboardItem[] => {
    const refItem = validVisibleSeries.find(item => Number.isFinite(item.results?.lodConc) && item.results!.lodConc > 0) || validVisibleSeries[0];
    const refLod = (refItem && Number.isFinite(refItem.results?.lodConc)) ? refItem.results!.lodConc : 0;

    return validVisibleSeries.map(item => {
      const s = item.series;
      const res = item.results!;
      const fold = computeSensitivityFoldChange(res.lodConc, refLod);
      return {
        id: s.id,
        name: s.name,
        color: s.color,
        isActive: s.id === (activeResults ? activeSeries.id : displaySeries.id),
        results: res,
        foldChangeVsRef: fold
      };
    });
  }, [validVisibleSeries, activeSeries.id, activeResults, displaySeries.id]);

  // Handlers for active series data editing
  const updateRow = (id: string, field: "conc" | "signals", value: string) => {
    const newRows = activeSeries.standardRows.map(r => r.id === id ? { ...r, [field]: value } : r);
    updateActiveSeriesField("standardRows", newRows);
  };

  const handleClearData = () => {
    updateActiveSeriesField("blankSignals", "");
    updateActiveSeriesField("standardRows", [{ id: "1", conc: "", signals: "" }]);
    setHoveredPoint(null);
    setTableHoveredRowId(null);
    setHoveredSeriesId(null);
  };

  const handleSelectPreset = (index: number) => {
    if (index < 0 || index >= DEMO_PRESETS.length) return;
    const preset = DEMO_PRESETS[index];
    setSeriesList(structuredClone(preset.series));
    handleSelectSeries(preset.series[0].id);
    setPlotTitle(preset.plotTitle);
    setDemoIndex(index);
    setHoveredPoint(null);
    setTableHoveredRowId(null);
    setHoveredSeriesId(null);
  };

  const handleProcessFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const parsed = parseCSVData(text);
      if (parsed.multiSeries && parsed.multiSeries.length > 1) {
        setSeriesList(parsed.multiSeries);
        handleSelectSeries(parsed.multiSeries[0].id);
        alert(`Successfully imported ${parsed.multiSeries.length} curves from file!`);
      } else if (parsed.blankSignals || parsed.standards.length > 0) {
        if (parsed.blankSignals) updateActiveSeriesField("blankSignals", parsed.blankSignals);
        if (parsed.standards.length > 0) updateActiveSeriesField("standardRows", parsed.standards);
        alert("Data imported successfully into current curve!");
      } else {
        alert("Could not find any valid concentration-signal data in the uploaded file.");
      }
    };
    reader.readAsText(file);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleProcessFile(file);
    e.target.value = "";
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleExportCSV = () => {
    if (!displayResults) return;
    const csvRows: string[] = [];
    csvRows.push("# ===================================================");
    csvRows.push(`# BIOASSAY LOD FITTER - MULTI-CURVE AUDIT REPORT (v${APP_VERSION})`);
    csvRows.push("# ===================================================");
    csvRows.push(`App Version,v${APP_VERSION}`);
    csvRows.push(`Total Curves,${seriesList.length}`);
    csvRows.push("");

    if (leaderboardItems.length > 1) {
      csvRows.push("# ===================================================");
      csvRows.push("# COMPARATIVE SENSITIVITY LEADERBOARD");
      csvRows.push("# ===================================================");
      csvRows.push("Curve Name,Fitted Model,LOD (Conc),LOD 95% CI Low,LOD 95% CI High,R2,AICc,Sensitivity vs Ref");
      leaderboardItems.forEach(item => {
        csvRows.push(`"${item.name}",${item.results.fit.method.toUpperCase()},${item.results.lodConc.toExponential(6)},${item.results.lodCI.low.toExponential(6)},${item.results.lodCI.high.toExponential(6)},${item.results.fit.metrics.r2.toFixed(6)},${item.results.fit.metrics.aicc.toFixed(2)},"${item.foldChangeVsRef}"`);
      });
      csvRows.push("");
    }

    seriesList.forEach((s) => {
      csvRows.push("# ===================================================");
      csvRows.push(`# SERIES: ${s.name}`);
      csvRows.push("# ===================================================");
      csvRows.push("Concentration,Signals");
      if (s.blankSignals) csvRows.push(`0,${s.blankSignals}`);
      s.standardRows.forEach(row => {
        if (row.conc && row.signals) csvRows.push(`${row.conc},${row.signals}`);
      });
      csvRows.push("");
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bioassay_multi_curve_report_v${APP_VERSION}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = () => {
    const csvRows = [
      "# ===================================================",
      "# BIOASSAY LOD FITTER - MULTI-CURVE IMPORT TEMPLATE",
      "# ===================================================",
      "# Series: Synthetic Ref (Construct A)",
      "Concentration,Replicate1,Replicate2,Replicate3",
      "0,0.06,0.09,0.07",
      "0.001,0.08,0.09,0.08",
      "0.01,0.19,0.22,0.18",
      "0.1,0.85,0.92,0.81",
      "1,3.20,3.42,3.10",
      "10,4.75,4.90,4.68",
      "",
      "# Series: Synthetic Construct B (Low Potency)",
      "Concentration,Replicate1,Replicate2,Replicate3",
      "0,0.07,0.10,0.08",
      "0.003,0.09,0.10,0.09",
      "0.03,0.18,0.20,0.17",
      "0.3,0.82,0.89,0.78",
      "3,3.05,3.25,2.95",
      "30,4.70,4.85,4.62"
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "bioassay_multi_curve_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyMetrics = () => {
    if (!displayResults) return;

    const targetResults = activeResults || displayResults;
    const targetSeries = activeResults ? activeSeries : displaySeries;

    let leaderboardMarkdown = "";
    if (leaderboardItems.length > 1) {
      leaderboardMarkdown = `#### 🏆 Multi-Curve Sensitivity Comparison
| Curve | Model | LOD (Concentration) | 95% CI | R² | vs Ref |
| :--- | :--- | :--- | :--- | :--- | :--- |
`;
      leaderboardItems.forEach(item => {
        leaderboardMarkdown += `| **${item.name}** | ${item.results.fit.method.toUpperCase()} | **${formatScientificUnicode(item.results.lodConc, 3)}** | [${formatScientificUnicode(item.results.lodCI.low, 3)}, ${formatScientificUnicode(item.results.lodCI.high, 3)}] | ${item.results.fit.metrics.r2.toFixed(4)} | ${item.foldChangeVsRef} |
`;
      });
      leaderboardMarkdown += "\n";
    }

    let fitParamsText = "";
    Object.entries(targetResults.fit.parameters).forEach(([p, val]) => {
      const formattedVal = Math.abs(val) >= 1000 || (Math.abs(val) > 0 && Math.abs(val) < 0.01)
        ? formatScientificUnicode(val, 3)
        : val.toFixed(4);
      fitParamsText += `| **${p}** | ${formattedVal} |
`;
    });

    const report = `### 🔬 Bioassay LOD Fitter Multi-Curve Report (v${APP_VERSION})
Generated: ${new Date().toLocaleDateString()}

${leaderboardMarkdown}#### 📈 Active Curve: ${targetSeries.name}
| Parameter | Value |
| :--- | :--- |
| **Limit of Detection (LOD)** | **${formatScientificUnicode(targetResults.lodConc, 4)}** |
| **95% Confidence Interval** | [${formatScientificUnicode(targetResults.lodCI.low, 4)}, ${formatScientificUnicode(targetResults.lodCI.high, 4)}] |
| **Model Fitted** | ${targetResults.fit.method.toUpperCase()} |
| **R² (Coefficient of Determination)** | ${targetResults.fit.metrics.r2.toFixed(5)} |
| **AICc Score** | ${targetResults.fit.metrics.aicc.toFixed(2)} |

#### 🧪 Statistical Limits (Currie 1968 / Holstein et al. 2015)
| Parameter | Value | Description |
| :--- | :--- | :--- |
| **Blank Mean** | ${targetResults.meanBlank.toFixed(4)} | Average background signal |
| **Blank SD** | ${targetResults.sdBlank.toFixed(4)} | Background standard deviation |
| **Pooled SD** | ${targetResults.sdPooled.toFixed(4)} | Standards pooled standard deviation |
| **L_C (Decision Limit)** | ${targetResults.lc.toFixed(4)} | Critical signal threshold (α=0.05) |
| **L_D (Detection Limit)** | ${targetResults.ld.toFixed(4)} | Minimal detectable signal level (β=0.05) |

#### ⚙️ Fitted Parameters (${targetSeries.name})
| Parameter | Value |
| :--- | :--- |
${fitParamsText}`;

    navigator.clipboard.writeText(report);
    alert("Comparative Multi-Curve Report copied to clipboard as Markdown!");
  };

  return (
    <div
      className="app-wrapper"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingOver && (
        <div className="drag-drop-overlay" onDragLeave={() => setIsDraggingOver(false)}>
          <div className="drag-drop-modal">
            <span style={{ fontSize: "3rem" }}>📂</span>
            <h2 style={{ margin: "0.5rem 0", color: "var(--text)" }}>Drop CSV / TSV File Here</h2>
            <p style={{ margin: 0, color: "var(--subtext1)", fontSize: "0.9rem" }}>
              Instant multi-curve & replicate data import
            </p>
          </div>
        </div>
      )}
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        handleClearData={handleClearData}
        presets={DEMO_PRESETS}
        selectedPresetIndex={demoIndex}
        onSelectPreset={handleSelectPreset}
        handleImportCSV={handleImportCSV}
        handleDownloadTemplate={handleDownloadTemplate}
      />
      <main className="main-container">
        <button
          className={`sidebar-toggle-btn ${isSidebarCollapsed ? "collapsed" : ""}`}
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? "▶" : "◀"}
        </button>
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          seriesList={seriesList}
          activeSeriesId={activeSeries.id}
          setActiveSeriesId={handleSelectSeries}
          onAddSeries={handleAddSeries}
          onRemoveSeries={handleRemoveSeries}
          onToggleSeriesVisibility={handleToggleSeriesVisibility}
          onUpdateSeriesName={handleUpdateSeriesName}

          plotTitle={plotTitle}
          setPlotTitle={setPlotTitle}
          xAxisLabel={xAxisLabel}
          setXAxisLabel={setXAxisLabel}
          yAxisLabel={yAxisLabel}
          setYAxisLabel={setYAxisLabel}

          blankSignals={activeSeries.blankSignals}
          setBlankSignals={val => updateActiveSeriesField("blankSignals", val)}
          standardRows={activeSeries.standardRows}
          setStandardRows={updater => {
            if (typeof updater === "function") {
              updateActiveSeriesField("standardRows", updater(activeSeries.standardRows));
            } else {
              updateActiveSeriesField("standardRows", updater);
            }
          }}
          updateRow={updateRow}
          onAddRow={() => {
            const newRow = { id: Math.random().toString(36), conc: "", signals: "" };
            updateActiveSeriesField("standardRows", [...activeSeries.standardRows, newRow]);
          }}
          onRemoveRow={id => {
            const newRows = activeSeries.standardRows.filter(r => r.id !== id);
            updateActiveSeriesField("standardRows", newRows);
          }}
          hoveredPoint={hoveredPoint}
          setTableHoveredRowId={setTableHoveredRowId}
          results={activeResults}
          qualityChecks={activeQualityChecks}
        />
        <section className="content-area">
          {validVisibleSeries.length > 0 && displayResults ? (
            <div className="dashboard-grid">
              <ChartCard
                plotTitle={plotTitle}
                activeResults={displayResults}
                activeSeriesName={displaySeries.name}
                curveSeriesList={curveSeriesList}
                xAxisLabel={xAxisLabel}
                yAxisLabel={yAxisLabel}
                breakStart={breakStart}
                breakEnd={breakEnd}
                xTicks={xTicks}
                xDomain={xDomain}
                yDomain={yDomain}
                yTicks={yTicks}
                yMajorTicks={yMajorTicks}
                leftAxisData={leftAxisData}
                rightAxisData={rightAxisData}
                hoveredPoint={hoveredPoint}
                setHoveredPoint={setHoveredPoint}
                tableHoveredRowId={tableHoveredRowId}
                handleExportCSV={handleExportCSV}
                hoveredSeriesId={hoveredSeriesId}
                setHoveredSeriesId={setHoveredSeriesId}
                onSelectSeries={handleSelectSeries}
              />
              <ResultsPanel
                activeSeries={displaySeries}
                activeResults={displayResults}
                pendingSeriesName={!activeResults && seriesList.length > 1 ? activeSeries.name : undefined}
                leaderboardItems={leaderboardItems}
                onSelectSeries={handleSelectSeries}
                xAxisLabel={xAxisLabel}
                fitMethod={displaySeries.fitMethod}
                setFitMethod={method => {
                  if (activeResults) {
                    updateActiveSeriesField("fitMethod", method);
                  } else {
                    setSeriesList(prev => prev.map(s => s.id === displaySeries.id ? { ...s, fitMethod: method } : s));
                  }
                }}
                handleCopyMetrics={handleCopyMetrics}
                handleExportCSV={handleExportCSV}
              />
            </div>
          ) : (
            <div className="empty-prompt">
              <p>Please provide at least 2 blank replicates and 3 concentration standards to calculate the Limit of Detection (LOD).</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
