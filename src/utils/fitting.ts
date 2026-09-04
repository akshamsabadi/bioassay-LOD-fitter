import { levenbergMarquardt } from 'ml-levenberg-marquardt';
import { Matrix, inverse } from 'ml-matrix';

export interface FitResult {
  method: string;
  parameters: Record<string, number>;
  metrics: {
    rmse: number;
    r2: number;
    aicc: number;
  };
  predict: (x: number) => number;
  predictDeriv: (x: number) => number;
  getCI: (x: number) => { low: number; high: number };
  actualX: number[];
  actualY: number[];
  k: number;
  cov: number[][];
  mse: number;
}

const models = {
  linear: {
    func: (x: number, [m, b]: number[]) => m * x + b,
    dfdx: (_x: number, [m, _b]: number[]) => m,
    grad: (x: number, [_m, _b]: number[]) => [x, 1],
    k: 2,
    paramNames: ['Slope (m)', 'Intercept (b)'],
    initialValues: (_x: number[], y: number[]) => [1, y[0]]
  },
  langmuir: {
    func: (x: number, [bmax, kd]: number[]) => {
      if (x <= 0) return 0;
      return (bmax * x) / (kd + x);
    },
    dfdx: (x: number, [bmax, kd]: number[]) => {
      if (x <= 0) return 0;
      const denom = kd + x;
      if (denom === 0) return 0;
      const val = (bmax * kd) / (denom * denom);
      return isFinite(val) ? val : 0;
    },
    grad: (x: number, [bmax, kd]: number[]) => {
      if (x <= 0) return [0, 0];
      const denom = kd + x;
      if (denom === 0) return [0, 0];
      return [x / denom, -(bmax * x) / (denom * denom)];
    },
    k: 2,
    paramNames: ['Bmax', 'Kd'],
    initialValues: (x: number[], y: number[]) => [Math.max(...y), x[Math.floor(x.length / 2)] || 1]
  },
  '4pl': {
    func: (x: number, [a, b, c, d]: number[]) => {
      if (x <= 0) return a;
      if (c <= 0) return a;
      const x_c_b = Math.pow(x / c, b);
      if (!isFinite(x_c_b)) return d;
      return d + (a - d) / (1 + x_c_b);
    },
    dfdx: (x: number, [a, b, c, d]: number[]) => {
      if (x <= 0 || c <= 0) return 0;
      const x_c = x / c;
      const x_c_b = Math.pow(x_c, b);
      const denom = 1 + x_c_b;
      const deriv = -(a - d) * b * Math.pow(x_c, b - 1) / (c * denom * denom);
      return isFinite(deriv) ? deriv : 0;
    },
    grad: (x: number, [a, b, c, d]: number[]) => {
      if (x <= 0 || c <= 0) return [1, 0, 0, 0];
      const x_c = x / c;
      const x_c_b = Math.pow(x_c, b);
      const denom = 1 + x_c_b;
      const d_a = 1 / denom;
      const d_b = -(a - d) * (x_c_b * Math.log(x_c)) / (denom * denom);
      const d_c = (a - d) * (b * x_c_b / c) / (denom * denom);
      const d_d = x_c_b / denom;
      return [
        isFinite(d_a) ? d_a : 0,
        isFinite(d_b) ? d_b : 0,
        isFinite(d_c) ? d_c : 0,
        isFinite(d_d) ? d_d : 0
      ];
    },
    k: 4,
    paramNames: ['Bottom (a)', 'Hill Slope (b)', 'EC50 (c)', 'Top (d)'],
    initialValues: (x: number[], y: number[]) => {
      const positiveX = x.filter(v => v > 0);
      const midX = positiveX.length > 0 ? positiveX[Math.floor(positiveX.length / 2)] : 1;
      return [Math.min(...y), 1, midX, Math.max(...y)];
    }
  },
  '5pl': {
    func: (x: number, [a, b, c, d, g]: number[]) => {
      if (x <= 0) return a;
      if (c <= 0) return a;
      const x_c_b = Math.pow(x / c, b);
      if (!isFinite(x_c_b)) return d;
      const denom = Math.pow(1 + x_c_b, g);
      if (!isFinite(denom) || denom === 0) return d;
      return d + (a - d) / denom;
    },
    dfdx: (x: number, [a, b, c, d, g]: number[]) => {
      if (x <= 0 || c <= 0) return 0;
      const x_c = x / c;
      const x_c_b = Math.pow(x_c, b);
      const denom_base = 1 + x_c_b;
      const denom = Math.pow(denom_base, g + 1);
      const deriv = -(a - d) * g * b * Math.pow(x_c, b - 1) / (c * denom);
      return isFinite(deriv) ? deriv : 0;
    },
    grad: (x: number, [a, b, c, d, g]: number[]) => {
      if (x <= 0 || c <= 0) return [1, 0, 0, 0, 0];
      const x_c = x / c;
      const x_c_b = Math.pow(x_c, b);
      const denom_base = 1 + x_c_b;
      const denom = Math.pow(denom_base, g);
      const d_a = 1 / denom;
      const d_b = -(a - d) * g * (x_c_b * Math.log(x_c)) * Math.pow(denom_base, -g - 1);
      const d_c = (a - d) * g * (b * x_c_b / c) * Math.pow(denom_base, -g - 1);
      const d_d = 1 - (1 / denom);
      const d_g = -(a - d) * Math.log(denom_base) / denom;
      return [
        isFinite(d_a) ? d_a : 0,
        isFinite(d_b) ? d_b : 0,
        isFinite(d_c) ? d_c : 0,
        isFinite(d_d) ? d_d : 0,
        isFinite(d_g) ? d_g : 0
      ];
    },
    k: 5,
    paramNames: ['Bottom (a)', 'Hill Slope (b)', 'EC50 (c)', 'Top (d)', 'Asymmetry (g)'],
    initialValues: (x: number[], y: number[]) => {
      const positiveX = x.filter(v => v > 0);
      const midX = positiveX.length > 0 ? positiveX[Math.floor(positiveX.length / 2)] : 1;
      return [Math.min(...y), 1, midX, Math.max(...y), 1];
    }
  }
};

export const fitData = (x: number[], y: number[], method: 'linear' | 'langmuir' | '4pl' | '5pl'): FitResult => {
  const n = x.length;
  const model = models[method];
  const initialVals = model.initialValues(x, y);
  
  let params: number[] = [...initialVals];
  let rss = Infinity;
  let fitSucceeded = false;

  if (method === 'linear') {
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    const denom = x.reduce((a, b) => a + Math.pow(b - meanX, 2), 0);
    const m = denom !== 0 ? x.reduce((a, b, i) => a + (b - meanX) * (y[i] - meanY), 0) / denom : 0;
    const b = meanY - m * meanX;
    params = [m, b];
    rss = x.reduce((sum, xi, i) => sum + Math.pow(y[i] - (m * xi + b), 2), 0);
    fitSucceeded = true;
  } else {
    try {
      const options = { initialValues: initialVals, maxIterations: 1000 };
      const result = levenbergMarquardt({ x, y }, (p: number[]) => (xi: number) => model.func(xi, p), options);
      if (result && Array.isArray(result.parameterValues) && result.parameterValues.every(v => isFinite(v))) {
        params = result.parameterValues;
        rss = isFinite(result.parameterError) ? result.parameterError : x.reduce((s, xi, i) => s + Math.pow(y[i] - model.func(xi, params), 2), 0);
        fitSucceeded = true;
      }
    } catch {
      fitSucceeded = false;
      rss = Infinity;
    }
  }

  const meanY_all = y.reduce((s, v) => s + v, 0) / n;
  const ss_tot = y.reduce((a, b) => a + Math.pow(b - meanY_all, 2), 0);
  const r2 = (!fitSucceeded || ss_tot === 0 || !isFinite(rss)) ? 0 : Math.max(0, 1 - rss / ss_tot);
  const rmse = (!fitSucceeded || !isFinite(rss)) ? Infinity : Math.sqrt(Math.max(0, rss / n));

  // Rigorous AICc computation:
  // If sample size is too small for the model's degrees of freedom (n <= k + 1),
  // the second-order correction term has a non-positive denominator, indicating extreme overparameterization.
  let aicc = Infinity;
  if (fitSucceeded && isFinite(rss) && rss > 0 && n > model.k + 1) {
    const aic = n * Math.log(rss / n) + 2 * model.k;
    const correction = (2 * model.k * (model.k + 1)) / (n - model.k - 1);
    aicc = aic + correction;
  }

  const mse = fitSucceeded && n > model.k ? rss / (n - model.k) : (isFinite(rss) ? rss / n : 1);
  let cov: Matrix;
  try {
    const jacobian = new Matrix(n, model.k);
    for (let i = 0; i < n; i++) {
      const g = model.grad(x[i], params);
      for (let j = 0; j < model.k; j++) jacobian.set(i, j, g[j]);
    }
    const jt = jacobian.transpose();
    const jtj = jt.mmul(jacobian);
    cov = inverse(jtj).mul(mse);
  } catch {
    cov = Matrix.eye(model.k).mul(mse || 1);
  }

  const parameters: Record<string, number> = {};
  model.paramNames.forEach((name, i) => parameters[name] = params[i]);

  return {
    method,
    parameters,
    metrics: { rmse, r2, aicc },
    predict: (val: number) => {
      const res = model.func(val, params);
      return isFinite(res) ? res : 0;
    },
    predictDeriv: (val: number) => model.dfdx(val, params),
    getCI: (val: number) => {
      try {
        const g = new Matrix([model.grad(val, params)]);
        const variance = g.mmul(cov).mmul(g.transpose()).get(0, 0);
        const se = Math.sqrt(Math.max(0, isFinite(variance) ? variance : 0));
        const crit = 1.96; // 95% CI approx
        const pred = model.func(val, params);
        return { low: pred - crit * se, high: pred + crit * se };
      } catch {
        const pred = model.func(val, params);
        return { low: pred, high: pred };
      }
    },
    actualX: x,
    actualY: y,
    k: model.k,
    cov: cov.to2DArray(),
    mse
  };
};
