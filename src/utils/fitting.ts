import { levenbergMarquardt } from 'ml-levenberg-marquardt';
import { Matrix, inverse } from 'ml-matrix';

export interface FitResult {
  method: string;
  parameters: Record<string, number>;
  paramValues: number[];
  metrics: {
    rmse: number;
    r2: number;
    aicc: number;
  };
  predict: (x: number) => number;
  getCI: (x: number) => { low: number; high: number };
  getDerivative: (x: number) => number;
  getParamGrad: (x: number) => number[];
  actualX: number[];
  actualY: number[];
  k: number;
  cov: number[][];
  mse: number;
}

const models = {
  linear: {
    func: (x: number, [m, b]: number[]) => m * x + b,
    grad: (x: number, [_m, _b]: number[]) => [x, 1],
    deriv: (_x: number, [m, _b]: number[]) => m,
    k: 2,
    paramNames: ['Slope (m)', 'Intercept (b)'],
    initialValues: (_x: number[], y: number[]) => [1, y[0]]
  },
  '4pl': {
    func: (x: number, [a, b, c, d]: number[]) => {
      if (x <= 0) return a;
      return d + (a - d) / (1 + Math.pow(x / c, b));
    },
    grad: (x: number, [a, b, c, d]: number[]) => {
      if (x <= 0) return [1, 0, 0, 0];
      const ratio = x / c;
      const x_c_b = Math.pow(ratio, b);
      const denom = 1 + x_c_b;
      return [
        1 / denom,
        -(a - d) * x_c_b * Math.log(ratio) / (denom * denom),
        (a - d) * b * (x_c_b / c) / (denom * denom),
        x_c_b / denom
      ];
    },
    deriv: (x: number, [a, b, c, d]: number[]) => {
      if (x <= 0) return 0;
      const x_c_b = Math.pow(x / c, b);
      const denom = 1 + x_c_b;
      return -(a - d) * b * (x_c_b / x) / (denom * denom);
    },
    k: 4,
    paramNames: ['Bottom (a)', 'Hill Slope (b)', 'EC50 (c)', 'Top (d)'],
    initialValues: (x: number[], y: number[]) => [Math.min(...y), 1, x[Math.floor(x.length/2)], Math.max(...y)]
  },
  '5pl': {
    func: (x: number, [a, b, c, d, g]: number[]) => {
      if (x <= 0) return a;
      return d + (a - d) / Math.pow(1 + Math.pow(x / c, b), g);
    },
    grad: (x: number, [a, b, c, d, g]: number[]) => {
      if (x <= 0) return [1, 0, 0, 0, 0];
      const ratio = x / c;
      const x_c_b = Math.pow(ratio, b);
      const db = 1 + x_c_b;
      const denom = Math.pow(db, g);
      return [
        1 / denom,
        -(a - d) * g * x_c_b * Math.log(ratio) * Math.pow(db, -g - 1),
        (a - d) * g * b * (x_c_b / c) * Math.pow(db, -g - 1),
        1 - (1 / denom),
        -(a - d) * Math.log(db) / denom
      ];
    },
    deriv: (x: number, [a, b, c, d, g]: number[]) => {
      if (x <= 0) return 0;
      const x_c_b = Math.pow(x / c, b);
      const db = 1 + x_c_b;
      return -(a - d) * g * b * (x_c_b / x) * Math.pow(db, -g - 1);
    },
    k: 5,
    paramNames: ['Bottom (a)', 'Hill Slope (b)', 'EC50 (c)', 'Top (d)', 'Asymmetry (g)'],
    initialValues: (x: number[], y: number[]) => [Math.min(...y), 1, x[Math.floor(x.length/2)], Math.max(...y), 1]
  }
};

export const fitData = (x: number[], y: number[], method: 'linear' | '4pl' | '5pl'): FitResult => {
  const n = x.length;
  const model = models[method];
  const options = { initialValues: model.initialValues(x, y), maxIterations: 1000 };
  
  let params: number[];
  let rss: number;

  if (method === 'linear') {
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    const m = x.reduce((a, b, i) => a + (b - meanX) * (y[i] - meanY), 0) / x.reduce((a, b) => a + Math.pow(b - meanX, 2), 0);
    const b = meanY - m * meanX;
    params = [m, b];
    rss = x.reduce((sum, xi, i) => sum + Math.pow(y[i] - (m * xi + b), 2), 0);
  } else {
    const result = levenbergMarquardt({ x, y }, (p: number[]) => (xi: number) => model.func(xi, p), options);
    params = result.parameterValues;
    rss = result.parameterError;
  }

  const mse = rss / (n - model.k);
  const jacobian = new Matrix(n, model.k);
  for (let i = 0; i < n; i++) {
    const g = model.grad(x[i], params);
    for (let j = 0; j < model.k; j++) jacobian.set(i, j, g[j]);
  }

  const jt = jacobian.transpose();
  const jtj = jt.mmul(jacobian);
  let cov: Matrix;
  try {
    cov = inverse(jtj).mul(mse);
  } catch (e) {
    cov = Matrix.eye(model.k).mul(mse);
  }

  const parameters: Record<string, number> = {};
  model.paramNames.forEach((name, i) => parameters[name] = params[i]);

  const meanY_all = y.reduce((s, v) => s + v, 0) / n;
  const ss_tot = y.reduce((a, b) => a + Math.pow(b - meanY_all, 2), 0);

  return {
    method,
    parameters,
    paramValues: params,
    metrics: { rmse: Math.sqrt(rss / n), r2: 1 - rss / ss_tot, aicc: n * Math.log(rss / n) + 2 * model.k + (2 * model.k * (model.k + 1)) / (n - model.k - 1) },
    predict: (val: number) => model.func(val, params),
    getCI: (val: number) => {
      const g = new Matrix([model.grad(val, params)]);
      const variance = g.mmul(cov).mmul(g.transpose()).get(0, 0);
      const se = Math.sqrt(Math.abs(variance));
      const pred = model.func(val, params);
      return { low: pred - 1.96 * se, high: pred + 1.96 * se };
    },
    getDerivative: (val: number) => model.deriv(val, params),
    getParamGrad: (val: number) => model.grad(val, params),
    actualX: x,
    actualY: y,
    k: model.k,
    cov: cov.to2DArray(),
    mse
  };
};

export const autoFit = (x: number[], y: number[]): FitResult => {
  const f4 = fitData(x, y, '4pl');
  const f5 = fitData(x, y, '5pl');
  return f5.metrics.aicc < f4.metrics.aicc - 2 ? f5 : f4;
};
