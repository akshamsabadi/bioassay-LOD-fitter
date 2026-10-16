import React, { useState, useMemo } from "react";
import {
  computeReplicateStats,
  generateSerialDilutionRows,
  type AdvancedLoDResult,
  type ReplicateStats,
} from "../utils/calculations";
import { parseCSVData } from "../utils/csvParser";
import {
  parseReplicateTokens,
  type ReplicateToken,
} from "../utils/formatters";
import {
  BLANK_CV_WARNING_THRESHOLD,
  STANDARD_CV_WARNING_THRESHOLD,
  type AssaySeries,
  type StandardRow,
} from "../constants";
import { type HoveredPointData } from "./ChartCard";

/** Default starting concentration in the serial dilution generator modal. */
const _DEFAULT_DILUTION_START = "10";

/** Default geometric dilution factor in the serial dilution generator modal. */
const _DEFAULT_DILUTION_FACTOR = "3";

/** Default number of concentration steps in the serial dilution generator modal. */
const _DEFAULT_DILUTION_STEPS = 8;

/** Minimum allowed number of steps in the serial dilution generator modal. */
const _MIN_DILUTION_STEPS = 3;

/** Maximum allowed number of steps in the serial dilution generator modal. */
const _MAX_DILUTION_STEPS = 24;

/** Delay in milliseconds before focusing a newly appended standard concentration input. */
const _ROW_FOCUS_DELAY_MS = 50;

/** Props for the internal `_HighlightedSignalsInput` replicate input sub-component. */
interface _HighlightedSignalsInputProps {
  id?: string;
  className?: string;
  placeholder?: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onPaste?: (event: React.ClipboardEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  title?: string;
  highlightRepIndex?: number;
}

/**
 * Renders a replicate signals text input that overlays a visual highlight pill
 * on the specific replicate token currently hovered on the scatter chart.
 */
const HighlightedSignalsInput: React.FC<_HighlightedSignalsInputProps> = ({
  id,
  className = "signals-input",
  placeholder,
  value,
  onChange,
  onPaste,
  onKeyDown,
  title,
  highlightRepIndex,
}: _HighlightedSignalsInputProps): React.ReactElement => {
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const shouldShowHighlight =
    !isFocused && highlightRepIndex !== undefined && highlightRepIndex >= 0;

  const tokens = useMemo((): ReplicateToken[] => {
    if (!shouldShowHighlight) return [];
    return parseReplicateTokens(value);
  }, [shouldShowHighlight, value]);

  return (
    <div className="signals-input-container">
      <input
        id={id}
        type="text"
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onPaste={onPaste}
        onKeyDown={onKeyDown}
        onFocus={(): void => setIsFocused(true)}
        onBlur={(): void => setIsFocused(false)}
        title={title}
        style={{
          color: shouldShowHighlight ? "transparent" : undefined,
          caretColor: "var(--text)",
        }}
      />
      {shouldShowHighlight && (
        <div className="signals-input-overlay" aria-hidden="true">
          {tokens.map(
            (token: ReplicateToken, tokenIndex: number): React.ReactElement => {
              if (token.isReplicate && token.repIndex === highlightRepIndex) {
                return (
                  <span key={tokenIndex} className="replicate-highlight-value">
                    {token.text}
                  </span>
                );
              }
              return (
                <span key={tokenIndex} style={{ color: "var(--text)" }}>
                  {token.text}
                </span>
              );
            }
          )}
        </div>
      )}
    </div>
  );
};

/** Props for the internal `_BlankSignalRow` zero-concentration row sub-component. */
interface _BlankSignalRowProps {
  activeSeriesId: string;
  blankSignals: string;
  blankStats: ReplicateStats | null;
  hoveredPoint: HoveredPointData | null;
  setBlankSignals: (val: string) => void;
  onPaste: (event: React.ClipboardEvent<HTMLInputElement>) => void;
  setTableHoveredRowId: (id: string | null) => void;
}

/**
 * Renders the pinned zero-concentration Blank row at the top of the calibration data table.
 */
const _BlankSignalRow: React.FC<_BlankSignalRowProps> = ({
  activeSeriesId,
  blankSignals,
  blankStats,
  hoveredPoint,
  setBlankSignals,
  onPaste,
  setTableHoveredRowId,
}: _BlankSignalRowProps): React.ReactElement => {
  const isBlankHovered =
    (hoveredPoint?.seriesId ? hoveredPoint.seriesId === activeSeriesId : true) &&
    (hoveredPoint?.rowId === "blank" ||
      hoveredPoint?.id === "blank" ||
      Boolean(hoveredPoint?.id?.endsWith("-blank")) ||
      hoveredPoint?.conc === 0);
  const hasBlankWarning = Boolean(
    blankStats && blankStats.cv > BLANK_CV_WARNING_THRESHOLD
  );
  const blankHighlightRepIndex = isBlankHovered
    ? hoveredPoint?.repIndex
    : undefined;

  return (
    <div
      className={`data-row ${isBlankHovered ? "row-hovered" : ""} ${hasBlankWarning ? "has-warning" : ""}`}
      onMouseEnter={(): void => setTableHoveredRowId("blank")}
      onMouseLeave={(): void => setTableHoveredRowId(null)}
      title={
        blankStats
          ? `Blank (0 conc): n=${blankStats.n}, Mean=${blankStats.mean.toFixed(4)}, SD=${blankStats.sd.toFixed(4)}, CV=${blankStats.cv.toFixed(1)}%${hasBlankWarning ? " (⚠️ High Variance)" : ""}`
          : "Assay Blank (Conc = 0)"
      }
    >
      <div
        className="conc-input disabled"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "default",
        }}
        title="Blank (0 Conc)"
      >
        0
      </div>
      <HighlightedSignalsInput
        placeholder="Blank signals (e.g. 0.08, 0.12)"
        value={blankSignals}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
          setBlankSignals(event.target.value)
        }
        onPaste={onPaste}
        onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>): void => {
          if (event.key === "Enter") {
            event.preventDefault();
            document.getElementById("conc-input-0")?.focus();
          }
        }}
        highlightRepIndex={blankHighlightRepIndex}
        title={
          blankStats
            ? `Blanks: n=${blankStats.n} · Mean=${blankStats.mean.toFixed(4)} · CV=${blankStats.cv.toFixed(1)}%${hasBlankWarning ? " (⚠️ High Variance)" : ""}`
            : "Enter blank replicates separated by commas"
        }
      />
      <div
        style={{
          width: "24px",
          minWidth: "24px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {hasBlankWarning && blankStats && (
          <span
            title={`High Variance: Blank CV is ${blankStats.cv.toFixed(1)}% (>${BLANK_CV_WARNING_THRESHOLD}%)`}
            style={{ fontSize: "0.8rem", cursor: "help", lineHeight: 1 }}
          >
            ⚠️
          </span>
        )}
      </div>
    </div>
  );
};

/** Props for the internal `_SerialDilutionModal` dialog sub-component. */
interface _SerialDilutionModalProps {
  dilutionStartConc: string;
  setDilutionStartConc: (val: string) => void;
  dilutionFactor: string;
  setDilutionFactor: (val: string) => void;
  dilutionSteps: number | string;
  setDilutionSteps: (val: number | string) => void;
  dilutionDirection: "dilution" | "serial";
  setDilutionDirection: (direction: "dilution" | "serial") => void;
  onClose: () => void;
  onGenerate: () => void;
}

/**
 * Modal dialog allowing users to auto-generate a geometric serial dilution or multiplication series.
 */
const _SerialDilutionModal: React.FC<_SerialDilutionModalProps> = ({
  dilutionStartConc,
  setDilutionStartConc,
  dilutionFactor,
  setDilutionFactor,
  dilutionSteps,
  setDilutionSteps,
  dilutionDirection,
  setDilutionDirection,
  onClose,
  onGenerate,
}: _SerialDilutionModalProps): React.ReactElement => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        onClick={(event: React.MouseEvent<HTMLDivElement>): void =>
          event.stopPropagation()
        }
      >
        <div className="modal-header">
          <h3
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--yellow)",
            }}
          >
            <span>⚡</span> Serial Dilution Generator
          </h3>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--subtext0)",
              }}
            >
              Starting Concentration:
            </label>
            <input
              type="number"
              className="text-input"
              value={dilutionStartConc}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setDilutionStartConc(event.target.value)
              }
              placeholder="e.g. 10"
              step="any"
            />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <label
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--subtext0)",
                }}
              >
                Dilution Factor:
              </label>
              <input
                type="number"
                className="text-input"
                value={dilutionFactor}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setDilutionFactor(event.target.value)
                }
                placeholder="e.g. 3 for 1:3"
                step="any"
                min="1.01"
              />
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <label
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--subtext0)",
                }}
              >
                Number of Steps:
              </label>
              <input
                type="number"
                className="text-input"
                value={dilutionSteps}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setDilutionSteps(event.target.value)
                }
                onBlur={(): void => {
                  const parsed = parseInt(String(dilutionSteps), 10);
                  setDilutionSteps(
                    Number.isNaN(parsed)
                      ? _DEFAULT_DILUTION_STEPS
                      : Math.max(
                          _MIN_DILUTION_STEPS,
                          Math.min(_MAX_DILUTION_STEPS, parsed)
                        )
                  );
                }}
                min={_MIN_DILUTION_STEPS}
                max={_MAX_DILUTION_STEPS}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--subtext0)",
              }}
            >
              Dilution Mode:
            </label>
            <div
              style={{
                display: "flex",
                gap: "8px",
                backgroundColor: "var(--surface0)",
                padding: "4px",
                borderRadius: "var(--radius-pill)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <button
                type="button"
                onClick={(): void => setDilutionDirection("dilution")}
                style={{
                  flex: 1,
                  padding: "6px 12px",
                  borderRadius: "var(--radius-pill)",
                  fontSize: "0.76rem",
                  cursor: "pointer",
                  border: "none",
                  backgroundColor:
                    dilutionDirection === "dilution"
                      ? "var(--surface2)"
                      : "transparent",
                  color:
                    dilutionDirection === "dilution"
                      ? "var(--text)"
                      : "var(--subtext0)",
                  fontWeight: dilutionDirection === "dilution" ? 700 : 500,
                  transition: "all 0.18s ease",
                }}
              >
                Serial Dilution (÷ factor)
              </button>
              <button
                type="button"
                onClick={(): void => setDilutionDirection("serial")}
                style={{
                  flex: 1,
                  padding: "6px 12px",
                  borderRadius: "var(--radius-pill)",
                  fontSize: "0.76rem",
                  cursor: "pointer",
                  border: "none",
                  backgroundColor:
                    dilutionDirection === "serial"
                      ? "var(--surface2)"
                      : "transparent",
                  color:
                    dilutionDirection === "serial"
                      ? "var(--text)"
                      : "var(--subtext0)",
                  fontWeight: dilutionDirection === "serial" ? 700 : 500,
                  transition: "all 0.18s ease",
                }}
              >
                Multiplication (× factor)
              </button>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="action-btn-pill"
            onClick={onClose}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-pill)" }}
          >
            Cancel
          </button>
          <button
            className="action-btn-pill"
            onClick={onGenerate}
            style={{
              backgroundColor: "var(--indigo)",
              color: "#ffffff",
              borderColor: "transparent",
              padding: "8px 18px",
              borderRadius: "var(--radius-pill)",
              fontWeight: 700,
              boxShadow: "0 2px 10px rgba(99, 102, 241, 0.35)",
            }}
          >
            Generate Series
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Props for the `Sidebar` component managing plot axes, multi-curve series selection,
 * replicate calibration data entry, and automated quality diagnostics.
 */
export interface SidebarProps {
  seriesList: AssaySeries[];
  activeSeriesId: string;
  setActiveSeriesId: (id: string) => void;
  onAddSeries: () => void;
  onRemoveSeries: (id: string) => void;
  onToggleSeriesVisibility: (id: string) => void;
  onUpdateSeriesName: (id: string, name: string) => void;

  plotTitle: string;
  setPlotTitle: (val: string) => void;
  xAxisLabel: string;
  setXAxisLabel: (val: string) => void;
  yAxisLabel: string;
  setYAxisLabel: (val: string) => void;

  blankSignals: string;
  setBlankSignals: (val: string) => void;
  standardRows: StandardRow[];
  setStandardRows: React.Dispatch<React.SetStateAction<StandardRow[]>>;
  updateRow: (id: string, field: "conc" | "signals", value: string) => void;
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;

  hoveredPoint: HoveredPointData | null;
  setTableHoveredRowId: (id: string | null) => void;
  results: AdvancedLoDResult | null;
  qualityChecks: string[] | null;
  isCollapsed?: boolean;
}

/**
 * Collapsible left sidebar providing plot axis customization, curve series management,
 * tabular concentration/replicate input with spreadsheet paste support, serial dilution
 * generation, and assay quality diagnostics.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  seriesList,
  activeSeriesId,
  setActiveSeriesId,
  onAddSeries,
  onRemoveSeries,
  onToggleSeriesVisibility,
  onUpdateSeriesName,

  plotTitle,
  setPlotTitle,
  xAxisLabel,
  setXAxisLabel,
  yAxisLabel,
  setYAxisLabel,

  blankSignals,
  setBlankSignals,
  standardRows,
  setStandardRows,
  updateRow,
  onAddRow,
  onRemoveRow,

  hoveredPoint,
  setTableHoveredRowId,
  results,
  qualityChecks,
  isCollapsed = false,
}: SidebarProps): React.ReactElement => {
  const activeSeries =
    seriesList.find((series) => series.id === activeSeriesId) || seriesList[0];

  // Serial Dilution Generator State
  const [isDilutionModalOpen, setIsDilutionModalOpen] =
    useState<boolean>(false);
  const [dilutionStartConc, setDilutionStartConc] = useState<string>(
    _DEFAULT_DILUTION_START
  );
  const [dilutionFactor, setDilutionFactor] = useState<string>(
    _DEFAULT_DILUTION_FACTOR
  );
  const [dilutionSteps, setDilutionSteps] = useState<number | string>(
    _DEFAULT_DILUTION_STEPS
  );
  const [dilutionDirection, setDilutionDirection] = useState<
    "dilution" | "serial"
  >("dilution");

  const handleGenerateDilution = (): void => {
    const startConcentration = parseFloat(dilutionStartConc);
    const factor = parseFloat(dilutionFactor);
    const steps =
      typeof dilutionSteps === "number"
        ? dilutionSteps
        : parseInt(String(dilutionSteps), 10) || _DEFAULT_DILUTION_STEPS;

    if (
      Number.isNaN(startConcentration) ||
      startConcentration <= 0 ||
      Number.isNaN(factor) ||
      factor <= 1
    ) {
      alert(
        "Please enter a valid starting concentration (>0) and dilution factor (>1)."
      );
      return;
    }

    const newRows = generateSerialDilutionRows({
      startConcentration,
      dilutionFactor: factor,
      steps,
      direction: dilutionDirection,
    });
    setStandardRows(newRows);
    setIsDilutionModalOpen(false);
  };

  const handleConcKeyDown = (
    rowIndex: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ): void => {
    if (event.key === "Enter") {
      event.preventDefault();
      document.getElementById(`signals-input-${rowIndex}`)?.focus();
    }
  };

  const handleSignalKeyDown = (
    rowIndex: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ): void => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (rowIndex === standardRows.length - 1) {
        onAddRow();
        setTimeout((): void => {
          document.getElementById(`conc-input-${rowIndex + 1}`)?.focus();
        }, _ROW_FOCUS_DELAY_MS);
      } else {
        document.getElementById(`conc-input-${rowIndex + 1}`)?.focus();
      }
    }
  };

  const handleGlobalPaste = (event: React.ClipboardEvent<HTMLElement>): void => {
    const text = event.clipboardData.getData("text");
    if (!text) return;

    if (text.includes("\t") || text.includes("\n")) {
      const parsed = parseCSVData(text);
      if (parsed.standards.length > 0 || parsed.blankSignals) {
        event.preventDefault();
        if (parsed.blankSignals) {
          setBlankSignals(parsed.blankSignals);
        }
        if (parsed.standards.length > 0) {
          setStandardRows(parsed.standards);
        }
      }
    }
  };

  const _handleReplicateCellPaste = (
    event: React.ClipboardEvent<HTMLInputElement>,
    onUpdateSignals: (formattedSignals: string) => void
  ): void => {
    const text = event.clipboardData.getData("text");
    if (!text) return;

    const lowerText = text.toLowerCase();
    const isFullTable =
      (lowerText.includes("conc") || lowerText.includes("dose")) &&
      (text.includes("\t") || text.includes("\n"));
    if (isFullTable) {
      const parsed = parseCSVData(text);
      if (parsed.standards.length > 0) {
        event.preventDefault();
        if (parsed.blankSignals) {
          setBlankSignals(parsed.blankSignals);
        }
        setStandardRows(parsed.standards);
        return;
      }
    }

    if (text.includes("\t") || text.includes("\n") || text.includes(";")) {
      const numbers = text
        .split(/[\t\r\n,;]+/)
        .map((token) => token.trim().replace(",", "."))
        .filter((token) => !Number.isNaN(parseFloat(token)));
      if (numbers.length > 0) {
        event.preventDefault();
        onUpdateSignals(numbers.join(", "));
      }
    }
  };

  const blankStats = computeReplicateStats(blankSignals);

  return (
    <>
      <aside
        className={`sidebar ${isCollapsed ? "collapsed" : ""}`}
        onPaste={handleGlobalPaste}
      >
        {/* SECTION: PLOT AXES & TITLE */}
        <section
          className="sidebar-section"
          style={{
            margin: 0,
            paddingBottom: "12px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <details style={{ margin: 0, fontSize: "0.8rem" }}>
            <summary
              style={{
                cursor: "pointer",
                fontWeight: 600,
                color: "var(--subtext0)",
                userSelect: "none",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 0",
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Plot Axes & Title</span>
            </summary>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginTop: "10px",
              }}
            >
              <input
                type="text"
                className="text-input"
                placeholder="Chart Title"
                value={plotTitle}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setPlotTitle(event.target.value)
                }
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  className="text-input"
                  placeholder="X Axis (Conc)"
                  value={xAxisLabel}
                  onChange={(
                    event: React.ChangeEvent<HTMLInputElement>
                  ): void => setXAxisLabel(event.target.value)}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <input
                  type="text"
                  className="text-input"
                  placeholder="Y Axis (Signal)"
                  value={yAxisLabel}
                  onChange={(
                    event: React.ChangeEvent<HTMLInputElement>
                  ): void => setYAxisLabel(event.target.value)}
                  style={{ flex: 1, minWidth: 0 }}
                />
              </div>
            </div>
          </details>
        </section>

        {/* SECTION: CURVES & CONDITIONS */}
        <section
          className="sidebar-section"
          style={{
            margin: 0,
            paddingBottom: "12px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "4px",
            }}
          >
            <span className="section-title">Curves & Conditions</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexWrap: "wrap",
              paddingBottom: "4px",
            }}
          >
            {seriesList.map((series): React.ReactElement => {
              const isActive = series.id === activeSeriesId;
              return (
                <div
                  key={series.id}
                  onClick={(): void => setActiveSeriesId(series.id)}
                  className={`curve-pill ${isActive ? "active" : ""}`}
                  style={{
                    boxShadow: isActive ? `0 0 0 1.5px ${series.color}` : "none",
                    borderColor: isActive ? "transparent" : undefined,
                  }}
                  title={`Click to edit ${series.name}`}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: series.color,
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      maxWidth: "105px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {series.name}
                  </span>
                  <button
                    onClick={(
                      event: React.MouseEvent<HTMLButtonElement>
                    ): void => {
                      event.stopPropagation();
                      onToggleSeriesVisibility(series.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      opacity: series.visible ? 1 : 0.35,
                      color: "inherit",
                      display: "flex",
                      alignItems: "center",
                    }}
                    title={
                      series.visible
                        ? "Hide curve on plot"
                        : "Show curve on plot"
                    }
                  >
                    {series.visible ? (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8-11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    )}
                  </button>
                  {seriesList.length > 1 && (
                    <button
                      onClick={(
                        event: React.MouseEvent<HTMLButtonElement>
                      ): void => {
                        event.stopPropagation();
                        onRemoveSeries(series.id);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        color: "var(--subtext0)",
                        fontSize: "0.85rem",
                        lineHeight: 1,
                      }}
                      title="Delete this curve"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}

            <button
              onClick={onAddSeries}
              className="curve-pill"
              style={{
                backgroundColor: "transparent",
                borderStyle: "dashed",
                borderColor: "var(--border-hover)",
                color: "var(--indigo)",
                fontWeight: 600,
              }}
              title="Overlay a new curve series onto the plot"
            >
              <span style={{ fontSize: "0.85rem" }}>+</span> Add Curve
            </button>
          </div>

          {/* Active Curve Rename Input */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "4px",
            }}
          >
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--subtext0)",
                whiteSpace: "nowrap",
              }}
            >
              Curve Label:
            </span>
            <input
              type="text"
              className="text-input"
              value={activeSeries.name}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                onUpdateSeriesName(activeSeries.id, event.target.value)
              }
              style={{
                flex: 1,
                padding: "5px 10px",
                fontSize: "0.75rem",
                height: "28px",
              }}
              placeholder="Series Name"
            />
          </div>
        </section>

        {/* UNIFIED DATA ENTRY TABLE */}
        <section
          className="sidebar-section"
          style={{
            margin: 0,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "4px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: activeSeries.color,
                  flexShrink: 0,
                }}
              />
              <span className="section-title">
                {seriesList.length > 1
                  ? `${activeSeries.name} Data`
                  : "Calibration Data"}
              </span>
            </div>
            <span
              className="curve-badge"
              title="Total standard concentration points (excluding blank)"
            >
              {standardRows.length} pts
            </span>
          </div>

          {/* Table Column Headers */}
          <div
            style={{
              display: "flex",
              gap: "6px",
              alignItems: "center",
              paddingRight: "16px",
              marginBottom: "4px",
            }}
          >
            <span
              style={{
                width: "62px",
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "var(--subtext0)",
                textAlign: "center",
                letterSpacing: "0.04em",
                userSelect: "none",
              }}
            >
              CONC
            </span>
            <span
              style={{
                flex: 1,
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "var(--subtext0)",
                paddingLeft: "6px",
                letterSpacing: "0.04em",
                userSelect: "none",
              }}
            >
              REPLICATES (SIGNALS)
            </span>
            <span style={{ width: "24px" }} />
          </div>

          <div
            className="rows-container"
            style={{
              flex: 1,
              overflowY: "auto",
              marginBottom: "8px",
              paddingRight: "6px",
            }}
          >
            {/* Blank Row (Conc = 0) */}
            <_BlankSignalRow
              activeSeriesId={activeSeriesId}
              blankSignals={blankSignals}
              blankStats={blankStats}
              hoveredPoint={hoveredPoint}
              setBlankSignals={setBlankSignals}
              onPaste={(
                event: React.ClipboardEvent<HTMLInputElement>
              ): void => _handleReplicateCellPaste(event, setBlankSignals)}
              setTableHoveredRowId={setTableHoveredRowId}
            />

            {/* Standard Concentration Rows */}
            {standardRows.map(
              (
                standardRow: StandardRow,
                rowIndex: number
              ): React.ReactElement => {
                const stats = computeReplicateStats(standardRow.signals);
                const hasHighCV = Boolean(
                  stats && stats.cv > STANDARD_CV_WARNING_THRESHOLD
                );
                const isRowHovered =
                  (hoveredPoint?.seriesId
                    ? hoveredPoint.seriesId === activeSeriesId
                    : true) &&
                  (hoveredPoint?.rowId === standardRow.id ||
                    hoveredPoint?.id === standardRow.id);
                const repHighlightIndex = isRowHovered
                  ? hoveredPoint?.repIndex
                  : undefined;
                const rowTooltip = stats
                  ? `Conc: ${standardRow.conc || "—"} | n=${stats.n}, Mean=${stats.mean.toFixed(4)}, SD=${stats.sd.toFixed(4)}, CV=${stats.cv.toFixed(1)}%${hasHighCV ? " (⚠️ High Variance)" : ""}`
                  : undefined;

                return (
                  <div
                    key={standardRow.id}
                    className={`data-row ${isRowHovered ? "row-hovered" : ""} ${hasHighCV ? "has-warning" : ""}`}
                    onMouseEnter={(): void =>
                      setTableHoveredRowId(standardRow.id)
                    }
                    onMouseLeave={(): void => setTableHoveredRowId(null)}
                    title={rowTooltip}
                  >
                    <input
                      id={`conc-input-${rowIndex}`}
                      type="text"
                      className="conc-input"
                      placeholder="Conc"
                      value={standardRow.conc}
                      onChange={(
                        event: React.ChangeEvent<HTMLInputElement>
                      ): void =>
                        updateRow(standardRow.id, "conc", event.target.value)
                      }
                      onKeyDown={(
                        event: React.KeyboardEvent<HTMLInputElement>
                      ): void => handleConcKeyDown(rowIndex, event)}
                    />
                    <HighlightedSignalsInput
                      id={`signals-input-${rowIndex}`}
                      placeholder="Replicates (e.g. 0.15, 0.17, 0.16)"
                      value={standardRow.signals}
                      onChange={(
                        event: React.ChangeEvent<HTMLInputElement>
                      ): void =>
                        updateRow(standardRow.id, "signals", event.target.value)
                      }
                      onPaste={(
                        event: React.ClipboardEvent<HTMLInputElement>
                      ): void =>
                        _handleReplicateCellPaste(
                          event,
                          (formattedSignals: string): void =>
                            updateRow(
                              standardRow.id,
                              "signals",
                              formattedSignals
                            )
                        )
                      }
                      onKeyDown={(
                        event: React.KeyboardEvent<HTMLInputElement>
                      ): void => handleSignalKeyDown(rowIndex, event)}
                      highlightRepIndex={repHighlightIndex}
                      title={rowTooltip}
                    />
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                        width: "24px",
                        minWidth: "24px",
                        flexShrink: 0,
                        justifyContent: "flex-end",
                      }}
                    >
                      {hasHighCV && stats && (
                        <span
                          title={`High Variance: CV is ${stats.cv.toFixed(1)}% (>${STANDARD_CV_WARNING_THRESHOLD}%)`}
                          style={{
                            fontSize: "0.8rem",
                            cursor: "help",
                            lineHeight: 1,
                            flexShrink: 0,
                          }}
                        >
                          ⚠️
                        </span>
                      )}
                      <button
                        className="remove-row-btn"
                        onClick={(): void => onRemoveRow(standardRow.id)}
                        title="Delete row"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              width: "100%",
              marginTop: "4px",
            }}
          >
            <button
              onClick={onAddRow}
              className="action-btn-pill"
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--surface0)",
                color: "var(--indigo)",
                fontWeight: 600,
                border: "1px dashed var(--border-hover)",
                fontSize: "0.8rem",
              }}
              title="Add a new standard concentration point (or press Enter)"
            >
              <span style={{ fontSize: "0.9rem" }}>+</span> Add Point
            </button>

            <button
              onClick={(): void => setIsDilutionModalOpen(true)}
              className="action-btn-pill"
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--surface0)",
                color: "var(--yellow)",
                fontWeight: 600,
                border: "1px dashed var(--border-hover)",
                fontSize: "0.8rem",
              }}
              title="Auto-generate a serial dilution series"
            >
              ⚡ Auto-Dilute
            </button>
          </div>
        </section>

        {/* SERIAL DILUTION GENERATOR MODAL */}
        {isDilutionModalOpen && (
          <_SerialDilutionModal
            dilutionStartConc={dilutionStartConc}
            setDilutionStartConc={setDilutionStartConc}
            dilutionFactor={dilutionFactor}
            setDilutionFactor={setDilutionFactor}
            dilutionSteps={dilutionSteps}
            setDilutionSteps={setDilutionSteps}
            dilutionDirection={dilutionDirection}
            setDilutionDirection={setDilutionDirection}
            onClose={(): void => setIsDilutionModalOpen(false)}
            onGenerate={handleGenerateDilution}
          />
        )}

        {/* SECTION 4: ASSAY DIAGNOSTICS */}
        {results && (
          <section
            className="sidebar-section"
            style={{
              margin: 0,
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: "12px",
            }}
          >
            <span
              className="section-title"
              style={{
                color: "var(--subtext0)",
                display: "block",
                marginBottom: "4px",
              }}
            >
              {activeSeries.name} Diagnostics
            </span>
            {qualityChecks && qualityChecks.length > 0 ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                {qualityChecks.map(
                  (warning: string, warningIndex: number): React.ReactElement => (
                    <div
                      key={warningIndex}
                      style={{
                        fontSize: "0.74rem",
                        color: "var(--text)",
                        backgroundColor:
                          "color-mix(in srgb, var(--peach) 8%, var(--surface0))",
                        borderRadius: "var(--radius-sm)",
                        border:
                          "1px solid color-mix(in srgb, var(--peach) 25%, transparent)",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        padding: "8px 12px",
                      }}
                    >
                      <span style={{ fontSize: "0.85rem", lineHeight: 1 }}>
                        ⚠️
                      </span>
                      <span style={{ lineHeight: 1.4 }}>{warning}</span>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div
                style={{
                  fontSize: "0.74rem",
                  color: "var(--green)",
                  backgroundColor:
                    "color-mix(in srgb, var(--green) 8%, var(--surface0))",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 12px",
                  border:
                    "1px solid color-mix(in srgb, var(--green) 25%, transparent)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span style={{ fontWeight: "bold" }}>✓</span>
                <span>All quality metrics within expected ranges.</span>
              </div>
            )}
          </section>
        )}
      </aside>
    </>
  );
};
