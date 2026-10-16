import { levenbergMarquardt } from "ml-levenberg-marquardt";
import { Matrix, inverse } from "ml-matrix";
import { type FitModelName } from "../constants";

/** Maximum iteration count for Levenberg-Marquardt nonlinear least-squares optimization. */
const _LM_MAX_ITERATIONS = 1000;

/** Approximate standard normal critical value for a two-sided 95% confidence interval. */
const _Z_CRITICAL_95 = 1.96;

/** Minimum positive constraint bound for strictly positive kinetic/potency parameters (Kd, EC50). */
const _MIN_POSITIVE_PARAM = 1e-12;

/** Minimum positive bound for Hill slope and asymmetry parameters during optimization. */
const _MIN_SLOPE_OR_ASYMMETRY = 0.01;

/** Numerical zero tolerance used when inverting slope, Hill exponent, or asymmetry parameters. */
const _NUMERIC_ZERO_TOLERANCE = 1e-12;

/** Canonical display names for fitted model parameters. */
export const PARAM_NAMES = {
  SLOPE: "Slope (m)",
  INTERCEPT: "Intercept (b)",
  BMAX: "Bmax",
  KD: "Kd",
  BOTTOM: "Bottom (a)",
  HILL_SLOPE: "Hill Slope (b)",
  EC50: "EC50 (c)",
  TOP: "Top (d)",
  ASYMMETRY: "Asymmetry (g)",
} as const;

/** Goodness-of-fit summary metrics for a regression model. */
export interface FitMetrics {
  rmse: number;
  r2: number;
  aicc: number;
}

/** Complete output of fitting a calibration curve model to standard concentration-signal data. */
export interface FitResult {
  method: FitModelName;
  parameters: Record<string, number>;
  metrics: FitMetrics;
  predict: (x: number) => number;
  predictDeriv: (x: number) => number;
  getCI: (x: number) => { low: number; high: number };
  actualX: number[];
  actualY: number[];
  k: number;
  cov: number[][];
  mse: number;
}

/** Internal specification of a mathematical regression model. */
interface _FitModelDefinition {
  func: (x: number, params: number[]) => number;
  dfdx: (x: number, params: number[]) => number;
  grad: (x: number, params: number[]) => number[];
  invertSignal: (targetY: number, params: number[]) => number;
  k: number;
  paramNames: readonly string[];
  initialValues: (x: number[], y: number[]) => number[];
  minValues: number[];
}

/** Internal outcome of a linear or nonlinear parameter estimation pass. */
interface _ModelOptimizationOutcome {
  params: number[];
  rss: number;
  fitSucceeded: boolean;
}

/**
 * Ensures a computed floating-point number is finite, returning a fallback value otherwise.
 *
 * @param value - Candidate numeric result to validate.
 * @param fallback - Value returned when `value` is `NaN` or infinite.
 * @returns Finite numeric value.
 */
function _sanitizeFinite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Computes heuristic starting parameter guesses for 4PL and 5PL sigmoidal models.
 *
 * @param concentrations - Array of standard concentrations.
 * @param readouts - Array of measured signal readouts.
 * @param includeAsymmetry - Whether to append the 5PL asymmetry factor `g = 1`.
 * @returns Initial parameter vector `[Bottom, HillSlope, EC50, Top]` (plus `Asymmetry` if 5PL).
 */
function _estimateSigmoidalInitialValues(
  concentrations: number[],
  readouts: number[],
  includeAsymmetry: boolean
): number[] {
  const positiveX = concentrations.filter((val) => val > 0);
  const midX = positiveX.length > 0 ? positiveX[Math.floor(positiveX.length / 2)] : 1;
  const minY = readouts.length > 0 ? Math.min(...readouts) : 0;
  const maxY = readouts.length > 0 ? Math.max(...readouts) : 1;
  const baseParams = [minY, 1, midX, maxY];
  return includeAsymmetry ? [...baseParams, 1] : baseParams;
}

/** Registry of supported calibration curve models and their analytical derivatives/inverses. */
const _FIT_MODELS: Record<FitModelName, _FitModelDefinition> = {
  linear: {
    func: (x: number, [m, b]: number[]): number => m * x + b,
    dfdx: (_x: number, [m]: number[]): number => m,
    grad: (x: number): number[] => [x, 1],
    invertSignal: (targetY: number, [m, b]: number[]): number => {
      if (Math.abs(m) <= _NUMERIC_ZERO_TOLERANCE) return NaN;
      return (targetY - b) / m;
    },
    k: 2,
    paramNames: [PARAM_NAMES.SLOPE, PARAM_NAMES.INTERCEPT],
    initialValues: (_x: number[], y: number[]): number[] => [1, y[0] ?? 0],
    minValues: [-Number.MAX_VALUE, -Number.MAX_VALUE],
  },
  langmuir: {
    func: (x: number, [bmax, kd]: number[]): number => {
      if (x <= 0) return 0;
      return (bmax * x) / (kd + x);
    },
    dfdx: (x: number, [bmax, kd]: number[]): number => {
      if (x < 0 || kd <= 0) return 0;
      const denom = kd + x;
      if (denom === 0) return 0;
      return _sanitizeFinite((bmax * kd) / (denom * denom));
    },
    grad: (x: number, [bmax, kd]: number[]): number[] => {
      if (x <= 0) return [0, 0];
      const denom = kd + x;
      if (denom === 0) return [0, 0];
      return [
        _sanitizeFinite(x / denom),
        _sanitizeFinite(-(bmax * x) / (denom * denom)),
      ];
    },
    invertSignal: (targetY: number, [bmax, kd]: number[]): number => {
      if (bmax - targetY <= 0 || targetY <= 0 || kd <= 0) return NaN;
      return (targetY * kd) / (bmax - targetY);
    },
    k: 2,
    paramNames: [PARAM_NAMES.BMAX, PARAM_NAMES.KD],
    initialValues: (x: number[], y: number[]): number[] => [
      y.length > 0 ? Math.max(...y) : 1,
      x[Math.floor(x.length / 2)] || 1,
    ],
    minValues: [0, _MIN_POSITIVE_PARAM],
  },
  "4pl": {
    func: (x: number, [a, b, c, d]: number[]): number => {
      if (x <= 0 || c <= 0) return a;
      const xOverCPowB = Math.pow(x / c, b);
      if (!Number.isFinite(xOverCPowB)) return d;
      return d + (a - d) / (1 + xOverCPowB);
    },
    dfdx: (x: number, [a, b, c, d]: number[]): number => {
      if (x <= 0 || c <= 0) return 0;
      const xOverC = x / c;
      const xOverCPowB = Math.pow(xOverC, b);
      const denom = 1 + xOverCPowB;
      const deriv = (-(a - d) * b * Math.pow(xOverC, b - 1)) / (c * denom * denom);
      return _sanitizeFinite(deriv);
    },
    grad: (x: number, [a, b, c, d]: number[]): number[] => {
      if (x <= 0 || c <= 0) return [1, 0, 0, 0];
      const xOverC = x / c;
      const xOverCPowB = Math.pow(xOverC, b);
      const denom = 1 + xOverCPowB;
      const dA = 1 / denom;
      const dB = (-(a - d) * (xOverCPowB * Math.log(xOverC))) / (denom * denom);
      const dC = ((a - d) * ((b * xOverCPowB) / c)) / (denom * denom);
      const dD = xOverCPowB / denom;
      return [
        _sanitizeFinite(dA),
        _sanitizeFinite(dB),
        _sanitizeFinite(dC),
        _sanitizeFinite(dD),
      ];
    },
    invertSignal: (targetY: number, [a, b, c, d]: number[]): number => {
      if (targetY === d) return NaN;
      const ratio = (a - targetY) / (targetY - d);
      if (ratio <= 0 || Math.abs(b) <= _NUMERIC_ZERO_TOLERANCE || c <= 0) return NaN;
      return c * Math.pow(ratio, 1 / b);
    },
    k: 4,
    paramNames: [
      PARAM_NAMES.BOTTOM,
      PARAM_NAMES.HILL_SLOPE,
      PARAM_NAMES.EC50,
      PARAM_NAMES.TOP,
    ],
    initialValues: (x: number[], y: number[]): number[] =>
      _estimateSigmoidalInitialValues(x, y, false),
    minValues: [
      -Number.MAX_VALUE,
      _MIN_SLOPE_OR_ASYMMETRY,
      _MIN_POSITIVE_PARAM,
      -Number.MAX_VALUE,
    ],
  },
  "5pl": {
    func: (x: number, [a, b, c, d, g]: number[]): number => {
      if (x <= 0 || c <= 0) return a;
      const xOverCPowB = Math.pow(x / c, b);
      if (!Number.isFinite(xOverCPowB)) return d;
      const denom = Math.pow(1 + xOverCPowB, g);
      if (!Number.isFinite(denom) || denom === 0) return d;
      return d + (a - d) / denom;
    },
    dfdx: (x: number, [a, b, c, d, g]: number[]): number => {
      if (x <= 0 || c <= 0) return 0;
      const xOverC = x / c;
      const xOverCPowB = Math.pow(xOverC, b);
      const denomBase = 1 + xOverCPowB;
      const denom = Math.pow(denomBase, g + 1);
      const deriv = (-(a - d) * g * b * Math.pow(xOverC, b - 1)) / (c * denom);
      return _sanitizeFinite(deriv);
    },
    grad: (x: number, [a, b, c, d, g]: number[]): number[] => {
      if (x <= 0 || c <= 0) return [1, 0, 0, 0, 0];
      const xOverC = x / c;
      const xOverCPowB = Math.pow(xOverC, b);
      const denomBase = 1 + xOverCPowB;
      const denom = Math.pow(denomBase, g);
      const dA = 1 / denom;
      const dB = -(a - d) * g * (xOverCPowB * Math.log(xOverC)) * Math.pow(denomBase, -g - 1);
      const dC = (a - d) * g * ((b * xOverCPowB) / c) * Math.pow(denomBase, -g - 1);
      const dD = 1 - 1 / denom;
      const dG = (-(a - d) * Math.log(denomBase)) / denom;
      return [
        _sanitizeFinite(dA),
        _sanitizeFinite(dB),
        _sanitizeFinite(dC),
        _sanitizeFinite(dD),
        _sanitizeFinite(dG),
      ];
    },
    invertSignal: (targetY: number, [a, b, c, d, g]: number[]): number => {
      if (targetY === d) return NaN;
      const ratio = (a - d) / (targetY - d);
      if (
        ratio <= 0 ||
        Math.abs(g) <= _NUMERIC_ZERO_TOLERANCE ||
        Math.abs(b) <= _NUMERIC_ZERO_TOLERANCE ||
        c <= 0
      ) {
        return NaN;
      }
      const inner = Math.pow(ratio, 1 / g) - 1;
      if (inner <= 0) return NaN;
      return c * Math.pow(inner, 1 / b);
    },
    k: 5,
    paramNames: [
      PARAM_NAMES.BOTTOM,
      PARAM_NAMES.HILL_SLOPE,
      PARAM_NAMES.EC50,
      PARAM_NAMES.TOP,
      PARAM_NAMES.ASYMMETRY,
    ],
    initialValues: (x: number[], y: number[]): number[] =>
      _estimateSigmoidalInitialValues(x, y, true),
    minValues: [
      -Number.MAX_VALUE,
      _MIN_SLOPE_OR_ASYMMETRY,
      _MIN_POSITIVE_PARAM,
      -Number.MAX_VALUE,
      _MIN_SLOPE_OR_ASYMMETRY,
    ],
  },
};

/**
 * Fits a closed-form ordinary least squares (OLS) linear model to concentration-readout pairs.
 *
 * @param concentrations - Array of calibrator concentrations.
 * @param readouts - Array of signal readouts.
 * @returns Fitted `[slope, intercept]` parameters, residual sum of squares, and convergence status.
 */
function _fitLinearLeastSquares(
  concentrations: number[],
  readouts: number[]
): _ModelOptimizationOutcome {
  const n = concentrations.length;
  if (n === 0) {
    return { params: [0, 0], rss: Infinity, fitSucceeded: false };
  }
  const meanX = concentrations.reduce((a, b) => a + b, 0) / n;
  const meanY = readouts.reduce((a, b) => a + b, 0) / n;
  const denom = concentrations.reduce((a, b) => a + Math.pow(b - meanX, 2), 0);
  const slope =
    denom !== 0
      ? concentrations.reduce((a, b, i) => a + (b - meanX) * (readouts[i] - meanY), 0) / denom
      : 0;
  const intercept = meanY - slope * meanX;
  const params = [slope, intercept];
  const rss = concentrations.reduce(
    (sum, xi, i) => sum + Math.pow(readouts[i] - (slope * xi + intercept), 2),
    0
  );
  return { params, rss, fitSucceeded: Number.isFinite(rss) };
}

/**
 * Fits a nonlinear model using bounded Levenberg-Marquardt optimization.
 *
 * @param concentrations - Array of calibrator concentrations.
 * @param readouts - Array of signal readouts.
 * @param model - Nonlinear model definition.
 * @param initialValues - Heuristic initial parameter values.
 * @returns Optimized parameter vector, residual sum of squares, and convergence status.
 */
function _fitNonlinearLevenbergMarquardt(
  concentrations: number[],
  readouts: number[],
  model: _FitModelDefinition,
  initialValues: number[]
): _ModelOptimizationOutcome {
  if (concentrations.length === 0) {
    return { params: [...initialValues], rss: Infinity, fitSucceeded: false };
  }
  try {
    const options = {
      initialValues,
      minValues: model.minValues,
      maxIterations: _LM_MAX_ITERATIONS,
    };
    const result = levenbergMarquardt(
      { x: concentrations, y: readouts },
      (p: number[]) => (xi: number) => model.func(xi, p),
      options
    );
    if (
      result &&
      Array.isArray(result.parameterValues) &&
      result.parameterValues.every((v) => Number.isFinite(v))
    ) {
      const params = result.parameterValues;
      const rss = Number.isFinite(result.parameterError)
        ? result.parameterError
        : concentrations.reduce(
            (s, xi, i) => s + Math.pow(readouts[i] - model.func(xi, params), 2),
            0
          );
      return { params, rss, fitSucceeded: true };
    }
  } catch {
    // Fall through to failed outcome when Levenberg-Marquardt diverges or throws
  }
  return { params: [...initialValues], rss: Infinity, fitSucceeded: false };
}

/**
 * Computes goodness-of-fit statistics (RMSE, R², and second-order Akaike Information Criterion AICc).
 *
 * @param readouts - Observed signal readouts.
 * @param rss - Residual sum of squares from regression.
 * @param k - Number of fitted model parameters.
 * @param fitSucceeded - Whether optimization converged to finite parameters.
 * @returns Object containing `rmse`, `r2`, and `aicc`.
 */
function _calculateFitMetrics(
  readouts: number[],
  rss: number,
  k: number,
  fitSucceeded: boolean
): FitMetrics {
  const n = readouts.length;
  if (n === 0) {
    return { rmse: Infinity, r2: 0, aicc: Infinity };
  }
  const meanY = readouts.reduce((s, v) => s + v, 0) / n;
  const ssTot = readouts.reduce((a, b) => a + Math.pow(b - meanY, 2), 0);
  const r2 =
    !fitSucceeded || ssTot === 0 || !Number.isFinite(rss)
      ? 0
      : Math.max(0, 1 - rss / ssTot);
  const rmse =
    !fitSucceeded || !Number.isFinite(rss) ? Infinity : Math.sqrt(Math.max(0, rss / n));

  // If sample size is too small for the model's degrees of freedom (n <= k + 1),
  // the second-order correction term has a non-positive denominator, indicating overparameterization.
  let aicc = Infinity;
  if (fitSucceeded && Number.isFinite(rss) && rss > 0 && n > k + 1) {
    const aic = n * Math.log(rss / n) + 2 * k;
    const correction = (2 * k * (k + 1)) / (n - k - 1);
    aicc = aic + correction;
  }

  return { rmse, r2, aicc };
}

/**
 * Estimates the parameter covariance matrix `(J^T * J)^(-1) * MSE` from the model Jacobian.
 *
 * @param concentrations - Array of calibrator concentrations.
 * @param params - Fitted model parameter vector.
 * @param model - Regression model definition providing parameter gradients.
 * @param mse - Mean squared error of the regression fit.
 * @returns Parameter covariance `Matrix` (falls back to scaled identity matrix if singular).
 */
function _calculateCovarianceMatrix(
  concentrations: number[],
  params: number[],
  model: _FitModelDefinition,
  mse: number
): Matrix {
  const n = concentrations.length;
  try {
    if (n === 0) {
      return Matrix.eye(model.k).mul(mse || 1);
    }
    const jacobian = new Matrix(n, model.k);
    for (let i = 0; i < n; i++) {
      const gradRow = model.grad(concentrations[i], params);
      for (let j = 0; j < model.k; j++) {
        jacobian.set(i, j, gradRow[j]);
      }
    }
    const jt = jacobian.transpose();
    const jtj = jt.mmul(jacobian);
    return inverse(jtj).mul(mse);
  } catch {
    return Matrix.eye(model.k).mul(mse || 1);
  }
}

/**
 * Analytically inverts a fitted calibration curve to solve for positive concentration `x` at `targetSignal`.
 *
 * @param fit - Completed regression fit result.
 * @param targetSignal - Target signal readout (e.g. detection limit `L_D`) to invert.
 * @returns Strictly positive concentration corresponding to `targetSignal`, or `NaN` if out of domain.
 */
export function invertFittedSignal(fit: FitResult, targetSignal: number): number {
  if (!Number.isFinite(targetSignal)) return NaN;
  const model = _FIT_MODELS[fit.method];
  if (!model) return NaN;
  const orderedParams = model.paramNames.map((name) => fit.parameters[name]);
  if (orderedParams.some((val) => !Number.isFinite(val))) return NaN;
  const concentration = model.invertSignal(targetSignal, orderedParams);
  return Number.isFinite(concentration) && concentration > 0 ? concentration : NaN;
}

/**
 * Fits a dose-response regression model (`linear`, `langmuir`, `4pl`, or `5pl`) to standard calibration data.
 *
 * @param concentrations - Array of standard calibrator concentrations (`x`).
 * @param readouts - Array of measured signal readouts (`y`).
 * @param method - Regression model identifier.
 * @returns Complete `FitResult` including fitted parameters, goodness-of-fit metrics, prediction, derivative, and 95% CI closures.
 */
export const fitData = (
  concentrations: number[],
  readouts: number[],
  method: FitModelName
): FitResult => {
  const n = concentrations.length;
  const model = _FIT_MODELS[method];
  const initialVals = model.initialValues(concentrations, readouts);

  const { params, rss, fitSucceeded } =
    method === "linear"
      ? _fitLinearLeastSquares(concentrations, readouts)
      : _fitNonlinearLevenbergMarquardt(concentrations, readouts, model, initialVals);

  const metrics = _calculateFitMetrics(readouts, rss, model.k, fitSucceeded);
  const mse =
    fitSucceeded && n > model.k
      ? rss / (n - model.k)
      : Number.isFinite(rss) && n > 0
        ? rss / n
        : 1;
  const cov = _calculateCovarianceMatrix(concentrations, params, model, mse);

  const parameters: Record<string, number> = {};
  model.paramNames.forEach((name, i) => {
    parameters[name] = params[i];
  });

  return {
    method,
    parameters,
    metrics,
    predict: (val: number): number => _sanitizeFinite(model.func(val, params), 0),
    predictDeriv: (val: number): number => model.dfdx(val, params),
    getCI: (val: number): { low: number; high: number } => {
      const pred = _sanitizeFinite(model.func(val, params), 0);
      try {
        const g = new Matrix([model.grad(val, params)]);
        const variance = g.mmul(cov).mmul(g.transpose()).get(0, 0);
        const se = Math.sqrt(Math.max(0, _sanitizeFinite(variance, 0)));
        return {
          low: pred - _Z_CRITICAL_95 * se,
          high: pred + _Z_CRITICAL_95 * se,
        };
      } catch {
        return { low: pred, high: pred };
      }
    },
    actualX: concentrations,
    actualY: readouts,
    k: model.k,
    cov: cov.to2DArray(),
    mse,
  };
};
