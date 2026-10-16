import React from "react";
import { getScientificParts } from "../utils/formatters";

/**
 * Props for the `ScientificDisplay` typography component.
 */
export interface ScientificDisplayProps {
  /** Numeric value to format and render. */
  value: number;
  /** Number of decimal places for the mantissa or decimal output (default `3`). */
  precision?: number;
  /** Optional concentration or signal unit suffix to render alongside the value. */
  unit?: string;
  /** Optional CSS class name appended to the root container span. */
  className?: string;
  /** Whether to display a parenthetical decimal equivalent for moderate negative exponents. */
  showSubDecimal?: boolean;
}

const _DEFAULT_DISPLAY_PRECISION = 3;
const _NON_EXPONENTIAL_MANTISSAS: ReadonlySet<string> = new Set(["N/A", "+∞", "-∞", "0"]);

/**
 * Checks whether a formatted mantissa represents a special non-exponential token
 * (`"N/A"`, `"+∞"`, `"-∞"`, or `"0"`) that should be rendered without exponent layout.
 *
 * @param mantissa - Mantissa string returned by `getScientificParts`.
 * @returns True if `mantissa` is a special non-exponential token.
 */
function _isNonExponentialMantissa(mantissa: string): boolean {
  return _NON_EXPONENTIAL_MANTISSAS.has(mantissa);
}

/**
 * Modern Typography Scientific Number Display Component.
 * Renders scientific notation with typographical superscripts and multiplication glyphs
 * (e.g., `4.611 × 10⁻²`) instead of exponential E-notation strings (`"4.611e-2"`).
 *
 * @param props - Component configuration properties.
 * @returns React element displaying the formatted scientific number.
 */
export const ScientificDisplay: React.FC<ScientificDisplayProps> = ({
  value,
  precision = _DEFAULT_DISPLAY_PRECISION,
  unit,
  className = "",
  showSubDecimal = false,
}: ScientificDisplayProps): React.ReactElement => {
  const parts = getScientificParts(value, precision);

  if (_isNonExponentialMantissa(parts.mantissa)) {
    return (
      <span className={`scientific-num ${className}`}>
        <span className="num-mantissa">{parts.mantissa}</span>
        {unit && <span className="num-unit" style={{ marginLeft: "4px" }}>{unit}</span>}
      </span>
    );
  }

  return (
    <span
      className={`scientific-num ${className}`}
      style={{ display: "inline-flex", alignItems: "baseline" }}
    >
      <span className="num-mantissa">{parts.mantissa}</span>
      {parts.exponent !== undefined && (
        <span
          className="num-exp"
          style={{ display: "inline-flex", alignItems: "baseline", opacity: 0.9 }}
        >
          <span className="num-times" style={{ margin: "0 2.5px", fontWeight: 400 }}>
            ×
          </span>
          <span className="num-base" style={{ fontWeight: 600 }}>
            10
          </span>
          <sup
            className="num-sup"
            style={{
              fontSize: "0.7em",
              lineHeight: 0,
              position: "relative",
              top: "-0.5em",
              marginLeft: "1px",
              fontWeight: 700,
            }}
          >
            {parts.exponent}
          </sup>
        </span>
      )}
      {unit && (
        <span
          className="num-unit"
          style={{ marginLeft: "6px", fontSize: "0.85em", fontWeight: 500, color: "var(--subtext0)" }}
        >
          {unit}
        </span>
      )}
      {showSubDecimal && parts.decimalEquivalent && parts.exponent !== undefined && (
        <span
          className="num-sub-decimal"
          style={{
            marginLeft: "6px",
            fontSize: "0.72em",
            fontWeight: 500,
            color: "var(--subtext0)",
            opacity: 0.8,
          }}
        >
          ({parts.decimalEquivalent} {unit})
        </span>
      )}
    </span>
  );
};
