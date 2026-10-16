/**
 * Unit tests for `src/utils/formatters.ts`.
 * Covers normal operation, boundary/edge conditions, and malformed/failure inputs
 * for all exported formatting and tokenization utilities.
 */
import assert from "node:assert/strict";
import {
  toSuperscript,
  shouldUseScientificNotation,
  getScientificParts,
  formatScientificUnicode,
  formatCIRange,
  formatParameterValue,
  extractUnitFromAxisLabel,
  getModelDisplayLabel,
  parseReplicateTokens,
} from "./formatters";

/**
 * Tests `toSuperscript` across normal, edge, and unmapped character cases.
 */
function _testToSuperscript(): void {
  // Normal cases
  assert.equal(toSuperscript(-2), "⁻²");
  assert.equal(toSuperscript(4), "⁴");
  assert.equal(toSuperscript("+12"), "⁺¹²");

  // Edge cases
  assert.equal(toSuperscript(0), "⁰");
  assert.equal(toSuperscript(""), "");
  assert.equal(toSuperscript("-1234567890"), "⁻¹²³⁴⁵⁶⁷⁸⁹⁰");

  // Failure / unmapped characters preserved verbatim
  assert.equal(toSuperscript("e-3"), "e⁻³");
  assert.equal(toSuperscript("NaN"), "NaN");
}

/**
 * Tests `shouldUseScientificNotation` across normal, threshold boundary, and non-finite inputs.
 */
function _testShouldUseScientificNotation(): void {
  // Normal cases
  assert.equal(shouldUseScientificNotation(0.005), true);
  assert.equal(shouldUseScientificNotation(-0.005), true);
  assert.equal(shouldUseScientificNotation(25_000), true);
  assert.equal(shouldUseScientificNotation(-25_000), true);
  assert.equal(shouldUseScientificNotation(1.25), false);
  assert.equal(shouldUseScientificNotation(-42.5), false);

  // Edge / boundary cases
  assert.equal(shouldUseScientificNotation(0), false);
  assert.equal(shouldUseScientificNotation(-0), false);
  assert.equal(shouldUseScientificNotation(0.01), false);
  assert.equal(shouldUseScientificNotation(-0.01), false);
  assert.equal(shouldUseScientificNotation(9_999.9999), false);
  assert.equal(shouldUseScientificNotation(10_000), true);
  assert.equal(shouldUseScientificNotation(-10_000), true);
  assert.equal(shouldUseScientificNotation(1_000, 1_000, 0.01), true);
  assert.equal(shouldUseScientificNotation(999.9, 1_000, 0.01), false);

  // Failure / non-finite cases
  assert.equal(shouldUseScientificNotation(Number.NaN), false);
  assert.equal(shouldUseScientificNotation(Number.POSITIVE_INFINITY), false);
  assert.equal(shouldUseScientificNotation(Number.NEGATIVE_INFINITY), false);
}

/**
 * Tests `getScientificParts` across normal, boundary, and non-finite values.
 */
function _testGetScientificParts(): void {
  // Normal decimal range
  const decimalParts = getScientificParts(1.23456, 3);
  assert.deepEqual(decimalParts, {
    mantissa: "1.235",
    decimalEquivalent: "1.235",
    plainText: "1.235",
  });

  // Normal small scientific number with subtext decimalEquivalent (-4 <= exp < 0)
  const smallParts = getScientificParts(0.004611, 3);
  assert.deepEqual(smallParts, {
    mantissa: "4.611",
    exponent: -3,
    decimalEquivalent: "0.004611",
    plainText: "4.611 × 10^(-3)",
  });

  // Normal large scientific number (no decimalEquivalent)
  const largeParts = getScientificParts(12_500, 2);
  assert.deepEqual(largeParts, {
    mantissa: "1.25",
    exponent: 4,
    decimalEquivalent: undefined,
    plainText: "1.25 × 10^(4)",
  });

  // Edge cases: zero, -4 exponent boundary, -5 exponent (no subtext), negative values
  assert.deepEqual(getScientificParts(0, 3), {
    mantissa: "0",
    decimalEquivalent: "0",
    plainText: "0",
  });
  assert.equal(getScientificParts(1e-4, 2).decimalEquivalent, "0.000100");
  assert.equal(getScientificParts(1e-5, 2).decimalEquivalent, undefined);
  assert.equal(getScientificParts(0.01, 3).exponent, undefined);
  assert.equal(getScientificParts(10_000, 3).exponent, 4);
  assert.equal(getScientificParts(-0.0025, 2).mantissa, "-2.50");
  assert.equal(getScientificParts(-0.0025, 2).exponent, -3);

  // Failure / non-finite cases
  assert.deepEqual(getScientificParts(Number.NaN), {
    mantissa: "N/A",
    plainText: "N/A",
  });
  assert.deepEqual(getScientificParts(Number.POSITIVE_INFINITY), {
    mantissa: "+∞",
    plainText: "+∞",
  });
  assert.deepEqual(getScientificParts(Number.NEGATIVE_INFINITY), {
    mantissa: "-∞",
    plainText: "-∞",
  });
}

/**
 * Tests `formatScientificUnicode` across normal, edge, and non-finite inputs.
 */
function _testFormatScientificUnicode(): void {
  // Normal cases
  assert.equal(formatScientificUnicode(0.00461, 2), "4.61 × 10⁻³");
  assert.equal(formatScientificUnicode(0.00461, 2, "mM"), "4.61 × 10⁻³ mM");
  assert.equal(formatScientificUnicode(2.5, 2, "ng/mL"), "2.5 ng/mL");

  // Edge cases
  assert.equal(formatScientificUnicode(0, 2), "0");
  assert.equal(formatScientificUnicode(0, 2, "mM"), "0 mM");
  assert.equal(formatScientificUnicode(0.01, 2), "0.01");
  assert.equal(formatScientificUnicode(10_000, 2), "1.00 × 10⁴");
  assert.equal(formatScientificUnicode(-15_000, 1, "pg/mL"), "-1.5 × 10⁴ pg/mL");

  // Failure cases (units should not be appended to N/A or infinity symbols)
  assert.equal(formatScientificUnicode(Number.NaN, 2, "mM"), "N/A");
  assert.equal(formatScientificUnicode(Number.POSITIVE_INFINITY, 2, "mM"), "+∞");
  assert.equal(formatScientificUnicode(Number.NEGATIVE_INFINITY, 2, "mM"), "-∞");
}

/**
 * Tests `formatCIRange` across normal, edge, and non-finite bounds.
 */
function _testFormatCIRange(): void {
  // Normal cases
  assert.equal(
    formatCIRange(0.003682, 0.005551, 3),
    "[3.682 × 10⁻³, 5.551 × 10⁻³]"
  );
  assert.equal(formatCIRange(1.2, 3.4, 2), "[1.2, 3.4]");

  // Edge cases
  assert.equal(formatCIRange(0, 0, 2), "[0, 0]");
  assert.equal(formatCIRange(0.01, 10_000, 2), "[0.01, 1.00 × 10⁴]");

  // Failure cases
  assert.equal(formatCIRange(Number.NaN, 1.0), "N/A");
  assert.equal(formatCIRange(1.0, Number.NaN), "N/A");
  assert.equal(formatCIRange(0.1, Number.POSITIVE_INFINITY), "N/A");
  assert.equal(formatCIRange(Number.NEGATIVE_INFINITY, 0.5), "N/A");
}

/**
 * Tests `formatParameterValue` across normal, threshold boundary, and non-finite inputs.
 */
function _testFormatParameterValue(): void {
  // Normal cases
  assert.equal(formatParameterValue(1.23456), "1.2346");
  assert.equal(formatParameterValue(0.0025), "2.500 × 10⁻³");
  assert.equal(formatParameterValue(1_500.1234), "1500.123");
  assert.equal(formatParameterValue(15_000), "1.500 × 10⁴");

  // Edge cases
  assert.equal(formatParameterValue(0), "0.0000");
  assert.equal(formatParameterValue(0.01), "0.0100");
  assert.equal(formatParameterValue(999.9), "999.9000");
  assert.equal(formatParameterValue(1_000), "1000");
  assert.equal(formatParameterValue(10_000), "1.000 × 10⁴");
  assert.equal(formatParameterValue(-10_000, 2, 3), "-1.00 × 10⁴");
  assert.equal(formatParameterValue(1.5, 2, 3), "1.500");

  // Failure cases
  assert.equal(formatParameterValue(Number.NaN), "N/A");
  assert.equal(formatParameterValue(Number.POSITIVE_INFINITY), "+∞");
  assert.equal(formatParameterValue(Number.NEGATIVE_INFINITY), "-∞");
}

/**
 * Tests `extractUnitFromAxisLabel` across bracketed, unbracketed, descriptor, and long labels.
 */
function _testExtractUnitFromAxisLabel(): void {
  // Normal cases
  assert.equal(extractUnitFromAxisLabel("Concentration (mM)"), "mM");
  assert.equal(extractUnitFromAxisLabel("Analyte Dose [ng/mL]"), "ng/mL");
  assert.equal(extractUnitFromAxisLabel("ug/mL"), "ug/mL");

  // Edge cases
  assert.equal(extractUnitFromAxisLabel(""), "");
  assert.equal(extractUnitFromAxisLabel("   "), "");
  assert.equal(extractUnitFromAxisLabel("Concentration ( pg/mL )"), "pg/mL");
  assert.equal(extractUnitFromAxisLabel("Concentration"), "");
  assert.equal(extractUnitFromAxisLabel("CONC"), "");
  assert.equal(extractUnitFromAxisLabel("dose"), "");
  assert.equal(extractUnitFromAxisLabel("Signal"), "");
  assert.equal(extractUnitFromAxisLabel("copies/uL"), "copies/uL");

  // Failure / rejected label cases
  assert.equal(extractUnitFromAxisLabel("Arbitrary Long Unbracketed Label"), "");
  assert.equal(extractUnitFromAxisLabel("Concentration ()"), "");
}

/**
 * Tests `getModelDisplayLabel` across known model keys, case variations, and unknown keys.
 */
function _testGetModelDisplayLabel(): void {
  // Normal cases
  assert.equal(getModelDisplayLabel("linear"), "Linear Model");
  assert.equal(getModelDisplayLabel("langmuir"), "Langmuir Isotherm");
  assert.equal(getModelDisplayLabel("4pl"), "4PL Sigmoidal");
  assert.equal(getModelDisplayLabel("5pl"), "5PL Asymmetric");

  // Edge cases
  assert.equal(getModelDisplayLabel("  4PL "), "4PL Sigmoidal");
  assert.equal(getModelDisplayLabel("LANGMUIR"), "Langmuir Isotherm");

  // Failure / fallback cases
  assert.equal(getModelDisplayLabel("custom"), "CUSTOM");
  assert.equal(getModelDisplayLabel(""), "");
}

/**
 * Tests `parseReplicateTokens` across normal lists, mixed delimiters/whitespace, and empty/malformed inputs.
 */
function _testParseReplicateTokens(): void {
  // Normal case
  const raw = "0.08, 0.12, 0.10";
  const tokens = parseReplicateTokens(raw);
  assert.equal(tokens.map((t) => t.text).join(""), raw);
  const replicateOnly = tokens.filter((t) => t.isReplicate);
  assert.deepEqual(replicateOnly, [
    { text: "0.08", isReplicate: true, repIndex: 0 },
    { text: "0.12", isReplicate: true, repIndex: 1 },
    { text: "0.10", isReplicate: true, repIndex: 2 },
  ]);

  // Edge cases: mixed delimiters, leading/trailing spaces, empty string, whitespace-only
  const mixedRaw = "  0.15;\t0.17 , 0.16  ";
  const mixedTokens = parseReplicateTokens(mixedRaw);
  assert.equal(mixedTokens.map((t) => t.text).join(""), mixedRaw);
  assert.equal(mixedTokens.filter((t) => t.isReplicate).length, 3);

  assert.deepEqual(parseReplicateTokens(""), []);
  assert.deepEqual(parseReplicateTokens("   "), [{ text: "   ", isReplicate: false }]);

  // Failure / delimiter-only input
  const delimOnly = " , ; \t ";
  const delimTokens = parseReplicateTokens(delimOnly);
  assert.equal(delimTokens.map((t) => t.text).join(""), delimOnly);
  assert.equal(delimTokens.some((t) => t.isReplicate), false);
}

/**
 * Runs all formatter unit tests.
 */
function _runAllFormatterTests(): void {
  _testToSuperscript();
  _testShouldUseScientificNotation();
  _testGetScientificParts();
  _testFormatScientificUnicode();
  _testFormatCIRange();
  _testFormatParameterValue();
  _testExtractUnitFromAxisLabel();
  _testGetModelDisplayLabel();
  _testParseReplicateTokens();
  console.log("All formatters unit tests completed successfully!");
}

_runAllFormatterTests();
