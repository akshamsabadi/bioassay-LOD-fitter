/**
 * CSV and TSV parser for single-series and multi-series bioassay calibration data.
 * Supports comma, semicolon (with European decimal conversion), and tab delimiters,
 * common plate-reader blank labels, long-format replicate aggregation, and `# Series:` blocks.
 */
import { SERIES_COLORS, type StandardRow, type AssaySeries } from "../constants";

/**
 * Result returned when parsing a single block of CSV/TSV lines.
 */
export interface SingleSeriesParseResult {
  /** Comma-separated blank replicate signals. */
  blankSignals: string;
  /** Concentration-sorted calibration standard rows. */
  standards: StandardRow[];
}

/**
 * Complete result returned by `parseCSVData` across single-series or multi-series text inputs.
 */
export interface ParsedCSVResult {
  /** Comma-separated blank replicate signals for the primary/first series. */
  blankSignals: string;
  /** Concentration-sorted calibration standard rows for the primary/first series. */
  standards: StandardRow[];
  /** Populated when two or more `# Series: <name>` blocks are present in the input. */
  multiSeries?: AssaySeries[];
  /** Series name extracted from `# Series: <name>` when present. */
  seriesName?: string;
}

interface _SeriesBlock {
  name: string;
  lines: string[];
}

const _TAB_DELIMITER = "\t";
const _SEMICOLON_DELIMITER = ";";
const _COMMA_DELIMITER = ",";
const _COMMENT_PREFIX = "#";

const _EXACT_BLANK_LABELS: ReadonlySet<string> = new Set([
  "blank",
  "blanks",
  "background",
  "bkg",
  "zero",
]);

const _BLANK_LABEL_PREFIXES: readonly string[] = ["neg", "ctrl", "control"];
const _SERIES_HEADER_REGEX = /^#\s*series\s*:\s*(.+)$/i;
const _QUOTE_WRAP_REGEX = /^["']|["']$/g;
const _LINE_SPLIT_REGEX = /\r?\n/;

/**
 * Generates a compact random alphanumeric identifier for a standard row.
 *
 * @returns 7-character base-36 row ID string.
 */
function _createRowId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Generates a unique identifier for an imported multi-series curve.
 *
 * @param seriesIndex - Zero-based index of the series block.
 * @returns Unique imported series ID string.
 */
function _createSeriesId(seriesIndex: number): string {
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `imported-series-${seriesIndex + 1}-${randomSuffix}`;
}

/**
 * Detects the column delimiter for a single non-empty CSV/TSV line.
 * Prioritizes tab (Excel/Sheets clipboard), then semicolon (European CSV), then comma.
 *
 * @param trimmedLine - Trimmed single line of delimited text.
 * @returns Detected single-character delimiter (`"\t"`, `";"`, or `","`).
 */
function _detectDelimiter(trimmedLine: string): string {
  if (trimmedLine.includes(_TAB_DELIMITER)) {
    return _TAB_DELIMITER;
  }
  if (trimmedLine.includes(_SEMICOLON_DELIMITER)) {
    return _SEMICOLON_DELIMITER;
  }
  return _COMMA_DELIMITER;
}

/**
 * Splits a trimmed line into normalized cell strings, stripping outer quotes
 * and converting European decimal commas to dots when semicolon delimiters are used.
 *
 * @param trimmedLine - Trimmed single line of delimited text.
 * @returns Array of cleaned cell strings.
 */
function _parseDelimitedCells(trimmedLine: string): string[] {
  const delimiter = _detectDelimiter(trimmedLine);
  const rawParts = trimmedLine
    .split(delimiter)
    .map((part: string): string => part.trim().replace(_QUOTE_WRAP_REGEX, ""));

  if (delimiter === _SEMICOLON_DELIMITER) {
    return rawParts.map((part: string): string => part.replaceAll(",", "."));
  }
  return rawParts;
}

/**
 * Determines whether the first column cell of a row identifies an assay blank / zero control.
 * Recognizes zero concentration (`0`, `0.0`) as well as common plate reader labels
 * (`"blank"`, `"background"`, `"bkg"`, `"zero"`, `"neg..."`, `"ctrl..."`, `"control..."`).
 *
 * @param rawCellValue - First column string value from a delimited row.
 * @returns True if the row represents blank replicates.
 */
function _isBlankRowIdentifier(rawCellValue: string): boolean {
  const normalized = rawCellValue.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (_EXACT_BLANK_LABELS.has(normalized)) {
    return true;
  }
  if (_BLANK_LABEL_PREFIXES.some((prefix: string): boolean => normalized.startsWith(prefix))) {
    return true;
  }
  return parseFloat(normalized) === 0;
}

/**
 * Parses all valid finite numeric signal values from a slice of row cells.
 *
 * @param rawCells - Cell strings following the concentration/label column.
 * @returns Array of parsed finite numbers.
 */
function _parseNumericSignals(rawCells: string[]): number[] {
  return rawCells
    .map((cell: string): number => parseFloat(cell))
    .filter((val: number): boolean => Number.isFinite(val));
}

/**
 * Scans lines for `# Series: <name>` headers and partitions lines into named series blocks.
 *
 * @param lines - All lines from the input text.
 * @returns Array of extracted named series blocks (empty if no `# Series:` headers exist).
 */
function _extractSeriesBlocks(lines: string[]): _SeriesBlock[] {
  const seriesBlocks: _SeriesBlock[] = [];
  let currentBlockName = "";
  let currentBlockLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const seriesMatch = trimmed.match(_SERIES_HEADER_REGEX);
    if (seriesMatch) {
      if (currentBlockName && currentBlockLines.length > 0) {
        seriesBlocks.push({ name: currentBlockName, lines: currentBlockLines });
      }
      currentBlockName = seriesMatch[1].trim();
      currentBlockLines = [];
    } else if (currentBlockName) {
      currentBlockLines.push(line);
    }
  }

  if (currentBlockName && currentBlockLines.length > 0) {
    seriesBlocks.push({ name: currentBlockName, lines: currentBlockLines });
  }

  return seriesBlocks;
}

/**
 * Parses a single series block of CSV/TSV lines into blank signals and sorted standard rows.
 * Duplicate concentrations (e.g., long-format plate reader exports) are automatically aggregated.
 *
 * @param lines - Array of text lines belonging to a single calibration curve.
 * @returns Object containing comma-joined `blankSignals` and ascending-sorted `standards`.
 */
export const parseSingleSeriesBlock = (lines: string[]): SingleSeriesParseResult => {
  const blanks: number[] = [];
  const standardMap = new Map<number, { concStr: string; signals: number[] }>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(_COMMENT_PREFIX)) {
      continue;
    }

    const parts = _parseDelimitedCells(trimmed);
    if (parts.length < 2) {
      continue;
    }

    const firstCol = parts[0];
    const signals = _parseNumericSignals(parts.slice(1));
    if (signals.length === 0) {
      continue;
    }

    if (_isBlankRowIdentifier(firstCol)) {
      blanks.push(...signals);
      continue;
    }

    const concVal = parseFloat(firstCol);
    if (!Number.isFinite(concVal) || concVal <= 0) {
      continue;
    }

    if (!standardMap.has(concVal)) {
      standardMap.set(concVal, { concStr: firstCol, signals: [] });
    }
    standardMap.get(concVal)!.signals.push(...signals);
  }

  const sortedStandards: StandardRow[] = Array.from(standardMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, data]): StandardRow => ({
      id: _createRowId(),
      conc: data.concStr,
      signals: data.signals.join(", "),
    }));

  return {
    blankSignals: blanks.join(", "),
    standards: sortedStandards,
  };
};

/**
 * Parses full CSV or TSV text into single-series or multi-series bioassay calibration data.
 *
 * @param text - Raw CSV or TSV file/clipboard content.
 * @returns Parsed calibration data including `blankSignals`, `standards`, and optional `multiSeries`.
 */
export const parseCSVData = (text: string): ParsedCSVResult => {
  const allLines = text.split(_LINE_SPLIT_REGEX);
  const seriesBlocks = _extractSeriesBlocks(allLines);

  if (seriesBlocks.length > 1) {
    const multiSeries: AssaySeries[] = seriesBlocks.map((block: _SeriesBlock, idx: number): AssaySeries => {
      const parsed = parseSingleSeriesBlock(block.lines);
      return {
        id: _createSeriesId(idx),
        name: block.name,
        color: SERIES_COLORS[idx % SERIES_COLORS.length],
        visible: true,
        fitMethod: "auto",
        blankSignals: parsed.blankSignals,
        standardRows: parsed.standards,
      };
    });

    const firstSeries = multiSeries[0];
    return {
      blankSignals: firstSeries.blankSignals,
      standards: firstSeries.standardRows,
      multiSeries,
      seriesName: firstSeries.name,
    };
  }

  if (seriesBlocks.length === 1) {
    const single = parseSingleSeriesBlock(seriesBlocks[0].lines);
    return {
      blankSignals: single.blankSignals,
      standards: single.standards,
      seriesName: seriesBlocks[0].name,
    };
  }

  const single = parseSingleSeriesBlock(allLines);
  return {
    blankSignals: single.blankSignals,
    standards: single.standards,
  };
};
