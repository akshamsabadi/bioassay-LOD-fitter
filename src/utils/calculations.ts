import { fitData, autoFit } from './fitting';

/**
 * Enhanced t-distribution approximation for clinical significance.
 */
export const tinv = (p: number, df: number): number => {
  if (df <= 0) return 0;
  if (df === 1) return Math.tan(Math.PI * (p - 0.5));
  
  // High-accuracy approximation for larger df
  const x = Math.sqrt(df * (Math.exp(Math.pow(normInv(p), 2) / df) - 1));
  return p > 0.5 ? x : -x;
};

function normInv(p: number): number {
  const a1 = -39.6968302866538, a2 = 220.946098424521, a3 = -275.928510446969;
  const a4 = 138.357751867269, a5 = -30.6647980661472, a6 = 2.50662827745924;
  const b1 = -54.4760987982241, b2 = 161.585836858041, b3 = -155.698979859887;
  const b4 = 66.8013118877197, b5 = -13.2806815528857, c1 = -7.78489400243029E-03;
  const c2 = -0.322396458041136, c3 = -2.40075827716184, c4 = -2.54973253934373;
  const c5 = 4.37466414146497, c6 = 2.93816398269878, d1 = 7.78469570904146E-03;
  const d2 = 0.32246712907004, d3 = 2.445134137143, d4 = 3.75440866190742;
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q, r;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q / (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }
}

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

/**
 * Correct Pooled Standard Deviation logic from Ben Miller's repo.
 */
const calculatePooledSD = (standards: StandardData[]) => {
  const groups: Record<number, number[]> = {};
  standards.forEach(s => {
    if (!groups[s.concentration]) groups[s.concentration] = [];
    groups[s.concentration].push(s.readout);
  });

  let sumSquares = 0;
  let totalN = 0;
  let k = 0;

  Object.values(groups).forEach(reps => {
    if (reps.length < 1) return;
    const mean = reps.reduce((a, b) => a + b, 0) / reps.length;
    reps.forEach(r => {
      sumSquares += Math.pow(r - mean, 2);
    });
    totalN += reps.length;
    k++;
  });

  const df = totalN - k;
  if (df <= 0) return { sd: calculateSD(standards.map(s => s.readout)), df: standards.length - 1 };
  return { sd: Math.sqrt(sumSquares / df), df };
};

export const calculateAdvancedLoD = (
  blanks: number[],
  standards: StandardData[],
  method: 'linear' | '4pl' | '5pl' | 'auto' = '4pl',
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
  // Miller Repo: Ld = Lc + t_beta * SD_pooled
  const { sd: sdPooled, df: dfPooled } = calculatePooledSD(standards);
  const tBeta = tinv(1 - beta, dfPooled);
  const ld = lc + tBeta * sdPooled;

  // 3. Curve Fitting
  const x = standards.map(s => s.concentration);
  const y = standards.map(s => s.readout);
  const fit = method === 'auto' ? autoFit(x, y) : fitData(x, y, method);

  // 4. LoD in Concentration space
  let lodConc = 0;
  const p = fit.parameters;
  if (fit.method === 'linear') {
    lodConc = p['Slope (m)'] !== 0 ? (ld - p['Intercept (b)']) / p['Slope (m)'] : 0;
  } else if (fit.method === '4pl') {
    const ratio = (p['Bottom (a)'] - ld) / (ld - p['Top (d)']);
    if (ratio > 0) lodConc = p['EC50 (c)'] * Math.pow(ratio, 1 / p['Hill Slope (b)']);
  } else if (fit.method === '5pl') {
    const ratio = (p['Bottom (a)'] - p['Top (d)']) / (ld - p['Top (d)']);
    if (ratio > 0) {
      const inner = Math.pow(ratio, 1 / p['Asymmetry (g)']) - 1;
      if (inner > 0) lodConc = p['EC50 (c)'] * Math.pow(inner, 1 / p['Hill Slope (b)']);
    }
  }

  return {
    lc,
    ld,
    lodConc,
    meanBlank,
    sdBlank,
    sdPooled,
    fit,
  };
};
