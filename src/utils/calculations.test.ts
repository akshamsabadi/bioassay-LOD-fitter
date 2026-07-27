import { calculateAdvancedLoD } from './calculations';

const testStandardLODCalculation = () => {
  const blanks = [0.07, 0.13, 0.08, 0.10];
  const standards = [
    { concentration: 0.1, readout: 0.15 },
    { concentration: 0.1, readout: 0.17 },
    { concentration: 1.0, readout: 1.25 },
    { concentration: 1.0, readout: 1.35 },
    { concentration: 10.0, readout: 4.50 },
    { concentration: 10.0, readout: 4.60 }
  ];

  const result = calculateAdvancedLoD(blanks, standards, '4pl');

  // Verify result object has all required fields
  if (isNaN(result.lodConc)) {
    throw new Error(`Expected lodConc to be a number, got NaN`);
  }
  if (result.lodConc <= 0) {
    throw new Error(`Expected positive LOD concentration, got ${result.lodConc}`);
  }

  // Verify LC and LD are computed correctly
  if (result.lc <= result.meanBlank) {
    throw new Error(`Expected LC (${result.lc}) to be greater than meanBlank (${result.meanBlank})`);
  }
  if (result.ld <= result.lc) {
    throw new Error(`Expected LD (${result.ld}) to be greater than LC (${result.lc})`);
  }

  // Verify Delta Method LOD CI
  if (isNaN(result.lodCI.low) || isNaN(result.lodCI.high)) {
    throw new Error(`Expected Delta Method LOD CI to be defined, got [${result.lodCI.low}, ${result.lodCI.high}]`);
  }
  if (result.lodCI.low >= result.lodConc || result.lodCI.high <= result.lodConc) {
    throw new Error(`Expected LOD concentration ${result.lodConc} to be inside interval [${result.lodCI.low}, ${result.lodCI.high}]`);
  }

  console.log('✓ testStandardLODCalculation passed!');
};

const testSingleReplicateFallback = () => {
  const blanks = [0.08, 0.12, 0.10];
  // No replicates for standards
  const standards = [
    { concentration: 0.1, readout: 0.15 },
    { concentration: 1.0, readout: 1.10 },
    { concentration: 10.0, readout: 4.80 }
  ];

  const result = calculateAdvancedLoD(blanks, standards, 'linear');

  // Verify single-replicate fallback used fit RMSE
  if (result.sdPooled <= 0) {
    throw new Error(`Expected positive fallback pooled SD from fit RMSE, got ${result.sdPooled}`);
  }
  if (result.sdPooled !== result.fit.metrics.rmse) {
    throw new Error(`Expected pooled SD to equal fit RMSE (${result.fit.metrics.rmse}), got ${result.sdPooled}`);
  }

  console.log('✓ testSingleReplicateFallback passed!');
};

const testOutOfBoundsLOD = () => {
  const blanks = [1.2, 1.3, 1.1]; // Extremely high blanks/L_D
  const standards = [
    { concentration: 0.1, readout: 0.12 },
    { concentration: 1.0, readout: 0.15 },
    { concentration: 10.0, readout: 0.18 }
  ];

  // Blanks are much higher than all standards' signal, meaning L_D will be way above model saturation (Top asymptote d ~ 0.18)
  const result = calculateAdvancedLoD(blanks, standards, '4pl');

  // Verify that out-of-bounds LOD returns NaN and NaN CI
  if (!isNaN(result.lodConc)) {
    throw new Error(`Expected lodConc to be NaN for out-of-bounds mapping, got ${result.lodConc}`);
  }
  if (!isNaN(result.lodCI.low) || !isNaN(result.lodCI.high)) {
    throw new Error(`Expected lodCI to have NaN bounds, got [${result.lodCI.low}, ${result.lodCI.high}]`);
  }

  console.log('✓ testOutOfBoundsLOD passed!');
};

const runAllTests = () => {
  testStandardLODCalculation();
  testSingleReplicateFallback();
  testOutOfBoundsLOD();
  console.log('All calculations and LOD statistical engine unit tests completed successfully!');
};

runAllTests();
