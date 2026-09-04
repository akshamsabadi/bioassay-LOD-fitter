import { fitData, type FitResult } from './fitting';

// Exact critical values for common quantiles for small degrees of freedom
const T_INV_95: Record<number, number> = {
  1: 6.31375, 2: 2.91999, 3: 2.35336, 4: 2.13185, 5: 2.01505,
  6: 1.94318, 7: 1.89458, 8: 1.85955, 9: 1.83311, 10: 1.81246,
  11: 1.79588, 12: 1.78229, 13: 1.77093, 14: 1.76131, 15: 1.75305,
  16: 1.74588, 17: 1.73961, 18: 1.73406, 19: 1.72913, 20: 1.72472
};

const T_INV_975: Record<number, number> = {
  1: 12.70620, 2: 4.30265, 3: 3.18245, 4: 2.77645, 5: 2.57058,
  6: 2.44691, 7: 2.36462, 8: 2.30600, 9: 2.26216, 10: 2.22814,
  11: 2.20099, 12: 2.17881, 13: 2.16037, 14: 2.14479, 15: 2.13145,
  16: 2.11991, 17: 2.10982, 18: 2.10092, 19: 2.09302, 20: 2.08596
};

export const tinv = (p: number, df: number): number => {
  if (df <= 0) return 0;
  if (df === 1) return Math.tan(Math.PI * (p - 0.5));

  const roundedDf = Math.round(df);
  if (Math.abs(df - roundedDf) < 1e-6 && roundedDf >= 1 && roundedDf <= 20) {
    if (Math.abs(p - 0.95) < 1e-4) return T_INV_95[roundedDf];
    if (Math.abs(p - 0.975) < 1e-4) return T_INV_975[roundedDf];
    if (Math.abs(p - 0.05) < 1e-4) return -T_INV_95[roundedDf];
    if (Math.abs(p - 0.025) < 1e-4) return -T_INV_975[roundedDf];
  }

  const x = normInv(p);
  const x3 = Math.pow(x, 3);
  const x5 = Math.pow(x, 5);
  const t = x + (x3 + x) / (4 * df) + (5 * x5 + 16 * x3 + 3 * x) / (96 * Math.pow(df, 2));
  return t;
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
    q = p - 0.5; r = q * q;
    return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q / (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }
}

export interface StandardData {
  concentration: number;
  readout: number;
}

const calculatePooledSD = (standards: StandardData[]) => {
  const groups: Record<number, number[]> = {};
  standards.forEach(s => {
    if (!groups[s.concentration]) groups[s.concentration] = [];
    groups[s.concentration].push(s.readout);
  });
  let ss = 0, n = 0, k = 0;
  Object.values(groups).forEach(reps => {
    if (reps.length < 1) return;
    const m = reps.reduce((a, b) => a + b, 0) / reps.length;
    reps.forEach(r => ss += Math.pow(r - m, 2));
    n += reps.length; k++;
  });
  const df = n - k;
  return { sd: df > 0 ? Math.sqrt(ss / df) : 0, df };
};

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
    betterMethod: 'linear' | 'langmuir' | '4pl' | '5pl';
  };
}

export const calculateAdvancedLoD = (
  blanks: number[],
  standards: StandardData[],
  method: 'linear' | 'langmuir' | '4pl' | '5pl' | 'auto' = 'auto',
  alpha = 0.05,
  beta = 0.05
): AdvancedLoDResult => {
  const x = standards.map(s => s.concentration);
  const y = standards.map(s => s.readout);
  
  const fits: Record<string, FitResult> = {
    linear: fitData(x, y, 'linear'),
    langmuir: fitData(x, y, 'langmuir'),
    '4pl': fitData(x, y, '4pl'),
    '5pl': fitData(x, y, '5pl')
  };

  const availableMethods: Array<'linear' | 'langmuir' | '4pl' | '5pl'> = ['linear', 'langmuir', '4pl', '5pl'];
  let betterMethod: 'linear' | 'langmuir' | '4pl' | '5pl' = '4pl';
  let bestAicc = Infinity;
  availableMethods.forEach(m => {
    const aicc = fits[m].metrics.aicc;
    if (isFinite(aicc) && aicc < bestAicc) {
      bestAicc = aicc;
      betterMethod = m;
    }
  });

  // If all AICc are infinite (e.g. tiny sample size), select model by highest R^2
  if (!isFinite(bestAicc)) {
    let bestR2 = -Infinity;
    availableMethods.forEach(m => {
      const r2 = fits[m].metrics.r2;
      if (isFinite(r2) && r2 > bestR2) {
        bestR2 = r2;
        betterMethod = m;
      }
    });
  }

  let fit: FitResult;
  if (method === 'auto') {
    fit = fits[betterMethod];
  } else {
    fit = fits[method] || fits[betterMethod];
  }

  const meanBlank = blanks.reduce((a, b) => a + b, 0) / blanks.length;
  const sdBlank = Math.sqrt(blanks.reduce((a, b) => a + Math.pow(b - meanBlank, 2), 0) / (blanks.length - 1));

  const { sd: sdPooledRaw, df: dfPooledRaw } = calculatePooledSD(standards);
  const hasReplicates = dfPooledRaw > 0;
  
  // Fallback to fit RMSE if no replicates exist
  const sdPooled = hasReplicates ? sdPooledRaw : (isFinite(fit.metrics.rmse) ? fit.metrics.rmse : sdBlank);
  const dfPooled = hasReplicates ? dfPooledRaw : Math.max(1, standards.length - fit.k);

  // Check curve directionality (increasing vs decreasing/competitive assay)
  const minStdX = Math.min(...x.filter(val => val > 0));
  const maxStdX = Math.max(...x);
  const predMin = fit.predict(minStdX);
  const predMax = fit.predict(maxStdX);
  const isDecreasing = predMax < predMin;

  const tAlpha = tinv(1 - alpha, blanks.length - 1);
  const tBeta = tinv(1 - beta, dfPooled);

  const lc = isDecreasing 
    ? meanBlank - tAlpha * sdBlank
    : meanBlank + tAlpha * sdBlank;

  const ld = isDecreasing
    ? lc - tBeta * sdPooled
    : lc + tBeta * sdPooled;

  let lodConc = NaN;
  const p = fit.parameters;
  if (fit.method === 'linear') {
    const m = p['Slope (m)'];
    const b = p['Intercept (b)'];
    if (Math.abs(m) > 1e-12) {
      lodConc = (ld - b) / m;
    }
  } else if (fit.method === 'langmuir') {
    const bmax = p['Bmax'];
    const kd = p['Kd'];
    if (bmax - ld > 0 && ld > 0) {
      lodConc = (ld * kd) / (bmax - ld);
    }
  } else if (fit.method === '4pl') {
    const a = p['Bottom (a)'];
    const d = p['Top (d)'];
    const b = p['Hill Slope (b)'];
    const c = p['EC50 (c)'];
    // For 4PL, (a - ld)/(ld - d) is positive whenever ld is between asymptotes a and d
    const ratio = (a - ld) / (ld - d);
    if (ratio > 0 && Math.abs(b) > 1e-12 && c > 0) {
      lodConc = c * Math.pow(ratio, 1 / b);
    }
  } else if (fit.method === '5pl') {
    const a = p['Bottom (a)'];
    const d = p['Top (d)'];
    const b = p['Hill Slope (b)'];
    const c = p['EC50 (c)'];
    const g = p['Asymmetry (g)'];
    const ratio = (a - d) / (ld - d);
    if (ratio > 0 && Math.abs(g) > 1e-12 && Math.abs(b) > 1e-12 && c > 0) {
      const inner = Math.pow(ratio, 1 / g) - 1;
      if (inner > 0) {
        lodConc = c * Math.pow(inner, 1 / b);
      }
    }
  }

  // Ensure LOD is positive and physically meaningful
  if (isNaN(lodConc) || !isFinite(lodConc) || lodConc <= 0) {
    lodConc = NaN;
  }

  // Delta Method for rigorous LOD Confidence Interval
  let lodCI = { low: NaN, high: NaN };
  if (!isNaN(lodConc)) {
    const ciAtLOD = fit.getCI(lodConc);
    const seFit = Math.abs(ciAtLOD.high - ciAtLOD.low) / (2 * 1.96);
    const deriv = fit.predictDeriv(lodConc);
    
    if (Math.abs(deriv) > 1e-12) {
      const seLOD = seFit / Math.abs(deriv);
      const dfForLOD = dfPooled;
      const tCrit = tinv(0.975, dfForLOD) || 1.96;
      
      lodCI = {
        low: Math.max(0, lodConc - tCrit * seLOD),
        high: lodConc + tCrit * seLOD
      };
    } else {
      lodCI = { low: lodConc * 0.85, high: lodConc * 1.15 };
    }
  }

  return { 
    lc, ld, lodConc, lodCI, meanBlank, sdBlank, sdPooled, isDecreasing, fit,
    comparison: { fits, betterMethod }
  };
};

export const computeSensitivityFoldChange = (currentLod: number, refLod: number): string => {
  if (!isFinite(currentLod) || !isFinite(refLod) || currentLod <= 0 || refLod <= 0) return "—";
  const ratio = currentLod / refLod;
  if (Math.abs(ratio - 1) < 0.01) return "1.0× (Ref)";
  if (ratio > 1) {
    return `${ratio >= 10 ? ratio.toFixed(1) : ratio.toFixed(2)}× lower`;
  } else {
    const inv = 1 / ratio;
    return `${inv >= 10 ? inv.toFixed(1) : inv.toFixed(2)}× higher`;
  }
};
