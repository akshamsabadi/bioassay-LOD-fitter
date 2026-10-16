import { useState, useMemo, useEffect, useRef } from "react";
import type React from "react";
import {
  calculateAdvancedLoD,
  computeSensitivityFoldChange,
  computeAssayQualityChecks,
  parseSignalNumbers,
  type StandardData,
  type AdvancedLoDResult,
} from "./utils/calculations";
import { parseCSVData } from "./utils/csvParser";
import {
  computeGlobalLogXAxisLayout,
  computeGlobalLinearYAxisLayout,
} from "./utils/zoom";
import {
  buildMultiCurveCSVReport,
  buildMultiCurveTemplateCSV,
  buildMarkdownAuditReport,
  downloadTextFile,
} from "./utils/reportExporters";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import {
  ChartCard,
  type MultiCurvePlotSeries,
  type ChartScatterPoint,
  type HoveredPointData,
} from "./components/ChartCard";
import {
  ResultsPanel,
  type SeriesLeaderboardItem,
} from "./components/ResultsPanel";
import {
  DEMO_PRESETS,
  SERIES_COLORS,
  APP_VERSION,
  type AssaySeries,
  type FitMethod,
  type StandardRow,
} from "./constants";
import "./App.css";

/** LocalStorage key used to persist the user's color theme preference. */
const _THEME_STORAGE_KEY = "app-theme";

/** Sub-theme attribute value applied when dark mode is active. */
const _DARK_SUBTHEME = "obsidian";

/** Sub-theme attribute value applied when light mode is active. */
const _LIGHT_SUBTHEME = "porcelain";

/** Default label displayed along the horizontal concentration axis. */
const _DEFAULT_X_AXIS_LABEL = "Concentration (mM)";

/** Default label displayed along the vertical signal readout axis. */
const _DEFAULT_Y_AXIS_LABEL = "Signal Intensity";

/** Default starter concentrations pre-populated when adding a new assay series. */
const _DEFAULT_NEW_SERIES_CONCENTRATIONS = ["0.01", "0.1", "1.0"] as const;

/** Minimum number of valid blank replicates required to compute Currie/Holstein LOD. */
const _MIN_REQUIRED_BLANKS = 2;

/** Minimum number of valid standard calibrator points required to fit a calibration curve. */
const _MIN_REQUIRED_STANDARDS = 3;

/** Number of log-spaced grid intervals generated across the left (zero-break) chart segment. */
const _LEFT_SEGMENT_GRID_STEPS = 25;

/** Number of log-spaced grid intervals generated across the right (calibration curve) chart segment. */
const _RIGHT_SEGMENT_GRID_STEPS = 120;

/** Evaluated regression fit and quality diagnostics for a single assay curve series. */
interface _SeriesFitMapItem {
  series: AssaySeries;
  results: AdvancedLoDResult | null;
  qualityChecks: string[];
}

/**
 * Generates a short pseudo-random identifier prefixed with `prefix`.
 *
 * @param prefix - Identifier namespace prefix (e.g. `"series"` or `"row"`).
 * @returns Unique string identifier.
 */
function _createUniqueId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Builds the Recharts plot series payloads (left/right trend grids, confidence bands,
 * replicate scatter points, and horizontal $L_C$/$L_D$ reference segments) for all visible fitted curves.
 *
 * @param validVisibleSeries - Visible series items that have valid fitted `results`.
 * @param xDomain - Global logarithmic X-axis `[zeroX, maxAxisValue]` domain.
 * @param breakStart - Lower concentration bound of the X-axis zero-break gap.
 * @param breakEnd - Upper concentration bound of the X-axis zero-break gap.
 * @param highlightedSeriesId - ID of the currently active/displayed series.
 * @returns Array of `MultiCurvePlotSeries` ready for `ChartCard`.
 */
function _buildMultiCurvePlotSeries(
  validVisibleSeries: readonly _SeriesFitMapItem[],
  xDomain: [number, number],
  breakStart: number,
  breakEnd: number,
  highlightedSeriesId: string
): MultiCurvePlotSeries[] {
  if (validVisibleSeries.length === 0 || !breakStart || !breakEnd) {
    return [];
  }
  const [zeroX, maxAxisValue] = xDomain;

  // Unified X coordinate grids for left (zero break) and right (main curve).
  // Including all standard calibrator concentrations, LOD values, and fine log-spaced intervals
  // ensures that Recharts findEntryInArray never returns undefined at any hovered X position.
  const leftXSet = new Set<number>();
  const logMinLeft = Math.log10(zeroX);
  const logMaxLeft = Math.log10(breakStart);
  for (let i = 0; i <= _LEFT_SEGMENT_GRID_STEPS; i++) {
    leftXSet.add(
      Math.pow(
        10,
        logMinLeft + (i * (logMaxLeft - logMinLeft)) / _LEFT_SEGMENT_GRID_STEPS
      )
    );
  }
  leftXSet.add(zeroX);
  leftXSet.add(breakStart);
  const leftXGrid = Array.from(leftXSet).sort((a, b) => a - b);

  const rightXSet = new Set<number>();
  const logMinRight = Math.log10(breakEnd);
  const logMaxRight = Math.log10(maxAxisValue);
  for (let i = 0; i <= _RIGHT_SEGMENT_GRID_STEPS; i++) {
    rightXSet.add(
      Math.pow(
        10,
        logMinRight +
          (i * (logMaxRight - logMinRight)) / _RIGHT_SEGMENT_GRID_STEPS
      )
    );
  }
  rightXSet.add(breakEnd);
  rightXSet.add(maxAxisValue);

  validVisibleSeries.forEach((item) => {
    item.series.standardRows.forEach((row) => {
      const concentration = parseFloat(row.conc);
      if (
        !Number.isNaN(concentration) &&
        concentration >= breakEnd &&
        concentration <= maxAxisValue
      ) {
        rightXSet.add(concentration);
      }
    });
    const lod = item.results?.lodConc;
    if (
      lod !== undefined &&
      Number.isFinite(lod) &&
      lod >= breakEnd &&
      lod <= maxAxisValue
    ) {
      rightXSet.add(lod);
    }
  });

  const rightXGrid = Array.from(rightXSet).sort((a, b) => a - b);

  return validVisibleSeries.map((item): MultiCurvePlotSeries => {
    const results = item.results!;
    const series = item.series;
    const isActive = series.id === highlightedSeriesId;

    const leftChartData = leftXGrid.map((xVal) => {
      const pred = results.fit.predict(0);
      const { low, high } = results.fit.getCI(0);
      return { x: xVal, trend: pred, ciRange: [low, high] as [number, number] };
    });

    const rightChartData = rightXGrid.map((xVal) => {
      const pred = results.fit.predict(xVal);
      const { low, high } = results.fit.getCI(xVal);
      return { x: xVal, trend: pred, ciRange: [low, high] as [number, number] };
    });

    const scatterData: ChartScatterPoint[] = [];
    parseSignalNumbers(series.blankSignals).forEach((repValue, repIndex) => {
      scatterData.push({
        x: zeroX,
        y: repValue,
        actualX: 0,
        id: `${series.id}-blank`,
        pointId: `${series.id}-blank-rep-${repIndex}`,
        rowId: "blank",
        repIndex,
        repValue,
        seriesId: series.id,
        seriesName: series.name,
        color: series.color,
      });
    });

    series.standardRows.forEach((row) => {
      const concentration = parseFloat(row.conc);
      if (Number.isNaN(concentration)) return;
      parseSignalNumbers(row.signals).forEach((repValue, repIndex) => {
        scatterData.push({
          x: concentration,
          y: repValue,
          actualX: concentration,
          id: row.id,
          pointId: `${series.id}-${row.id}-rep-${repIndex}`,
          rowId: row.id,
          repIndex,
          repValue,
          seriesId: series.id,
          seriesName: series.name,
          color: series.color,
        });
      });
    });

    return {
      id: series.id,
      name: series.name,
      color: series.color,
      visible: series.visible,
      isActive,
      results,
      leftChartData,
      rightChartData,
      scatterData,
      lcLeftData: [
        { x: zeroX, y: results.lc },
        { x: breakStart, y: results.lc },
      ],
      lcRightData: [
        { x: breakEnd, y: results.lc },
        { x: maxAxisValue, y: results.lc },
      ],
      ldLeftData: [
        { x: zeroX, y: results.ld },
        { x: breakStart, y: results.ld },
      ],
      ldRightData: [
        { x: breakEnd, y: results.ld },
        { x: maxAxisValue, y: results.ld },
      ],
    };
  });
}

/**
 * Root application component coordinating multi-curve bioassay calibration state,
 * Currie (1968) / Holstein et al. (2015) LOD regression fitting, interactive chart layout,
 * and CSV/Markdown report exports.
 *
 * @returns Rendered application workspace element.
 */
function App(): React.ReactElement {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (
      (localStorage.getItem(_THEME_STORAGE_KEY) as "dark" | "light") || "light"
    );
  });

  const [seriesList, setSeriesList] = useState<AssaySeries[]>(() => {
    return structuredClone(DEMO_PRESETS[0].series);
  });
  const [activeSeriesId, setActiveSeriesId] = useState<string>(() => {
    return DEMO_PRESETS[0].series[0].id;
  });
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [plotTitle, setPlotTitle] = useState<string>(DEMO_PRESETS[0].plotTitle);
  const [xAxisLabel, setXAxisLabel] = useState<string>(_DEFAULT_X_AXIS_LABEL);
  const [yAxisLabel, setYAxisLabel] = useState<string>(_DEFAULT_Y_AXIS_LABEL);
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPointData | null>(
    null
  );
  const [tableHoveredRowId, setTableHoveredRowId] = useState<string | null>(
    null
  );
  const [hoveredSeriesId, setHoveredSeriesId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const dragCounter = useRef<number>(0);

  useEffect((): void => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute(
      "data-subtheme",
      theme === "dark" ? _DARK_SUBTHEME : _LIGHT_SUBTHEME
    );
    localStorage.setItem(_THEME_STORAGE_KEY, theme);
  }, [theme]);

  const handleSelectSeries = (id: string): void => {
    setActiveSeriesId(id);
    setHoveredPoint(null);
    setTableHoveredRowId(null);
  };

  const toggleTheme = (): void => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const activeSeries = useMemo((): AssaySeries => {
    return (
      seriesList.find((series) => series.id === activeSeriesId) || seriesList[0]
    );
  }, [seriesList, activeSeriesId]);

  const updateActiveSeriesField = <K extends keyof AssaySeries>(
    field: K,
    value: AssaySeries[K]
  ): void => {
    setSeriesList((prev) =>
      prev.map((series) =>
        series.id === activeSeries.id ? { ...series, [field]: value } : series
      )
    );
  };

  const handleAddSeries = (): void => {
    const nextIdx = seriesList.length;
    const newColor = SERIES_COLORS[nextIdx % SERIES_COLORS.length];
    const newId = _createUniqueId("series");
    const newName = seriesList.length === 0 ? "Ref" : `Sample ${nextIdx}`;
    const newSeries: AssaySeries = {
      id: newId,
      name: newName,
      color: newColor,
      visible: true,
      fitMethod: "auto",
      blankSignals: activeSeries.blankSignals,
      standardRows: _DEFAULT_NEW_SERIES_CONCENTRATIONS.map(
        (concentration): StandardRow => ({
          id: _createUniqueId("row"),
          conc: concentration,
          signals: "",
        })
      ),
    };
    setSeriesList((prev) => [...prev, newSeries]);
    handleSelectSeries(newId);
  };

  const handleRemoveSeries = (id: string): void => {
    if (seriesList.length <= 1) return;
    const nextList = seriesList.filter((series) => series.id !== id);
    setSeriesList(nextList);
    if (activeSeriesId === id) {
      handleSelectSeries(nextList[0].id);
    }
  };

  const handleToggleSeriesVisibility = (id: string): void => {
    setSeriesList((prev) =>
      prev.map((series) =>
        series.id === id ? { ...series, visible: !series.visible } : series
      )
    );
  };

  const handleUpdateSeriesName = (id: string, name: string): void => {
    setSeriesList((prev) =>
      prev.map((series) => (series.id === id ? { ...series, name } : series))
    );
  };

  const seriesFitMap = useMemo((): _SeriesFitMapItem[] => {
    return seriesList.map((series): _SeriesFitMapItem => {
      try {
        const blanks = parseSignalNumbers(series.blankSignals);
        const standards: StandardData[] = [];
        series.standardRows.forEach((row) => {
          const concentration = parseFloat(row.conc);
          if (Number.isNaN(concentration) || concentration <= 0) return;
          parseSignalNumbers(row.signals).forEach((readout) => {
            standards.push({ concentration, readout });
          });
        });
        if (
          blanks.length < _MIN_REQUIRED_BLANKS ||
          standards.length < _MIN_REQUIRED_STANDARDS
        ) {
          return { series, results: null, qualityChecks: [] };
        }
        const results = calculateAdvancedLoD(
          blanks,
          standards,
          series.fitMethod
        );
        const qualityChecks = computeAssayQualityChecks(
          results,
          series.standardRows,
          series.blankSignals
        );
        return { series, results, qualityChecks };
      } catch {
        return { series, results: null, qualityChecks: [] };
      }
    });
  }, [seriesList]);

  const activeFitItem = useMemo((): _SeriesFitMapItem | undefined => {
    return (
      seriesFitMap.find((item) => item.series.id === activeSeries.id) ||
      seriesFitMap[0]
    );
  }, [seriesFitMap, activeSeries.id]);

  const activeResults = activeFitItem?.results || null;
  const activeQualityChecks = activeFitItem?.qualityChecks || [];

  const validVisibleSeries = useMemo((): _SeriesFitMapItem[] => {
    return seriesFitMap.filter(
      (item) => item.series.visible && item.results !== null
    );
  }, [seriesFitMap]);

  // When adding a new curve that has no data yet, fallback to the first valid series for display
  const displayFitItem = useMemo((): _SeriesFitMapItem | undefined => {
    if (activeResults) return activeFitItem;
    return validVisibleSeries[0] || activeFitItem;
  }, [activeResults, activeFitItem, validVisibleSeries]);

  const displayResults = displayFitItem?.results || null;
  const displaySeries = displayFitItem?.series || activeSeries;
  const highlightedSeriesId = activeResults
    ? activeSeries.id
    : displaySeries.id;

  const { xTicks, xDomain, breakStart, breakEnd } = useMemo(
    () =>
      computeGlobalLogXAxisLayout(
        validVisibleSeries.map((item) => ({
          actualX: item.results!.fit.actualX,
          lodConc: item.results!.lodConc,
          lodCILow: item.results!.lodCI.low,
        }))
      ),
    [validVisibleSeries]
  );

  const { yDomain, yTicks, yMajorTicks } = useMemo(
    () =>
      computeGlobalLinearYAxisLayout(
        validVisibleSeries.map((item) => ({
          actualY: item.results!.fit.actualY,
          lc: item.results!.lc,
          ld: item.results!.ld,
        }))
      ),
    [validVisibleSeries]
  );

  const leftAxisData = useMemo((): Array<{ x: number; y: number }> => {
    if (validVisibleSeries.length === 0 || !breakStart) return [];
    return [
      { x: xDomain[0], y: yDomain[0] },
      { x: breakStart, y: yDomain[0] },
    ];
  }, [validVisibleSeries, xDomain, breakStart, yDomain]);

  const rightAxisData = useMemo((): Array<{ x: number; y: number }> => {
    if (validVisibleSeries.length === 0 || !breakEnd) return [];
    return [
      { x: breakEnd, y: yDomain[0] },
      { x: xDomain[1], y: yDomain[0] },
    ];
  }, [validVisibleSeries, xDomain, breakEnd, yDomain]);

  const curveSeriesList = useMemo(
    (): MultiCurvePlotSeries[] =>
      _buildMultiCurvePlotSeries(
        validVisibleSeries,
        xDomain,
        breakStart,
        breakEnd,
        highlightedSeriesId
      ),
    [validVisibleSeries, xDomain, breakStart, breakEnd, highlightedSeriesId]
  );

  const leaderboardItems = useMemo((): SeriesLeaderboardItem[] => {
    const refItem =
      validVisibleSeries.find(
        (item) =>
          Number.isFinite(item.results?.lodConc) && item.results!.lodConc > 0
      ) || validVisibleSeries[0];
    const refLod =
      refItem && Number.isFinite(refItem.results?.lodConc)
        ? refItem.results!.lodConc
        : 0;

    return validVisibleSeries.map((item): SeriesLeaderboardItem => {
      const series = item.series;
      const results = item.results!;
      const isRef = series.id === refItem?.series.id;
      const foldChangeVsRef = computeSensitivityFoldChange(
        results.lodConc,
        refLod,
        isRef
      );
      return {
        id: series.id,
        name: series.name,
        color: series.color,
        isActive: series.id === highlightedSeriesId,
        results,
        foldChangeVsRef,
      };
    });
  }, [validVisibleSeries, highlightedSeriesId]);

  const updateRow = (
    id: string,
    field: "conc" | "signals",
    value: string
  ): void => {
    const newRows = activeSeries.standardRows.map((row) =>
      row.id === id ? { ...row, [field]: value } : row
    );
    updateActiveSeriesField("standardRows", newRows);
  };

  const handleClearData = (): void => {
    updateActiveSeriesField("blankSignals", "");
    updateActiveSeriesField("standardRows", [
      { id: "1", conc: "", signals: "" },
    ]);
    setHoveredPoint(null);
    setTableHoveredRowId(null);
    setHoveredSeriesId(null);
  };

  const handleSelectPreset = (index: number): void => {
    if (index < 0 || index >= DEMO_PRESETS.length) return;
    const preset = DEMO_PRESETS[index];
    setSeriesList(structuredClone(preset.series));
    handleSelectSeries(preset.series[0].id);
    setPlotTitle(preset.plotTitle);
    setSelectedPresetIndex(index);
    setHoveredPoint(null);
    setTableHoveredRowId(null);
    setHoveredSeriesId(null);
  };

  const handleProcessFile = (file: File): void => {
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>): void => {
      const text = event.target?.result as string;
      if (!text) return;
      const parsed = parseCSVData(text);
      if (parsed.multiSeries && parsed.multiSeries.length > 1) {
        setSeriesList(parsed.multiSeries);
        handleSelectSeries(parsed.multiSeries[0].id);
        alert(
          `Successfully imported ${parsed.multiSeries.length} curves from file!`
        );
      } else if (parsed.blankSignals || parsed.standards.length > 0) {
        if (parsed.seriesName) {
          updateActiveSeriesField("name", parsed.seriesName);
        }
        if (parsed.blankSignals) {
          updateActiveSeriesField("blankSignals", parsed.blankSignals);
        }
        if (parsed.standards.length > 0) {
          updateActiveSeriesField("standardRows", parsed.standards);
        }
        alert("Data imported successfully into current curve!");
      } else {
        alert(
          "Could not find any valid concentration-signal data in the uploaded file."
        );
      }
    };
    reader.readAsText(file);
  };

  const handleImportCSV = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleProcessFile(file);
    event.target.value = "";
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current += 1;
    if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current = 0;
    setIsDraggingOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleExportCSV = (): void => {
    if (!displayResults) return;
    const csvContent = buildMultiCurveCSVReport(
      seriesList,
      leaderboardItems,
      APP_VERSION
    );
    const dateStamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(
      csvContent,
      `bioassay_multi_curve_report_v${APP_VERSION}_${dateStamp}.csv`
    );
  };

  const handleDownloadTemplate = (): void => {
    const templateContent = buildMultiCurveTemplateCSV();
    downloadTextFile(templateContent, "bioassay_multi_curve_template.csv");
  };

  const handleCopyMetrics = (): void => {
    if (!displayResults) return;
    const targetResults = activeResults || displayResults;
    const targetSeries = activeResults ? activeSeries : displaySeries;
    const report = buildMarkdownAuditReport(
      targetSeries,
      targetResults,
      leaderboardItems,
      APP_VERSION
    );
    void navigator.clipboard.writeText(report);
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
        <div className="drag-drop-overlay">
          <div className="drag-drop-modal">
            <span style={{ fontSize: "3rem" }}>📂</span>
            <h2 style={{ margin: "0.5rem 0", color: "var(--text)" }}>
              Drop CSV / TSV File Here
            </h2>
            <p
              style={{ margin: 0, color: "var(--subtext1)", fontSize: "0.9rem" }}
            >
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
        selectedPresetIndex={selectedPresetIndex}
        onSelectPreset={handleSelectPreset}
        handleImportCSV={handleImportCSV}
        handleDownloadTemplate={handleDownloadTemplate}
      />
      <main className="main-container">
        <button
          className={`sidebar-toggle-btn ${isSidebarCollapsed ? "collapsed" : ""}`}
          onClick={(): void => setIsSidebarCollapsed(!isSidebarCollapsed)}
          title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={
            isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
          }
        >
          <svg
            className="sidebar-toggle-icon"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
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
          setBlankSignals={(value: string): void =>
            updateActiveSeriesField("blankSignals", value)
          }
          standardRows={activeSeries.standardRows}
          setStandardRows={(updater): void => {
            if (typeof updater === "function") {
              updateActiveSeriesField(
                "standardRows",
                updater(activeSeries.standardRows)
              );
            } else {
              updateActiveSeriesField("standardRows", updater);
            }
          }}
          updateRow={updateRow}
          onAddRow={(): void => {
            const newRow: StandardRow = {
              id: _createUniqueId("row"),
              conc: "",
              signals: "",
            };
            updateActiveSeriesField("standardRows", [
              ...activeSeries.standardRows,
              newRow,
            ]);
          }}
          onRemoveRow={(id: string): void => {
            const newRows = activeSeries.standardRows.filter(
              (row) => row.id !== id
            );
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
                hoveredSeriesId={hoveredSeriesId}
                setHoveredSeriesId={setHoveredSeriesId}
                onSelectSeries={handleSelectSeries}
              />
              <ResultsPanel
                activeSeries={displaySeries}
                activeResults={displayResults}
                pendingSeriesName={
                  !activeResults && seriesList.length > 1
                    ? activeSeries.name
                    : undefined
                }
                leaderboardItems={leaderboardItems}
                onSelectSeries={handleSelectSeries}
                xAxisLabel={xAxisLabel}
                fitMethod={displaySeries.fitMethod}
                setFitMethod={(method: FitMethod): void => {
                  if (activeResults) {
                    updateActiveSeriesField("fitMethod", method);
                  } else {
                    setSeriesList((prev) =>
                      prev.map((series) =>
                        series.id === displaySeries.id
                          ? { ...series, fitMethod: method }
                          : series
                      )
                    );
                  }
                }}
                handleCopyMetrics={handleCopyMetrics}
                handleExportCSV={handleExportCSV}
              />
            </div>
          ) : (
            <div className="empty-prompt">
              <p>
                Please provide at least {_MIN_REQUIRED_BLANKS} blank replicates
                and {_MIN_REQUIRED_STANDARDS} concentration standards to
                calculate the Limit of Detection (LOD).
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
