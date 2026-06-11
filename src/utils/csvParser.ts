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
  const standards: { id: string; conc: string; signals: string }[] = [];
  let blankSignals = '';

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const parts = trimmed.split(',').map(part => part.trim().replace(/^["']|["']$/g, ''));
    if (parts.length < 2) return;

    const firstCol = parts[0].toLowerCase();
    if (
      firstCol === 'parameter' ||
      firstCol === 'concentration' ||
      firstCol === 'signals' ||
      firstCol === 'concentration/parameter' ||
      firstCol === 'model parameter'
    ) {
      return;
    }

    if (firstCol === 'blank' || firstCol === 'blanks' || parseFloat(parts[0]) === 0) {
      const signals = parts.slice(1).map(p => parseFloat(p)).filter(n => !isNaN(n));
      if (signals.length > 0) {
        blankSignals = signals.join(', ');
      }
    } else {
      const concVal = parseFloat(parts[0]);
      if (!isNaN(concVal)) {
        const signals = parts.slice(1).map(p => parseFloat(p)).filter(n => !isNaN(n));
        if (signals.length > 0) {
          standards.push({
            id: Math.random().toString(36).substring(2, 9),
            conc: parts[0],
            signals: signals.join(', ')
          });
        }
      }
    }
  });

  standards.sort((a, b) => parseFloat(a.conc) - parseFloat(b.conc));

  return { blankSignals, standards };
};
