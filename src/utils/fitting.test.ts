/// <reference types="node" />
import assert from "node:assert/strict";
import { PARAM_NAMES, fitData, invertFittedSignal } from "./fitting";

/**
 * Verifies canonical parameter name constants in `PARAM_NAMES`.
 */
function _testParamNamesConstants(): void {
  assert.equal(PARAM_NAMES.SLOPE, "Slope (m)");
  assert.equal(PARAM_NAMES.INTERCEPT, "Intercept (b)");
  assert.equal(PARAM_NAMES.BMAX, "Bmax");
  assert.equal(PARAM_NAMES.KD, "Kd");
  assert.equal(PARAM_NAMES.BOTTOM, "Bottom (a)");
  assert.equal(PARAM_NAMES.HILL_SLOPE, "Hill Slope (b)");
  assert.equal(PARAM_NAMES.EC50, "EC50 (c)");
  assert.equal(PARAM_NAMES.TOP, "Top (d)");
  assert.equal(PARAM_NAMES.ASYMMETRY, "Asymmetry (g)");
  console.log("✓ _testParamNamesConstants passed!");
}

/**
 * Verifies normal linear model fitting, metrics, derivatives, CI, and analytical signal inversion.
 */
function _testLinearFitAndInversion(): void {
  const x = [0.1, 0.5, 1.0, 2.0, 5.0, 10.0];
  const y = x.map((xi, idx) => 2.5 * xi + 0.2 + (idx % 2 === 0 ? 0.005 : -0.005));

  const fit = fitData(x, y, "linear");
  assert.equal(fit.method, "linear");
  assert.equal(fit.k, 2);
  assert.ok(Math.abs(fit.parameters[PARAM_NAMES.SLOPE] - 2.5) < 0.02);
  assert.ok(Math.abs(fit.parameters[PARAM_NAMES.INTERCEPT] - 0.2) < 0.02);
  assert.ok(fit.metrics.r2 > 0.999);
  assert.ok(Number.isFinite(fit.metrics.aicc));
  assert.ok(fit.predictDeriv(3.0) > 2.4);

  const ci = fit.getCI(2.0);
  const pred = fit.predict(2.0);
  assert.ok(ci.low <= pred && pred <= ci.high);

  const targetSignal = fit.predict(3.5);
  const invertedX = invertFittedSignal(fit, targetSignal);
  assert.ok(Math.abs(invertedX - 3.5) < 1e-9);
  console.log("✓ _testLinearFitAndInversion passed!");
}

/**
 * Verifies normal Langmuir isotherm fitting, boundary predictions, and analytical signal inversion.
 */
function _testLangmuirFitAndInversion(): void {
  const x = [0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0];
  const y = x.map((xi, idx) => (5.0 * xi) / (1.5 + xi) + (idx % 2 === 0 ? 0.01 : -0.01));

  const fit = fitData(x, y, "langmuir");
  assert.equal(fit.method, "langmuir");
  assert.equal(fit.k, 2);
  assert.ok(fit.metrics.r2 > 0.995);
  assert.equal(fit.predict(0), 0);
  assert.equal(fit.predict(-1), 0);
  assert.ok(fit.predictDeriv(1.0) > 0);

  const targetSignal = fit.predict(2.0);
  const invertedX = invertFittedSignal(fit, targetSignal);
  assert.ok(Math.abs(invertedX - 2.0) < 1e-6);
  console.log("✓ _testLangmuirFitAndInversion passed!");
}

/**
 * Verifies normal 4PL sigmoidal fitting, asymptote behavior, and analytical signal inversion.
 */
function _test4PLFitAndInversion(): void {
  const x = [0.001, 0.01, 0.03, 0.1, 0.3, 1.0, 3.0, 10.0, 30.0];
  const y = x.map((xi, idx) => {
    const clean = 5.0 + (0.1 - 5.0) / (1 + Math.pow(xi / 0.8, 1.15));
    return clean + (idx % 2 === 0 ? 0.01 : -0.01);
  });

  const fit = fitData(x, y, "4pl");
  assert.equal(fit.method, "4pl");
  assert.equal(fit.k, 4);
  assert.ok(fit.metrics.r2 > 0.998);
  assert.equal(fit.predict(0), fit.parameters[PARAM_NAMES.BOTTOM]);
  assert.equal(fit.predictDeriv(0), 0);
  assert.ok(fit.predictDeriv(0.8) > 0);

  const targetSignal = fit.predict(1.25);
  const invertedX = invertFittedSignal(fit, targetSignal);
  assert.ok(Math.abs(invertedX - 1.25) < 1e-6);
  console.log("✓ _test4PLFitAndInversion passed!");
}

/**
 * Verifies normal 5PL asymmetric sigmoidal fitting and analytical signal inversion.
 */
function _test5PLFitAndInversion(): void {
  const x = [0.005, 0.02, 0.1, 0.5, 2.0, 10.0, 50.0, 200.0];
  const y = x.map((xi, idx) => {
    const clean = 5.0 + (0.12 - 5.0) / Math.pow(1 + Math.pow(xi / 1.8, 1.05), 1.25);
    return clean + (idx % 2 === 0 ? 0.01 : -0.01);
  });

  const fit = fitData(x, y, "5pl");
  assert.equal(fit.method, "5pl");
  assert.equal(fit.k, 5);
  assert.ok(fit.metrics.r2 > 0.995);
  assert.equal(fit.predict(0), fit.parameters[PARAM_NAMES.BOTTOM]);
  assert.equal(fit.predictDeriv(0), 0);

  const targetSignal = fit.predict(2.5);
  const invertedX = invertFittedSignal(fit, targetSignal);
  assert.ok(Math.abs(invertedX - 2.5) < 1e-6);
  console.log("✓ _test5PLFitAndInversion passed!");
}

/**
 * Verifies edge cases: overparameterized sample sizes (`n <= k + 1`), constant signals, and empty inputs.
 */
function _testEdgeCasesAndDegenerateInputs(): void {
  // Overparameterized 4PL (k = 4) with n = 4 points -> AICc must be Infinity
  const smallX = [0.1, 1.0, 10.0, 100.0];
  const smallY = [0.2, 1.5, 3.8, 4.9];
  const small4pl = fitData(smallX, smallY, "4pl");
  assert.equal(small4pl.metrics.aicc, Infinity);

  // Constant readout values -> slope = 0, R² = 0, inversion returns NaN
  const flatFit = fitData([1, 2, 3, 4], [2.5, 2.5, 2.5, 2.5], "linear");
  assert.equal(flatFit.parameters[PARAM_NAMES.SLOPE], 0);
  assert.equal(flatFit.metrics.r2, 0);
  assert.ok(Number.isNaN(invertFittedSignal(flatFit, 3.0)));

  // Empty data arrays -> graceful fallback without throwing
  const emptyLinear = fitData([], [], "linear");
  assert.equal(emptyLinear.metrics.rmse, Infinity);
  assert.equal(emptyLinear.metrics.r2, 0);
  assert.equal(emptyLinear.metrics.aicc, Infinity);
  assert.equal(emptyLinear.cov.length, 2);

  const empty4pl = fitData([], [], "4pl");
  assert.equal(empty4pl.metrics.rmse, Infinity);
  assert.equal(empty4pl.cov.length, 4);
  console.log("✓ _testEdgeCasesAndDegenerateInputs passed!");
}

/**
 * Verifies failure and out-of-domain cases for `invertFittedSignal`.
 */
function _testInvertFittedSignalFailureCases(): void {
  const x = [0.01, 0.1, 1.0, 10.0, 100.0];
  const y = [0.15, 0.6, 2.5, 4.4, 4.9];

  const linearFit = fitData(x, y, "linear");
  const langmuirFit = fitData(x, y, "langmuir");
  const fit4pl = fitData(x, y, "4pl");
  const fit5pl = fitData(x, y, "5pl");

  // Non-finite target signals
  assert.ok(Number.isNaN(invertFittedSignal(linearFit, NaN)));
  assert.ok(Number.isNaN(invertFittedSignal(linearFit, Infinity)));

  // Target signal yielding non-positive concentration on linear fit
  const intercept = linearFit.parameters[PARAM_NAMES.INTERCEPT];
  assert.ok(Number.isNaN(invertFittedSignal(linearFit, intercept - 10)));

  // Out-of-asymptote target signals for Langmuir, 4PL, and 5PL
  assert.ok(Number.isNaN(invertFittedSignal(langmuirFit, -0.5)));
  assert.ok(
    Number.isNaN(
      invertFittedSignal(langmuirFit, langmuirFit.parameters[PARAM_NAMES.BMAX] + 1)
    )
  );
  assert.ok(
    Number.isNaN(invertFittedSignal(fit4pl, fit4pl.parameters[PARAM_NAMES.TOP] + 1))
  );
  assert.ok(
    Number.isNaN(invertFittedSignal(fit4pl, fit4pl.parameters[PARAM_NAMES.BOTTOM] - 1))
  );
  assert.ok(
    Number.isNaN(invertFittedSignal(fit5pl, fit5pl.parameters[PARAM_NAMES.TOP] + 1))
  );
  assert.ok(
    Number.isNaN(invertFittedSignal(fit5pl, fit5pl.parameters[PARAM_NAMES.BOTTOM] - 1))
  );

  // Corrupted parameter map containing NaN
  const corruptedFit = {
    ...fit4pl,
    parameters: { ...fit4pl.parameters, [PARAM_NAMES.EC50]: NaN },
  };
  assert.ok(Number.isNaN(invertFittedSignal(corruptedFit, 2.0)));
  console.log("✓ _testInvertFittedSignalFailureCases passed!");
}

/**
 * Executes all unit tests for `fitting.ts`.
 */
function _runAllFittingTests(): void {
  _testParamNamesConstants();
  _testLinearFitAndInversion();
  _testLangmuirFitAndInversion();
  _test4PLFitAndInversion();
  _test5PLFitAndInversion();
  _testEdgeCasesAndDegenerateInputs();
  _testInvertFittedSignalFailureCases();
  console.log("All fitting.ts unit tests completed successfully!");
}

_runAllFittingTests();
