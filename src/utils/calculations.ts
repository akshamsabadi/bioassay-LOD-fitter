export const calculateMean = (data: number[]): number => {
  if (data.length === 0) return 0;
  const sum = data.reduce((acc, val) => acc + val, 0);
  return sum / data.length;
};

export const calculateStandardDeviation = (data: number[]): number => {
  if (data.length <= 1) return 0;
  const mean = calculateMean(data);
  const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (data.length - 1);
  return Math.sqrt(variance);
};

export const calculateLoD = (blanks: number[]): { lod: number; mean: number; sd: number } => {
  const mean = calculateMean(blanks);
  const sd = calculateStandardDeviation(blanks);
  // Simple formula: LoD = Mean + 3 * SD
  const lod = mean + 3 * sd;
  return { lod, mean, sd };
};
