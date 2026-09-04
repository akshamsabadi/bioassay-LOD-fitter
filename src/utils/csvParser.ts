export interface ParsedCSVResult {
  blankSignals: string;
  standards: {
    id: string;
    conc: string;
    signals: string;
  }[];
}

export const parseCSVData = (text: string): ParsedCSVResult => {
  const lines = text.split(/\r?\n/);
  const blanks: number[] = [];
  const standardMap = new Map<number, { concStr: string; signals: number[] }>();

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    // Detect delimiter: tab (Excel/Google Sheets), semicolon (European CSV), or comma
    const delimiter = trimmed.includes("\t") ? "\t" : (trimmed.includes(";") ? ";" : ",");
    const parts = trimmed.split(delimiter).map(part => part.trim().replace(/^["']|["']$/g, ""));
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

  const sortedStandards = Array.from(standardMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([_, data]) => ({
      id: Math.random().toString(36).substring(2, 9),
      conc: data.concStr,
      signals: data.signals.join(", ")
    }));

  return {
    blankSignals: blanks.join(", "),
    standards: sortedStandards
  };
};
