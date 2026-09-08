import { SERIES_COLORS, type StandardRow, type AssaySeries } from "../constants";

export interface ParsedCSVResult {
  blankSignals: string;
  standards: StandardRow[];
  multiSeries?: AssaySeries[];
  seriesName?: string;
}

export const parseSingleSeriesBlock = (lines: string[]): { blankSignals: string; standards: StandardRow[] } => {
  const blanks: number[] = [];
  const standardMap = new Map<number, { concStr: string; signals: number[] }>();

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    // Detect delimiter: tab (Excel/Google Sheets), semicolon, or comma
    const delimiter = trimmed.includes("\t") ? "\t" : (trimmed.includes(";") ? ";" : ",");
    const rawParts = trimmed.split(delimiter).map(part => part.trim().replace(/^["']|["']$/g, ""));
    // Normalize European decimal notation (comma to dot) when semicolon delimiter is used
    const parts = delimiter === ";"
      ? rawParts.map(part => part.replace(",", "."))
      : rawParts;
    if (parts.length < 2) return;

    const firstCol = parts[0].toLowerCase();
    
    // Check for blanks
    if (firstCol === "blank" || firstCol === "blanks" || parseFloat(parts[0]) === 0) {
      const signals = parts.slice(1).map(p => parseFloat(p)).filter(n => !isNaN(n));
      if (signals.length > 0) {
        blanks.push(...signals);
      }
      return;
    }

    const concVal = parseFloat(parts[0]);
    // Skip non-numeric header lines (e.g. "Concentration", "Dose", "Parameter")
    if (isNaN(concVal)) {
      return;
    }

    const signals = parts.slice(1).map(p => parseFloat(p)).filter(n => !isNaN(n));
    if (signals.length > 0) {
      if (!standardMap.has(concVal)) {
        standardMap.set(concVal, { concStr: parts[0], signals: [] });
      }
      standardMap.get(concVal)!.signals.push(...signals);
    }
  });

  const sortedStandards: StandardRow[] = Array.from(standardMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, data]) => ({
      id: Math.random().toString(36).substring(2, 9),
      conc: data.concStr,
      signals: data.signals.join(", ")
    }));

  return {
    blankSignals: blanks.join(", "),
    standards: sortedStandards
  };
};

export const parseCSVData = (text: string): ParsedCSVResult => {
  const allLines = text.split(/\r?\n/);
  
  // Check if multiple series are defined with "# Series: <name>" or "# SERIES: <name>"
  const seriesBlocks: { name: string; lines: string[] }[] = [];
  let currentBlockName = "";
  let currentBlockLines: string[] = [];

  for (const line of allLines) {
    const trimmed = line.trim();
    const seriesMatch = trimmed.match(/^#\s*(?:series|SERIES|Series)\s*:\s*(.+)$/i);
    if (seriesMatch) {
      if (currentBlockName && currentBlockLines.length > 0) {
        seriesBlocks.push({ name: currentBlockName, lines: currentBlockLines });
      }
      currentBlockName = seriesMatch[1].trim();
      currentBlockLines = [];
    } else {
      if (currentBlockName) {
        currentBlockLines.push(line);
      }
    }
  }

  if (currentBlockName && currentBlockLines.length > 0) {
    seriesBlocks.push({ name: currentBlockName, lines: currentBlockLines });
  }

  // If multi-series blocks were detected
  if (seriesBlocks.length > 1) {
    const multiSeries: AssaySeries[] = seriesBlocks.map((block, idx) => {
      const parsed = parseSingleSeriesBlock(block.lines);
      return {
        id: "imported-series-" + (idx + 1) + "-" + Math.random().toString(36).substring(2, 6),
        name: block.name,
        color: SERIES_COLORS[idx % SERIES_COLORS.length],
        visible: true,
        fitMethod: "auto",
        blankSignals: parsed.blankSignals,
        standardRows: parsed.standards
      };
    });

    const firstParsed = parseSingleSeriesBlock(seriesBlocks[0].lines);
    return {
      blankSignals: firstParsed.blankSignals,
      standards: firstParsed.standards,
      multiSeries,
      seriesName: seriesBlocks[0].name
    };
  }

  // Single series declared with '# Series: <name>'
  if (seriesBlocks.length === 1) {
    const single = parseSingleSeriesBlock(seriesBlocks[0].lines);
    return {
      blankSignals: single.blankSignals,
      standards: single.standards,
      seriesName: seriesBlocks[0].name
    };
  }

  // Single series default
  const single = parseSingleSeriesBlock(allLines);
  return {
    blankSignals: single.blankSignals,
    standards: single.standards
  };
};
