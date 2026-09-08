import React from "react";

export interface ScientificParts {
  mantissa: string;
  exponent?: number;
  decimalEquivalent?: string;
  plainText: string;
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

interface ScientificDisplayProps {
  value: number;
  precision?: number;
  unit?: string;
  className?: string;
  showSubDecimal?: boolean;
}

/**
 * Modern Typography Scientific Number Display Component
 * Renders scientific notation with elegant superscript and multiplication glyph (e.g. 4.611 × 10⁻²)
 * instead of harsh terminal strings like "4.611e-2".
 */
export const ScientificDisplay: React.FC<ScientificDisplayProps> = ({
  value,
  precision = 3,
  unit,
  className = "",
  showSubDecimal = false,
}) => {
  const parts = getScientificParts(value, precision);

  if (parts.mantissa === "N/A" || parts.mantissa === "+∞" || parts.mantissa === "-∞" || parts.mantissa === "0") {
    return (
      <span className={`scientific-num ${className}`}>
        <span className="num-mantissa">{parts.mantissa}</span>
        {unit && <span className="num-unit" style={{ marginLeft: "4px" }}>{unit}</span>}
      </span>
    );
  }

  return (
    <span className={`scientific-num ${className}`} style={{ display: "inline-flex", alignItems: "baseline", gap: "2px" }}>
      <span className="num-mantissa">{parts.mantissa}</span>
      {parts.exponent !== undefined && (
        <span className="num-exp" style={{ display: "inline-flex", alignItems: "baseline", marginLeft: "2px", opacity: 0.9 }}>
          <span className="num-times" style={{ margin: "0 2px", fontWeight: 400 }}>×</span>
          <span className="num-base" style={{ fontWeight: 600 }}>10</span>
          <sup className="num-sup" style={{ fontSize: "0.7em", lineHeight: 0, position: "relative", top: "-0.5em", marginLeft: "1px", fontWeight: 700 }}>
            {parts.exponent}
          </sup>
        </span>
      )}
      {unit && (
        <span className="num-unit" style={{ marginLeft: "6px", fontSize: "0.85em", fontWeight: 500, color: "var(--subtext0)" }}>
          {unit}
        </span>
      )}
      {showSubDecimal && parts.decimalEquivalent && parts.exponent !== undefined && (
        <span className="num-sub-decimal" style={{ marginLeft: "6px", fontSize: "0.72em", fontWeight: 500, color: "var(--subtext0)", opacity: 0.8 }}>
          ({parts.decimalEquivalent} {unit})
        </span>
      )}
    </span>
  );
};

/**
 * Formats a confidence interval range (e.g. [3.68 × 10⁻², 5.55 × 10⁻²])
 */
export function formatCIRange(low: number, high: number, precision = 2): React.ReactNode {
  if (isNaN(low) || isNaN(high)) return "N/A";
  
  const lowParts = getScientificParts(low, precision);
  const highParts = getScientificParts(high, precision);

  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: "4px" }}>
      <span style={{ display: "inline-flex", alignItems: "baseline" }}>
        <span>{lowParts.mantissa}</span>
        {lowParts.exponent !== undefined && (
          <span>
            <span style={{ margin: "0 1px" }}>×10</span>
            <sup style={{ fontSize: "0.75em", lineHeight: 0, position: "relative", top: "-0.45em" }}>{lowParts.exponent}</sup>
          </span>
        )}
      </span>
      <span style={{ color: "var(--subtext0)", margin: "0 2px" }}>–</span>
      <span style={{ display: "inline-flex", alignItems: "baseline" }}>
        <span>{highParts.mantissa}</span>
        {highParts.exponent !== undefined && (
          <span>
            <span style={{ margin: "0 1px" }}>×10</span>
            <sup style={{ fontSize: "0.75em", lineHeight: 0, position: "relative", top: "-0.45em" }}>{highParts.exponent}</sup>
          </span>
        )}
      </span>
    </span>
  );
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

