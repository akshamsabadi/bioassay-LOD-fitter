/// <reference types="node" />
import assert from "node:assert/strict";
import {
  calculateAdvancedLoD,
  computeAssayQualityChecks,
  computeReplicateStats,
  computeSensitivityFoldChange,
  generateSerialDilutionRows,
  parseSignalNumbers,
  tinv,
} from "./calculations";
import { type StandardRow } from "../constants";

/**
 * Verifies `tinv` across exact lookup tables, Cauchy (`df = 1`), Cornish-Fisher tails, and invalid inputs.
 */
function _testTinvNormalEdgeAndFailure(): void {
  // Normal: exact lookup table values for df <= 20
  assert.ok(Math.abs(tinv(0.95, 2) - 2.91999) < 1e-4);
  assert.ok(Math.abs(tinv(0.975, 2) - 4.30265) < 1e-4);
  assert.ok(Math.abs(tinv(0.05, 2) + 2.91999) < 1e-4);
  assert.ok(Math.abs(tinv(0.025, 2) + 4.30265) < 1e-4);

  // Edge: df = 1 non-tabulated quantile uses exact Cauchy formula
  const cauchy90 = tinv(0.9, 1);
  assert.ok(Math.abs(cauchy90 - Math.tan(Math.PI * 0.4)) < 1e-9);

  // Edge: large df Cornish-Fisher central and extreme lower/upper tails
  const zCentral = tinv(0.8, 50);
  const zLowerTail = tinv(0.01, 50);
  const zUpperTail = tinv(0.99, 50);
  assert.ok(zCentral > 0.8 && zCentral < 0.9);
  assert.ok(Math.abs(zLowerTail + zUpperTail) < 1e-6);

  // Failure / invalid inputs return 0
  assert.equal(tinv(0.95, 0), 0);
  assert.equal(tinv(0.95, -5), 0);
  assert.equal(tinv(0, 5), 0);
  assert.equal(tinv(1, 5), 0);
  assert.equal(tinv(NaN, 5), 0);
  console.log("✓ _testTinvNormalEdgeAndFailure passed!");
}

/**
 * Verifies standard 4PL Limit of Detection calculation and Delta Method 95% CI.
 */
function _testStandardLODCalculation(): void {
  const blanks = [0.07, 0.13, 0.08, 0.1];
  const standards = [
    { concentration: 0.1, readout: 0.15 },
    { concentration: 0.1, readout: 0.17 },
    { concentration: 1.0, readout: 1.25 },
    { concentration: 1.0, readout: 1.35 },
    { concentration: 10.0, readout: 4.5 },
    { concentration: 10.0, readout: 4.6 },
  ];

  const result = calculateAdvancedLoD(blanks, standards, "4pl");
  assert.ok(Number.isFinite(result.lodConc) && result.lodConc > 0);
  assert.ok(result.lc > result.meanBlank);
  assert.ok(result.ld > result.lc);
  assert.ok(Number.isFinite(result.lodCI.low) && Number.isFinite(result.lodCI.high));
  assert.ok(result.lodCI.low < result.lodConc && result.lodCI.high > result.lodConc);
  console.log("✓ _testStandardLODCalculation passed!");
}

/**
 * Verifies competitive (decreasing response) bioassay detection limits.
 */
function _testCompetitiveAssayCalculation(): void {
  const blanks = [4.8, 4.9, 5.0];
  const standards = [
    { concentration: 0.1, readout: 4.5 },
    { concentration: 1.0, readout: 2.5 },
    { concentration: 10.0, readout: 0.8 },
    { concentration: 50.0, readout: 0.2 },
  ];

  const result = calculateAdvancedLoD(blanks, standards, "linear");
  assert.equal(result.isDecreasing, true);
  assert.ok(result.lc < result.meanBlank);
  assert.ok(result.ld < result.lc);
  console.log("✓ _testCompetitiveAssayCalculation passed!");
}

/**
 * Verifies single-replicate fallback to regression RMSE, single-blank handling,
 * overparameterized model disqualification, out-of-bounds LOD, and positive log CI lower bound.
 */
function _testLODEdgeAndFallbackCases(): void {
  const blanks = [0.08, 0.12, 0.1];
  const singleRepStandards = [
    { concentration: 0.1, readout: 0.15 },
    { concentration: 1.0, readout: 1.1 },
    { concentration: 10.0, readout: 4.8 },
  ];

  // Single replicate fallback to fit RMSE
  const singleRepResult = calculateAdvancedLoD(blanks, singleRepStandards, "linear");
  assert.ok(singleRepResult.sdPooled > 0);
  assert.equal(singleRepResult.sdPooled, singleRepResult.fit.metrics.rmse);

  // Auto model selection disqualifies 4PL (k=4) and 5PL (k=5) when n=3
  const autoResult = calculateAdvancedLoD(blanks, singleRepStandards, "auto");
  assert.notEqual(autoResult.fit.method, "4pl");
  assert.notEqual(autoResult.fit.method, "5pl");

  // Single blank replicate -> sdBlank = 0 without division by zero
  const singleBlankResult = calculateAdvancedLoD([0.1], singleRepStandards, "linear");
  assert.equal(singleBlankResult.sdBlank, 0);

  // Out-of-bounds LD -> lodConc and lodCI bounds are NaN
  const highBlanks = [1.2, 1.3, 1.1];
  const lowStandards = [
    { concentration: 0.1, readout: 0.12 },
    { concentration: 1.0, readout: 0.15 },
    { concentration: 10.0, readout: 0.18 },
  ];
  const oobResult = calculateAdvancedLoD(highBlanks, lowStandards, "4pl");
  assert.ok(Number.isNaN(oobResult.lodConc));
  assert.ok(Number.isNaN(oobResult.lodCI.low) && Number.isNaN(oobResult.lodCI.high));

  // Strictly positive lower bound on log scale even with high blank variance
  const noisyBlanks = [0.01, 0.09, 0.05];
  const wideStandards = [
    { concentration: 0.01, readout: 0.06 },
    { concentration: 0.1, readout: 0.12 },
    { concentration: 1.0, readout: 1.05 },
    { concentration: 10.0, readout: 4.8 },
  ];
  const logCiResult = calculateAdvancedLoD(noisyBlanks, wideStandards, "auto");
  assert.ok(Number.isFinite(logCiResult.lodCI.low) && logCiResult.lodCI.low > 0);
  console.log("✓ _testLODEdgeAndFallbackCases passed!");
}

/**
 * Verifies `computeSensitivityFoldChange` across reference, equal, higher/lower, and invalid inputs.
 */
function _testSensitivityFoldChange(): void {
  assert.equal(computeSensitivityFoldChange(0.05, 0.05, true), "1.0× (Ref)");
  assert.equal(computeSensitivityFoldChange(0.0501, 0.05, false), "1.0× (Equal)");
  assert.equal(computeSensitivityFoldChange(0.025, 0.05, false), "2.00× higher");
  assert.equal(computeSensitivityFoldChange(0.0025, 0.05, false), "20.0× higher");
  assert.equal(computeSensitivityFoldChange(0.15, 0.05, false), "3.00× lower");
  assert.equal(computeSensitivityFoldChange(0.75, 0.05, false), "15.0× lower");
  assert.equal(computeSensitivityFoldChange(NaN, 0.05, false), "—");
  assert.equal(computeSensitivityFoldChange(-1, 0.05, false), "—");
  assert.equal(computeSensitivityFoldChange(0.05, 0, false), "—");
  console.log("✓ _testSensitivityFoldChange passed!");
}

/**
 * Verifies `parseSignalNumbers` and `computeReplicateStats` across normal, edge, and empty inputs.
 */
function _testReplicateParsingAndStats(): void {
  assert.deepEqual(parseSignalNumbers("0.12, 0.15, 0.18"), [0.12, 0.15, 0.18]);
  assert.deepEqual(parseSignalNumbers(""), []);
  assert.deepEqual(parseSignalNumbers("  , abc , "), []);

  const stats3 = computeReplicateStats("1.0, 2.0, 3.0");
  assert.ok(stats3 !== null);
  assert.equal(stats3.n, 3);
  assert.equal(stats3.mean, 2.0);
  assert.equal(stats3.sd, 1.0);
  assert.equal(stats3.cv, 50.0);

  const statsSingle = computeReplicateStats("4.2");
  assert.deepEqual(statsSingle, { n: 1, mean: 4.2, sd: 0, cv: 0 });

  const statsZeroMean = computeReplicateStats("-1, 1");
  assert.ok(statsZeroMean !== null);
  assert.equal(statsZeroMean.mean, 0);
  assert.equal(statsZeroMean.cv, 0);

  assert.equal(computeReplicateStats(""), null);
  console.log("✓ _testReplicateParsingAndStats passed!");
}

/**
 * Verifies `computeAssayQualityChecks` for clean fits, poor R², high CV%, and Hook Effect detection.
 */
function _testAssayQualityChecks(): void {
  assert.deepEqual(computeAssayQualityChecks(null, [], "0.05, 0.06"), []);

  const cleanRows: StandardRow[] = [
    { id: "1", conc: "0.1", signals: "0.20, 0.21" },
    { id: "2", conc: "1.0", signals: "1.50, 1.52" },
    { id: "3", conc: "10.0", signals: "4.50, 4.55" },
  ];
  const cleanStandards = [
    { concentration: 0.1, readout: 0.2 },
    { concentration: 0.1, readout: 0.21 },
    { concentration: 1.0, readout: 1.5 },
    { concentration: 1.0, readout: 1.52 },
    { concentration: 10.0, readout: 4.5 },
    { concentration: 10.0, readout: 4.55 },
  ];
  const cleanRes = calculateAdvancedLoD([0.05, 0.06], cleanStandards, "langmuir");
  assert.deepEqual(computeAssayQualityChecks(cleanRes, cleanRows, "0.05, 0.06"), []);

  // Trigger all warning categories: low R², high blank CV, high standard CV, and Hook Effect
  const hookRows: StandardRow[] = [
    { id: "1", conc: "0.1", signals: "0.2, 0.8" }, // High standard CV
    { id: "2", conc: "1.0", signals: "4.5, 4.6" },
    { id: "3", conc: "10.0", signals: "1.2, 1.3" }, // Hook drop at high conc
  ];
  const hookStandards = [
    { concentration: 0.1, readout: 0.2 },
    { concentration: 0.1, readout: 0.8 },
    { concentration: 1.0, readout: 4.5 },
    { concentration: 1.0, readout: 4.6 },
    { concentration: 10.0, readout: 1.2 },
    { concentration: 10.0, readout: 1.3 },
  ];
  const hookRes = calculateAdvancedLoD([0.01, 0.25], hookStandards, "linear");
  const warnings = computeAssayQualityChecks(hookRes, hookRows, "0.01, 0.25");
  assert.ok(warnings.some((w) => w.includes("Poor fit quality")));
  assert.ok(warnings.some((w) => w.includes("High blank replicate variance")));
  assert.ok(warnings.some((w) => w.includes("High replicate variance at concentration 0.1")));
  assert.ok(warnings.some((w) => w.includes("Hook Effect")));
  console.log("✓ _testAssayQualityChecks passed!");
}

/**
 * Verifies `generateSerialDilutionRows` for normal dilution/multiplication and `assert.throws` on invalid parameters.
 */
function _testGenerateSerialDilutionRows(): void {
  const dilutionRows = generateSerialDilutionRows({
    startConcentration: 100,
    dilutionFactor: 10,
    steps: 4,
    direction: "dilution",
  });
  assert.equal(dilutionRows.length, 4);
  assert.deepEqual(
    dilutionRows.map((r) => r.conc),
    ["0.1", "1", "10", "100"]
  );

  const serialRows = generateSerialDilutionRows({
    startConcentration: 0.5,
    dilutionFactor: 2,
    steps: 3,
    direction: "serial",
  });
  assert.deepEqual(
    serialRows.map((r) => r.conc),
    ["0.5", "1", "2"]
  );

  // Failure cases must throw descriptive Errors
  assert.throws(
    () =>
      generateSerialDilutionRows({
        startConcentration: 0,
        dilutionFactor: 2,
        steps: 4,
        direction: "dilution",
      }),
    /Invalid starting concentration/
  );
  assert.throws(
    () =>
      generateSerialDilutionRows({
        startConcentration: 10,
        dilutionFactor: 1,
        steps: 4,
        direction: "dilution",
      }),
    /Invalid dilution factor/
  );
  assert.throws(
    () =>
      generateSerialDilutionRows({
        startConcentration: 10,
        dilutionFactor: 2,
        steps: 0,
        direction: "dilution",
      }),
    /Invalid step count/
  );
  console.log("✓ _testGenerateSerialDilutionRows passed!");
}

/**
 * Executes all unit tests for `calculations.ts`.
 */
function _runAllCalculationTests(): void {
  _testTinvNormalEdgeAndFailure();
  _testStandardLODCalculation();
  _testCompetitiveAssayCalculation();
  _testLODEdgeAndFallbackCases();
  _testSensitivityFoldChange();
  _testReplicateParsingAndStats();
  _testAssayQualityChecks();
  _testGenerateSerialDilutionRows();
  console.log("All calculations and LOD statistical engine unit tests completed successfully!");
}

_runAllCalculationTests();
