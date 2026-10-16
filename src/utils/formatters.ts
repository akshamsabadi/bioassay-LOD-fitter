/**
 * Numeric and text formatting utilities for scientific notation, confidence intervals,
 * curve model labels, axis units, and replicate input tokenization.
 */

/**
 * Structured representation of a number formatted for scientific or decimal display.
 */
export interface ScientificParts {
  /** Formatted significand (mantissa) or special symbol ("N/A", "+∞", "-∞", "0"). */
  mantissa: string;
  /** Base-10 exponent when scientific notation is used; undefined for standard decimals. */
  exponent?: number;
  /** Plain decimal string equivalent for moderate negative exponents or standard decimals. */
  decimalEquivalent?: string;
  /** Plain-text representation suitable for tooltips or fallback text. */
  plainText: string;
}

/**
 * Token segment parsed from a raw replicate signals input string.
 */
export interface ReplicateToken {
  /** Raw text slice belonging to this token (delimiter, whitespace, or numeric value). */
  text: string;
  /** True when this token represents a replicate value rather than whitespace or punctuation. */
  isReplicate: boolean;
  /** Zero-based replicate index when `isReplicate` is true. */
  repIndex?: number;
}

const _SUPERSCRIPT_CHAR_MAP: Readonly<Record<string, string>> = {
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

const _SCIENTIFIC_LOWER_THRESHOLD = 0.01;
const _SCIENTIFIC_UPPER_THRESHOLD = 10_000;
const _PARAMETER_SCIENTIFIC_UPPER_THRESHOLD = 1_000;
const _MIN_SUBTEXT_EXPONENT = -4;
const _DEFAULT_SCIENTIFIC_PRECISION = 3;
const _DEFAULT_UNICODE_PRECISION = 2;
const _DEFAULT_PARAMETER_FIXED_PRECISION = 4;

const _NOT_AVAILABLE_TEXT = "N/A";
const _POSITIVE_INFINITY_TEXT = "+∞";
const _NEGATIVE_INFINITY_TEXT = "-∞";

const _AXIS_DESCRIPTOR_WORDS: ReadonlySet<string> = new Set([
  "concentration",
  "conc",
  "dose",
  "amount",
  "signal",
  "dilution",
  "standard",
]);

const _MAX_UNBRACKETED_UNIT_LENGTH = 10;
const _UNIT_BRACKET_REGEX = /\(([^)]+)\)|\[([^\]]+)\]/;
const _REPLICATE_DELIMITER_SPLIT_REGEX = /([,;\t]+)/;
const _REPLICATE_DELIMITER_ONLY_REGEX = /^[,;\t]+$/;

const _MODEL_DISPLAY_LABELS: Readonly<Record<string, string>> = {
  linear: "Linear Model",
  langmuir: "Langmuir Isotherm",
  "4pl": "4PL Sigmoidal",
  "5pl": "5PL Asymmetric",
};

/**
 * Converts a number or string of digits/signs into Unicode superscript characters (e.g., `-2` -> `"⁻²"`).
 *
 * @param value - Numeric exponent or string representation to convert.
 * @returns String with digits and signs mapped to Unicode superscripts.
 */
export function toSuperscript(value: number | string): string {
  return String(value)
    .split("")
    .map((char: string): string => _SUPERSCRIPT_CHAR_MAP[char] ?? char)
    .join("");
}

/**
 * Determines whether a finite non-zero number should be formatted using scientific notation
 * based on lower and upper magnitude thresholds.
 *
 * @param value - Numeric value to evaluate.
 * @param upperThreshold - Upper absolute value threshold (inclusive) for scientific notation (default `10_000`).
 * @param lowerThreshold - Lower absolute value threshold (exclusive) for scientific notation (default `0.01`).
 * @returns True if `value` is finite, non-zero, and outside `[lowerThreshold, upperThreshold)`.
 */
export function shouldUseScientificNotation(
  value: number,
  upperThreshold: number = _SCIENTIFIC_UPPER_THRESHOLD,
  lowerThreshold: number = _SCIENTIFIC_LOWER_THRESHOLD
): boolean {
  if (!Number.isFinite(value)) {
    return false;
  }
  const absValue = Math.abs(value);
  return absValue > 0 && (absValue < lowerThreshold || absValue >= upperThreshold);
}

/**
 * Decomposes any numeric value into structured scientific notation or decimal display parts.
 *
 * @param value - Numeric value to decompose.
 * @param precision - Number of decimal places for the mantissa or decimal representation (default `3`).
 * @returns Structured `ScientificParts` object containing mantissa, optional exponent, and plainText.
 */
export function getScientificParts(
  value: number,
  precision: number = _DEFAULT_SCIENTIFIC_PRECISION
): ScientificParts {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return { mantissa: _NOT_AVAILABLE_TEXT, plainText: _NOT_AVAILABLE_TEXT };
  }
  if (!Number.isFinite(value)) {
    const infinitySymbol = value > 0 ? _POSITIVE_INFINITY_TEXT : _NEGATIVE_INFINITY_TEXT;
    return { mantissa: infinitySymbol, plainText: infinitySymbol };
  }
  if (value === 0) {
    return { mantissa: "0", decimalEquivalent: "0", plainText: "0" };
  }

  const clampedPrecision = Math.max(0, Math.trunc(precision));

  if (shouldUseScientificNotation(value)) {
    const expStr = value.toExponential(clampedPrecision);
    const [mantissaPart, expPart] = expStr.split("e");
    const exponent = parseInt(expPart, 10);
    const mantissa = parseFloat(mantissaPart).toFixed(clampedPrecision);

    let decimalEquivalent: string | undefined;
    if (exponent >= _MIN_SUBTEXT_EXPONENT && exponent < 0) {
      decimalEquivalent = value.toFixed(Math.abs(exponent) + clampedPrecision);
    }

    const plainText = `${mantissa} × 10^(${exponent})`;
    return { mantissa, exponent, decimalEquivalent, plainText };
  }

  const decimalStr = parseFloat(value.toFixed(clampedPrecision)).toString();
  return { mantissa: decimalStr, decimalEquivalent: decimalStr, plainText: decimalStr };
}

/**
 * Formats a numeric value using Unicode scientific notation (e.g., `"4.61 × 10⁻²"`)
 * for plain-text contexts such as tooltips, table exports, and Markdown reports.
 *
 * @param value - Numeric value to format.
 * @param precision - Number of decimal places in the mantissa or decimal output (default `2`).
 * @param unit - Optional measurement unit suffix (e.g., `"mM"`).
 * @returns Formatted plain-text number with optional unit.
 */
export function formatScientificUnicode(
  value: number,
  precision: number = _DEFAULT_UNICODE_PRECISION,
  unit?: string
): string {
  const parts = getScientificParts(value, precision);

  if (
    parts.mantissa === _NOT_AVAILABLE_TEXT ||
    parts.mantissa === _POSITIVE_INFINITY_TEXT ||
    parts.mantissa === _NEGATIVE_INFINITY_TEXT
  ) {
    return parts.mantissa;
  }

  const formattedNumber =
    parts.exponent !== undefined
      ? `${parts.mantissa} × 10${toSuperscript(parts.exponent)}`
      : parts.mantissa;

  return unit ? `${formattedNumber} ${unit}` : formattedNumber;
}

/**
 * Formats a confidence interval `[low, high]` using Unicode scientific notation when appropriate.
 *
 * @param low - Lower bound of the confidence interval.
 * @param high - Upper bound of the confidence interval.
 * @param precision - Number of decimal places for each bound (default `3`).
 * @returns Formatted range string `[low, high]`, or `"N/A"` if either bound is non-finite.
 */
export function formatCIRange(
  low: number,
  high: number,
  precision: number = _DEFAULT_SCIENTIFIC_PRECISION
): string {
  if (!Number.isFinite(low) || !Number.isFinite(high)) {
    return _NOT_AVAILABLE_TEXT;
  }
  return `[${formatScientificUnicode(low, precision)}, ${formatScientificUnicode(high, precision)}]`;
}

/**
 * Formats a fitted curve parameter value, switching to Unicode scientific notation when
 * `|value| >= 1000` or `0 < |value| < 0.01`, and using fixed decimal precision otherwise.
 *
 * @param value - Parameter numeric value.
 * @param sciPrecision - Mantissa decimal places when scientific notation is used (default `3`).
 * @param fixedPrecision - Decimal places when fixed notation is used (default `4`).
 * @returns Formatted parameter string.
 */
export function formatParameterValue(
  value: number,
  sciPrecision: number = _DEFAULT_SCIENTIFIC_PRECISION,
  fixedPrecision: number = _DEFAULT_PARAMETER_FIXED_PRECISION
): string {
  if (!Number.isFinite(value)) {
    return formatScientificUnicode(value, sciPrecision);
  }
  if (
    shouldUseScientificNotation(
      value,
      _PARAMETER_SCIENTIFIC_UPPER_THRESHOLD,
      _SCIENTIFIC_LOWER_THRESHOLD
    )
  ) {
    return formatScientificUnicode(value, sciPrecision);
  }
  const clampedFixedPrecision = Math.max(0, Math.trunc(fixedPrecision));
  return value.toFixed(clampedFixedPrecision);
}

/**
 * Extracts a clean measurement unit from an X-axis label string.
 * Prioritizes text enclosed in parentheses `(...)` or brackets `[...]`, and falls back
 * to short non-descriptor labels (e.g., `"mM"`, `"ng/mL"`).
 *
 * @param xAxisLabel - Raw X-axis label configured by the user.
 * @returns Extracted unit string, or `""` if no unit is present.
 */
export function extractUnitFromAxisLabel(xAxisLabel: string): string {
  if (!xAxisLabel) {
    return "";
  }

  const bracketMatch = xAxisLabel.match(_UNIT_BRACKET_REGEX);
  if (bracketMatch) {
    return (bracketMatch[1] || bracketMatch[2] || "").trim();
  }

  const trimmed = xAxisLabel.trim();
  if (!trimmed || _AXIS_DESCRIPTOR_WORDS.has(trimmed.toLowerCase())) {
    return "";
  }

  return trimmed.length <= _MAX_UNBRACKETED_UNIT_LENGTH ? trimmed : "";
}

/**
 * Maps an internal regression model identifier to its human-readable display title.
 *
 * @param methodKey - Internal model key (`"linear"`, `"langmuir"`, `"4pl"`, `"5pl"`, etc.).
 * @returns Human-friendly model label.
 */
export function getModelDisplayLabel(methodKey: string): string {
  const normalizedKey = methodKey.trim().toLowerCase();
  return _MODEL_DISPLAY_LABELS[normalizedKey] ?? methodKey.trim().toUpperCase();
}

/**
 * Splits a raw replicate signals input string into an ordered array of tokens, preserving
 * all original delimiters and whitespace while tagging each numeric/text replicate with its 0-based index.
 *
 * @param rawSignals - Raw user-entered replicate string (e.g., `"0.08, 0.12, 0.10"`).
 * @returns Array of `ReplicateToken` items whose concatenated `text` equals `rawSignals`.
 */
export function parseReplicateTokens(rawSignals: string): ReplicateToken[] {
  if (!rawSignals) {
    return [];
  }

  const tokens: ReplicateToken[] = [];
  const parts = rawSignals.split(_REPLICATE_DELIMITER_SPLIT_REGEX);
  let repCount = 0;

  for (const part of parts) {
    if (!part) {
      continue;
    }
    if (_REPLICATE_DELIMITER_ONLY_REGEX.test(part) || part.trim().length === 0) {
      tokens.push({ text: part, isReplicate: false });
      continue;
    }

    const leading = part.match(/^\s*/)?.[0] ?? "";
    const trailing = part.match(/\s*$/)?.[0] ?? "";
    const core = part.slice(leading.length, part.length - trailing.length);

    if (leading) {
      tokens.push({ text: leading, isReplicate: false });
    }
    if (core) {
      tokens.push({ text: core, isReplicate: true, repIndex: repCount++ });
    }
    if (trailing) {
      tokens.push({ text: trailing, isReplicate: false });
    }
  }

  return tokens;
}
