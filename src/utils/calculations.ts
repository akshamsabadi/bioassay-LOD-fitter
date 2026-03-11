import { fitData } from './fitting';

export const tinv = (_p: number, df: number): number => {
  if (df <= 0) return 0;
  if (df === 1) return 6.314;
  if (df === 2) return 2.920;
  if (df === 3) return 2.353;
  if (df === 4) return 2.132;
  if (df === 5) return 2.015;
  if (df > 30) return 1.645;
  return 1.7 + (2.0 - 1.7) * (1 / Math.sqrt(df));
};

export const calculateMean = (data: number[]): number => {
  if (data.length === 0) return 0;
  return data.reduce((a, b) => a + b, 0) / data.length;
};

export const calculateSD = (data: number[]): number => {
  if (data.length <= 1) return 0;
  const mean = calculateMean(data);
  const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (data.length - 1);
  return Math.sqrt(variance);
};

export interface StandardData {
  concentration: number;
  readout: number;
}

export const calculateAdvancedLoD = (
  blanks: number[],
  standards: StandardData[],
  method: 'linear' | '4pl' = 'linear',
  alpha = 0.05,
  beta = 0.05
) => {
  // 1. Limit of Blank (Lc)
  const meanBlank = calculateMean(blanks);
  const sdBlank = calculateSD(blanks);
  const dfBlank = blanks.length - 1;
  const tAlpha = tinv(1 - alpha, dfBlank);
  const lc = meanBlank + tAlpha * sdBlank;

  // 2. Limit of Detection in Signal (Ld)
  const sdTest = calculateSD(standards.map(s => s.readout));
  const dfTest = standards.length - 1;
  const tBeta = tinv(1 - beta, dfTest);
  const ld = lc + tBeta * sdTest;

  // 3. Curve Fitting
  const x = standards.map(s => s.concentration);
  const y = standards.map(s => s.readout);
  const fit = fitData(x, y, method);

  // 4. LoD in Concentration space (Inverse calculation)
  let lodConc = 0;
  if (method === 'linear') {
    const m = fit.parameters['Slope (m)'];
    const b = fit.parameters['Intercept (b)'];
    lodConc = m !== 0 ? (ld - b) / m : 0;
  } else if (method === '4pl') {
    const a = fit.parameters['Bottom (a)'];
    const b = fit.parameters['Slope (b)'];
    const c = fit.parameters['EC50 (c)'];
    const d = fit.parameters['Top (d)'];
    
    // Inverse 4PL
    const ratio = (a - ld) / (ld - d);
    if (ratio > 0) {
      lodConc = c * Math.pow(ratio, 1 / b);
    }
  }

  return {
    lc,
    ld,
    lodConc,
    meanBlank,
    sdBlank,
    fit,
  };
};
