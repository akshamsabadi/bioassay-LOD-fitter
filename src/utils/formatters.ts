export interface ScientificParts {
  mantissa: string;
  exponent?: number;
  decimalEquivalent?: string;
  plainText: string;
}

/**
 * Converts a number to unicode superscript characters (e.g. -2 -> ⁻²)
 */
export function toSuperscript(val: number | string): string {
  const map: Record<string, string> = {
    "-": "⁻",
    "+": "⁺",
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
  };
  return String(val)
    .split("")
    .map((c) => map[c] || c)
    .join("");
}

/**
 * Parses any numeric value into modern, typographically beautiful scientific parts.
 */
export function getScientificParts(val: number, precision = 3): ScientificParts {
  if (val === null || val === undefined || isNaN(val)) {
    return { mantissa: "N/A", plainText: "N/A" };
  }
  if (!isFinite(val)) {
    return { mantissa: val > 0 ? "+∞" : "-∞", plainText: val > 0 ? "+∞" : "-∞" };
  }
  if (val === 0) {
    return { mantissa: "0", decimalEquivalent: "0", plainText: "0" };
  }

  const absVal = Math.abs(val);

  // If number is in standard decimal range (0.01 to 9999), format cleanly as decimal
  // but if scientific exponential is needed (< 0.01 or >= 10000), split mantissa and exponent
  if (absVal < 0.01 || absVal >= 10000) {
    const expStr = val.toExponential(precision);
    const [mantissaPart, expPart] = expStr.split("e");
    const exponent = parseInt(expPart, 10);
    const mantissa = parseFloat(mantissaPart).toFixed(precision);

    // Compute decimal representation for subtext when exponent is moderately small (-1 to -4)
    let decimalEquivalent: string | undefined;
    if (exponent >= -4 && exponent < 0) {
      decimalEquivalent = val.toFixed(Math.abs(exponent) + precision - 1);
    }

    const plainText = `${mantissa} × 10^(${exponent})`;
    return { mantissa, exponent, decimalEquivalent, plainText };
  }

  // Normal decimal range
  const decimalStr = parseFloat(val.toFixed(precision)).toString();
  return { mantissa: decimalStr, decimalEquivalent: decimalStr, plainText: decimalStr };
}

/**
 * Formats a number with standard unicode scientific notation (e.g. "4.61 × 10⁻²")
 * for plain-text contexts (tooltips, titles, copy-paste markdown).
 */
export function formatScientificUnicode(val: number, precision = 2, unit?: string): string {
  if (val === null || val === undefined || isNaN(val)) return "N/A";
  if (!isFinite(val)) return val > 0 ? "+∞" : "-∞";
  if (val === 0) return unit ? `0 ${unit}` : "0";

  const absVal = Math.abs(val);
  if (absVal < 0.01 || absVal >= 10000) {
    const expStr = val.toExponential(precision);
    const [m, e] = expStr.split("e");
    const exponent = parseInt(e, 10);
    const formatted = `${parseFloat(m).toFixed(precision)} × 10${toSuperscript(exponent)}`;
    return unit ? `${formatted} ${unit}` : formatted;
  }

  const formatted = parseFloat(val.toFixed(precision)).toString();
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Formats a confidence interval range (e.g. "[3.682 × 10⁻², 5.551 × 10⁻²]")
 */
export function formatCIRange(low: number, high: number, precision = 3): string {
  if (!isFinite(low) || !isFinite(high)) return "N/A";
  return `[${formatScientificUnicode(low, precision)}, ${formatScientificUnicode(high, precision)}]`;
}
