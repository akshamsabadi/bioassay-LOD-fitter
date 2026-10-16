import { fitData, invertFittedSignal, type FitResult } from "./fitting";
import {
  BLANK_CV_WARNING_THRESHOLD,
  STANDARD_CV_WARNING_THRESHOLD,
  type FitMethod,
  type FitModelName,
  type StandardRow,
} from "../constants";

/** Exact one-sided 95% Student's t critical values (`p = 0.95`) for degrees of freedom 1 through 20. */
const _T_INV_95: Readonly<Record<number, number>> = {
  1: 6.31375,
  2: 2.91999,
  3: 2.35336,
  4: 2.13185,
  5: 2.01505,
  6: 1.94318,
  7: 1.89458,
  8: 1.85955,
  9: 1.83311,
  10: 1.81246,
  11: 1.79588,
  12: 1.78229,
  13: 1.77093,
  14: 1.76131,
  15: 1.75305,
  16: 1.74588,
  17: 1.73961,
  18: 1.73406,
  19: 1.72913,
  20: 1.72472,
};

/** Exact two-sided 95% (`p = 0.975`) Student's t critical values for degrees of freedom 1 through 20. */
const _T_INV_975: Readonly<Record<number, number>> = {
  1: 12.7062,
  2: 4.30265,
  3: 3.18245,
  4: 2.77645,
  5: 2.57058,
  6: 2.44691,
  7: 2.36462,
  8: 2.306,
  9: 2.26216,
  10: 2.22814,
  11: 2.20099,
  12: 2.17881,
  13: 2.16037,
  14: 2.14479,
  15: 2.13145,
  16: 2.11991,
  17: 2.10982,
  18: 2.10092,
  19: 2.09302,
  20: 2.08596,
};

/** Numerator polynomial coefficients for Peter Acklam's central normal quantile approximation. */
const _ACKLAM_CENTRAL_NUMERATOR: readonly number[] = [
  -39.6968302866538,
  220.946098424521,
  -275.928510446969,
  138.357751867269,
  -30.6647980661472,
  2.50662827745924,
];

/** Denominator polynomial coefficients for Peter Acklam's central normal quantile approximation. */
const _ACKLAM_CENTRAL_DENOMINATOR: readonly number[] = [
  -54.4760987982241,
  161.585836858041,
  -155.698979859887,
  66.8013118877197,
  -13.2806815528857,
];

/** Numerator polynomial coefficients for Peter Acklam's tail normal quantile approximation. */
const _ACKLAM_TAIL_NUMERATOR: readonly number[] = [
  -7.78489400243029e-3,
  -0.322396458041136,
  -2.40075827716184,
  -2.54973253934373,
  4.37466414146497,
  2.93816398269878,
];

/** Denominator polynomial coefficients for Peter Acklam's tail normal quantile approximation. */
const _ACKLAM_TAIL_DENOMINATOR: readonly number[] = [
  7.78469570904146e-3,
  0.32246712907004,
  2.445134137143,
  3.75440866190742,
];

/** Tail probability transition threshold for Acklam's normal quantile rational approximation. */
const _ACKLAM_TAIL_THRESHOLD = 0.02425;

/** Default Type I (false positive) error rate `alpha` for the decision limit `L_C`. */
const _DEFAULT_ALPHA = 0.05;

/** Default Type II (false negative) error rate `beta` for the detection limit `L_D`. */
const _DEFAULT_BETA = 0.05;

/** Numerical zero tolerance for derivatives and mean denominators. */
const _NUMERIC_ZERO_TOLERANCE = 1e-12;

/** Minimum positive floor for logarithmic confidence interval lower bounds. */
const _MIN_POSITIVE_CONCENTRATION = 1e-12;

/** Standard normal critical value for two-sided 95% confidence interval (`z_0.975`). */
const _Z_CRITICAL_95 = 1.96;

/** Maximum exponential attenuation exponent when clamping non-positive linear CI lower bounds. */
const _MAX_LOG_CI_ATTENUATION = 3;

/** Fallback multiplicative lower bound factor when local slope at LOD is numerically flat. */
const _FLAT_SLOPE_CI_LOW_FACTOR = 0.85;

/** Fallback multiplicative upper bound factor when local slope at LOD is numerically flat. */
const _FLAT_SLOPE_CI_HIGH_FACTOR = 1.15;

/** Relative tolerance within which two LOD values are considered equal in sensitivity. */
const _EQUAL_RATIO_TOLERANCE = 0.01;

/** Fold-change threshold above which sensitivity ratios are formatted with 1 decimal place instead of 2. */
const _SINGLE_DECIMAL_RATIO_THRESHOLD = 10;

/** Minimum acceptable coefficient of determination (`R²`) before triggering a fit quality warning. */
const _MIN_ACCEPTABLE_R2 = 0.95;

/** Minimum fraction of total signal span required to count a step change toward Hook Effect detection. */
const _HOOK_EFFECT_SPAN_FRACTION = 0.05;

/** Minimum absolute mean threshold required to compute a meaningful replicate CV%. */
const _NON_ZERO_MEAN_EPSILON = 1e-9;

/** Ordered list of candidate regression models evaluated during comparison and auto-selection. */
const _CANDIDATE_MODELS: readonly FitModelName[] = [
  "linear",
  "langmuir",
  "4pl",
  "5pl",
];

/** Single standard calibrator measurement pair (concentration and signal readout). */
export interface StandardData {
  concentration: number;
  readout: number;
}

/** Summary replicate statistics for a single concentration row or blank control. */
export interface ReplicateStats {
  n: number;
  mean: number;
  sd: number;
  cv: number;
}

/** Configuration parameters for generating a geometric serial dilution or multiplication series. */
export interface SerialDilutionOptions {
  startConcentration: number;
  dilutionFactor: number;
  steps: number;
  direction: "dilution" | "serial";
}

/** Complete statistical output of Currie (1968) / Holstein et al. (2015) Limit of Detection analysis. */
export interface AdvancedLoDResult {
  lc: number;
  ld: number;
  lodConc: number;
  lodCI: { low: number; high: number };
  meanBlank: number;
  sdBlank: number;
  sdPooled: number;
  isDecreasing: boolean;
  fit: FitResult;
  comparison: {
    fits: Record<string, FitResult>;
    betterMethod: FitModelName;
  };
}

/**
 * Evaluates the rational polynomial approximation for the lower/upper tail of the standard normal quantile.
 *
 * @param tailProb - Tail probability `p` in `(0, _ACKLAM_TAIL_THRESHOLD)`.
 * @returns Unsigned tail quantile value.
 */
function _evaluateTailNormalQuantile(tailProb: number): number {
  const q = Math.sqrt(-2 * Math.log(tailProb));
  const [c1, c2, c3, c4, c5, c6] = _ACKLAM_TAIL_NUMERATOR;
  const [d1, d2, d3, d4] = _ACKLAM_TAIL_DENOMINATOR;
  return (
    (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
    ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
  );
}

/**
 * Approximates the inverse standard normal cumulative distribution function (`Phi^-1(p)`)
 * using Peter Acklam's rational polynomial algorithm.
 *
 * @param p - Cumulative probability in `(0, 1)`.
 * @returns Standard normal quantile `z`.
 */
function _calculateNormalQuantile(p: number): number {
  const pLow = _ACKLAM_TAIL_THRESHOLD;
  const pHigh = 1 - pLow;
  if (p < pLow) {
    return _evaluateTailNormalQuantile(p);
  }
  if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    const [a1, a2, a3, a4, a5, a6] = _ACKLAM_CENTRAL_NUMERATOR;
    const [b1, b2, b3, b4, b5] = _ACKLAM_CENTRAL_DENOMINATOR;
    return (
      ((((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q) /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1)
    );
  }
  return -_evaluateTailNormalQuantile(1 - p);
}

/**
 * Computes the inverse Student's t cumulative distribution function (`t_{p, df}`).
 * Uses exact lookup tables for common critical quantiles (`p = 0.95, 0.975, 0.05, 0.025`)
 * when `1 <= df <= 20`, exact Cauchy quantile for `df = 1`, and a Cornish-Fisher expansion otherwise.
 *
 * @param p - Cumulative probability in `(0, 1)`.
 * @param df - Degrees of freedom (`df > 0`).
 * @returns Student's t quantile value, or `0` if `df <= 0` or `p` is outside `(0, 1)`.
 */
export const tinv = (p: number, df: number): number => {
  if (!Number.isFinite(p) || !Number.isFinite(df) || df <= 0 || p <= 0 || p >= 1) {
    return 0;
  }

  const roundedDf = Math.round(df);
  if (Math.abs(df - roundedDf) < 1e-6 && roundedDf >= 1 && roundedDf <= 20) {
    if (Math.abs(p - 0.95) < 1e-4) return _T_INV_95[roundedDf];
    if (Math.abs(p - 0.975) < 1e-4) return _T_INV_975[roundedDf];
    if (Math.abs(p - 0.05) < 1e-4) return -_T_INV_95[roundedDf];
    if (Math.abs(p - 0.025) < 1e-4) return -_T_INV_975[roundedDf];
  }

  if (df === 1) {
    return Math.tan(Math.PI * (p - 0.5));
  }

  const x = _calculateNormalQuantile(p);
  const x3 = Math.pow(x, 3);
  const x5 = Math.pow(x, 5);
  return (
    x +
    (x3 + x) / (4 * df) +
    (5 * x5 + 16 * x3 + 3 * x) / (96 * Math.pow(df, 2))
  );
};

/**
 * Calculates the sample mean and sample standard deviation (`n - 1` denominator) of a numeric array.
 *
 * @param values - Array of numeric observations.
 * @returns Object with `mean` and sample standard deviation `sd`.
 */
function _calculateSampleStats(values: readonly number[]): {
  mean: number;
  sd: number;
} {
  if (values.length === 0) {
    return { mean: 0, sd: 0 };
  }
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (values.length === 1) {
    return { mean, sd: 0 };
  }
  const sumSqDiff = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
  return {
    mean,
    sd: Math.sqrt(sumSqDiff / (values.length - 1)),
  };
}

/**
 * Calculates the pooled within-concentration standard deviation and degrees of freedom across standards.
 *
 * @param standards - Array of standard concentration-readout pairs.
 * @returns Object containing pooled standard deviation `sd` and degrees of freedom `df = N - K`.
 */
function _calculatePooledStandardDeviation(standards: readonly StandardData[]): {
  sd: number;
  df: number;
} {
  const groups: Record<number, number[]> = {};
  standards.forEach((s) => {
    if (!groups[s.concentration]) {
      groups[s.concentration] = [];
    }
    groups[s.concentration].push(s.readout);
  });

  let sumSquaredErrors = 0;
  let totalPoints = 0;
  let groupCount = 0;

  Object.values(groups).forEach((replicates) => {
    if (replicates.length < 1) return;
    const groupMean =
      replicates.reduce((a, b) => a + b, 0) / replicates.length;
    replicates.forEach((r) => {
      sumSquaredErrors += Math.pow(r - groupMean, 2);
    });
    totalPoints += replicates.length;
    groupCount++;
  });

  const df = totalPoints - groupCount;
  return {
    sd: df > 0 ? Math.sqrt(sumSquaredErrors / df) : 0,
    df,
  };
}

/**
 * Selects the best-fitting model among candidate regression models using AICc
 * (with R² fallback when sample size is too small for finite AICc), disqualifying overparameterized models (`k > n`).
 *
 * @param fits - Map of fitted models keyed by model name.
 * @param sampleSize - Number of standard calibrator observations `n`.
 * @returns Selected best `FitModelName`.
 */
function _selectBestFitModel(
  fits: Record<FitModelName, FitResult>,
  sampleSize: number
): FitModelName {
  const eligibleMethods = _CANDIDATE_MODELS.filter(
    (m) => sampleSize >= fits[m].k
  );
  const candidates =
    eligibleMethods.length > 0 ? eligibleMethods : _CANDIDATE_MODELS;

  let betterMethod: FitModelName = candidates[0];
  let bestAicc = Infinity;

  candidates.forEach((m) => {
    const aicc = fits[m].metrics.aicc;
    if (Number.isFinite(aicc) && aicc < bestAicc) {
      bestAicc = aicc;
      betterMethod = m;
    }
  });

  if (!Number.isFinite(bestAicc)) {
    let bestR2 = -Infinity;
    candidates.forEach((m) => {
      const r2 = fits[m].metrics.r2;
      if (Number.isFinite(r2) && r2 > bestR2) {
        bestR2 = r2;
        betterMethod = m;
      }
    });
  }

  return betterMethod;
}

/**
 * Resolves the pooled standard deviation and degrees of freedom for `L_D`,
 * falling back to regression RMSE (or blank SD) when no concentration replicates are available.
 *
 * @param standards - Standard calibrator observations.
 * @param fit - Selected regression fit result.
 * @param sdBlank - Standard deviation of the blank replicates.
 * @returns Resolved `{ sdPooled, dfPooled }`.
 */
function _resolvePooledNoise(
  standards: readonly StandardData[],
  fit: FitResult,
  sdBlank: number
): { sdPooled: number; dfPooled: number } {
  const { sd: sdPooledRaw, df: dfPooledRaw } =
    _calculatePooledStandardDeviation(standards);
  const hasReplicates = dfPooledRaw > 0;
  const sdPooled = hasReplicates
    ? sdPooledRaw
    : Number.isFinite(fit.metrics.rmse)
      ? fit.metrics.rmse
      : sdBlank;
  const dfPooled = hasReplicates
    ? dfPooledRaw
    : Math.max(1, standards.length - fit.k);
  return { sdPooled, dfPooled };
}

/**
 * Determines whether the fitted calibration curve decreases with increasing concentration (competitive assay).
 *
 * @param concentrations - Array of standard concentrations.
 * @param fit - Selected regression fit result.
 * @returns `true` if predicted response at maximum concentration is lower than at minimum positive concentration.
 */
function _isDecreasingResponseCurve(
  concentrations: readonly number[],
  fit: FitResult
): boolean {
  const positiveX = concentrations.filter((val) => val > 0);
  const minStdX = positiveX.length > 0 ? Math.min(...positiveX) : 1;
  const maxStdX = concentrations.length > 0 ? Math.max(...concentrations) : 1;
  return fit.predict(maxStdX) < fit.predict(minStdX);
}

/**
 * Computes the 95% confidence interval for the Limit of Detection (`lodConc`) via the first-order Delta Method,
 * ensuring a strictly positive lower bound suitable for logarithmic concentration axes.
 *
 * @param fit - Selected regression fit result.
 * @param lodConc - Estimated Limit of Detection concentration.
 * @param dfPooled - Degrees of freedom associated with the pooled noise estimate.
 * @returns 95% confidence interval `{ low, high }` in concentration units.
 */
function _calculateDeltaMethodConfidenceInterval(
  fit: FitResult,
  lodConc: number,
  dfPooled: number
): { low: number; high: number } {
  if (!Number.isFinite(lodConc) || lodConc <= 0) {
    return { low: NaN, high: NaN };
  }

  const ciAtLod = fit.getCI(lodConc);
  const seFit = Math.abs(ciAtLod.high - ciAtLod.low) / (2 * _Z_CRITICAL_95);
  const deriv = fit.predictDeriv(lodConc);

  if (Math.abs(deriv) > _NUMERIC_ZERO_TOLERANCE) {
    const seLod = seFit / Math.abs(deriv);
    const tCrit = tinv(0.975, dfPooled) || _Z_CRITICAL_95;
    const margin = tCrit * seLod;
    const lowLinear = lodConc - margin;
    const lowBound =
      lowLinear > 0
        ? lowLinear
        : lodConc *
          Math.exp(-Math.min(_MAX_LOG_CI_ATTENUATION, margin / lodConc));

    return {
      low: Math.max(_MIN_POSITIVE_CONCENTRATION, lowBound),
      high: lodConc + margin,
    };
  }

  return {
    low: Math.max(
      _MIN_POSITIVE_CONCENTRATION,
      lodConc * _FLAT_SLOPE_CI_LOW_FACTOR
    ),
    high: lodConc * _FLAT_SLOPE_CI_HIGH_FACTOR,
  };
}

/**
 * Performs comprehensive Limit of Detection (LOD) and Decision Limit (LC) estimation
 * following Currie (1968) and Holstein et al. (2015), including multi-model comparison and Delta Method 95% CI.
 *
 * @param blanks - Array of zero-concentration blank signal readouts.
 * @param standards - Array of standard calibrator concentration-readout pairs.
 * @param method - Explicit regression model name or `'auto'` for AICc-based selection.
 * @param alpha - False-positive error rate `alpha` (default `0.05`).
 * @param beta - False-negative error rate `beta` (default `0.05`).
 * @returns Complete `AdvancedLoDResult` containing `lc`, `ld`, `lodConc`, `lodCI`, noise metrics, and fitted models.
 */
export const calculateAdvancedLoD = (
  blanks: number[],
  standards: StandardData[],
  method: FitMethod = "auto",
  alpha: number = _DEFAULT_ALPHA,
  beta: number = _DEFAULT_BETA
): AdvancedLoDResult => {
  const concentrations = standards.map((s) => s.concentration);
  const readouts = standards.map((s) => s.readout);

  const fits: Record<FitModelName, FitResult> = {
    linear: fitData(concentrations, readouts, "linear"),
    langmuir: fitData(concentrations, readouts, "langmuir"),
    "4pl": fitData(concentrations, readouts, "4pl"),
    "5pl": fitData(concentrations, readouts, "5pl"),
  };

  const betterMethod = _selectBestFitModel(fits, standards.length);
  const fit: FitResult =
    method === "auto" ? fits[betterMethod] : fits[method] || fits[betterMethod];

  const { mean: meanBlank, sd: sdBlank } = _calculateSampleStats(blanks);
  const { sdPooled, dfPooled } = _resolvePooledNoise(standards, fit, sdBlank);
  const isDecreasing = _isDecreasingResponseCurve(concentrations, fit);

  const tAlpha = tinv(1 - alpha, Math.max(1, blanks.length - 1));
  const tBeta = tinv(1 - beta, dfPooled);

  const lc = isDecreasing
    ? meanBlank - tAlpha * sdBlank
    : meanBlank + tAlpha * sdBlank;
  const ld = isDecreasing ? lc - tBeta * sdPooled : lc + tBeta * sdPooled;

  const lodConc = invertFittedSignal(fit, ld);
  const lodCI = _calculateDeltaMethodConfidenceInterval(fit, lodConc, dfPooled);

  return {
    lc,
    ld,
    lodConc,
    lodCI,
    meanBlank,
    sdBlank,
    sdPooled,
    isDecreasing,
    fit,
    comparison: { fits, betterMethod },
  };
};

/**
 * Formats a human-readable relative sensitivity fold-change string comparing `currentLod` against `refLod`.
 * Note that a lower LOD concentration indicates higher analytical sensitivity.
 *
 * @param currentLod - Estimated LOD concentration of the evaluated curve.
 * @param refLod - Estimated LOD concentration of the reference curve.
 * @param isReference - Whether the evaluated curve is the designated reference series itself.
 * @returns Formatted comparison string (e.g. `"1.0× (Ref)"`, `"1.0× (Equal)"`, `"2.50× higher"`, or `"—"`).
 */
export const computeSensitivityFoldChange = (
  currentLod: number,
  refLod: number,
  isReference = false
): string => {
  if (
    !Number.isFinite(currentLod) ||
    !Number.isFinite(refLod) ||
    currentLod <= 0 ||
    refLod <= 0
  ) {
    return "—";
  }
  if (isReference) {
    return "1.0× (Ref)";
  }
  const ratio = currentLod / refLod;
  if (Math.abs(ratio - 1) < _EQUAL_RATIO_TOLERANCE) {
    return "1.0× (Equal)";
  }
  if (ratio > 1) {
    const formatted =
      ratio >= _SINGLE_DECIMAL_RATIO_THRESHOLD
        ? ratio.toFixed(1)
        : ratio.toFixed(2);
    return `${formatted}× lower`;
  }
  const inv = 1 / ratio;
  const formatted =
    inv >= _SINGLE_DECIMAL_RATIO_THRESHOLD ? inv.toFixed(1) : inv.toFixed(2);
  return `${formatted}× higher`;
};

/**
 * Parses a comma-separated string of replicate signal readouts into an array of finite numbers.
 *
 * @param rawSignals - Comma-separated signal string (e.g. `"0.12, 0.15, 0.14"`).
 * @returns Array of valid finite numeric signal values.
 */
export function parseSignalNumbers(rawSignals: string): number[] {
  if (!rawSignals || !rawSignals.trim()) {
    return [];
  }
  return rawSignals
    .split(",")
    .map((token) => parseFloat(token.trim()))
    .filter((val) => Number.isFinite(val));
}

/**
 * Computes replicate summary statistics (`n`, `mean`, `sd`, and percentage coefficient of variation `cv`)
 * from a comma-separated signal string.
 *
 * @param rawSignals - Comma-separated replicate signals string.
 * @returns `ReplicateStats` object, or `null` if no valid numeric replicates are present.
 */
export function computeReplicateStats(rawSignals: string): ReplicateStats | null {
  const values = parseSignalNumbers(rawSignals);
  if (values.length === 0) {
    return null;
  }
  const { mean, sd } = _calculateSampleStats(values);
  const cv =
    Math.abs(mean) > _NUMERIC_ZERO_TOLERANCE ? (sd / Math.abs(mean)) * 100 : 0;
  return { n: values.length, mean, sd, cv };
}

/**
 * Evaluates automated bioanalytical quality checks on fitted curve results and replicate variance,
 * checking R² goodness-of-fit, blank and standard replicate CV%, and non-monotonic Hook Effect drops.
 *
 * @param results - Computed `AdvancedLoDResult` for the series, or `null` if not yet fitted.
 * @param standardRows - Standard calibrator rows for the series.
 * @param blankSignals - Optional comma-separated blank signal replicates string.
 * @returns Array of human-readable diagnostic warning messages (empty if all checks pass).
 */
export function computeAssayQualityChecks(
  results: AdvancedLoDResult | null,
  standardRows: readonly StandardRow[],
  blankSignals?: string
): string[] {
  if (!results) {
    return [];
  }
  const warnings: string[] = [];

  if (results.fit.metrics.r2 < _MIN_ACCEPTABLE_R2) {
    warnings.push(
      `Poor fit quality (R² = ${results.fit.metrics.r2.toFixed(4)}). Consider manual model selection.`
    );
  }

  if (blankSignals) {
    const blankStats = computeReplicateStats(blankSignals);
    if (
      blankStats &&
      blankStats.n > 1 &&
      Math.abs(blankStats.mean) > _NON_ZERO_MEAN_EPSILON &&
      blankStats.cv > BLANK_CV_WARNING_THRESHOLD
    ) {
      warnings.push(
        `High blank replicate variance (CV = ${blankStats.cv.toFixed(1)}%). Check blank baseline purity.`
      );
    }
  }

  standardRows.forEach((row) => {
    const conc = parseFloat(row.conc);
    if (!Number.isFinite(conc) || conc <= 0) return;
    const rowStats = computeReplicateStats(row.signals);
    if (
      rowStats &&
      rowStats.n > 1 &&
      Math.abs(rowStats.mean) > _NON_ZERO_MEAN_EPSILON &&
      rowStats.cv > STANDARD_CV_WARNING_THRESHOLD
    ) {
      warnings.push(
        `High replicate variance at concentration ${conc} (CV = ${rowStats.cv.toFixed(1)}%). Check for pipetting errors.`
      );
    }
  });

  const sortedStandards = [...standardRows]
    .map((row) => {
      const conc = parseFloat(row.conc);
      const stats = computeReplicateStats(row.signals);
      if (!Number.isFinite(conc) || conc <= 0 || !stats) return null;
      return { conc, mean: stats.mean };
    })
    .filter((item): item is { conc: number; mean: number } => item !== null)
    .sort((a, b) => a.conc - b.conc);

  if (sortedStandards.length > 2) {
    const means = sortedStandards.map((s) => s.mean);
    const signalSpan = Math.max(...means) - Math.min(...means);
    const threshold = Math.max(
      _NON_ZERO_MEAN_EPSILON,
      signalSpan * _HOOK_EFFECT_SPAN_FRACTION
    );
    let increases = 0;
    let decreases = 0;
    for (let i = 1; i < sortedStandards.length; i++) {
      const diff = sortedStandards[i].mean - sortedStandards[i - 1].mean;
      if (diff > threshold) increases++;
      else if (diff < -threshold) decreases++;
    }
    if (increases > 0 && decreases > 0) {
      warnings.push(
        "Non-monotonic response detected (Hook Effect / signal drop at high concentration)."
      );
    }
  }

  return warnings;
}

/**
 * Generates an ascending-sorted array of `StandardRow` entries following a geometric dilution or multiplication series.
 *
 * @param options - Serial dilution parameters (`startConcentration`, `dilutionFactor`, `steps`, `direction`).
 * @returns Ascending-sorted `StandardRow[]` with empty signal strings ready for data entry.
 * @throws {Error} If `startConcentration <= 0`, `dilutionFactor <= 1`, or `steps < 1` (or non-finite).
 */
export function generateSerialDilutionRows(
  options: SerialDilutionOptions
): StandardRow[] {
  const { startConcentration, dilutionFactor, steps, direction } = options;
  if (!Number.isFinite(startConcentration) || startConcentration <= 0) {
    throw new Error(
      `Invalid starting concentration (${startConcentration}): must be a finite number greater than 0.`
    );
  }
  if (!Number.isFinite(dilutionFactor) || dilutionFactor <= 1) {
    throw new Error(
      `Invalid dilution factor (${dilutionFactor}): must be a finite number strictly greater than 1.`
    );
  }
  if (!Number.isFinite(steps) || steps < 1) {
    throw new Error(
      `Invalid step count (${steps}): must be a finite integer of at least 1.`
    );
  }

  const stepCount = Math.floor(steps);
  const newRows: StandardRow[] = [];
  for (let i = 0; i < stepCount; i++) {
    const val =
      direction === "dilution"
        ? startConcentration / Math.pow(dilutionFactor, i)
        : startConcentration * Math.pow(dilutionFactor, i);
    const formatted = parseFloat(val.toPrecision(4)).toString();
    newRows.push({
      id: Math.random().toString(36).substring(2, 9),
      conc: formatted,
      signals: "",
    });
  }
  newRows.sort((a, b) => parseFloat(a.conc) - parseFloat(b.conc));
  return newRows;
}
