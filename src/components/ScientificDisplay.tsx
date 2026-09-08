import React from "react";
import { getScientificParts } from "../utils/formatters";

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
