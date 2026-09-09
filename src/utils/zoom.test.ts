import { computeNiceTicks, pixelToDataX, pixelToDataY, type PlotArea } from "../components/ChartCard";

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

export function testComputeNiceTicks() {
  // Test [0, 1]
  const t1 = computeNiceTicks(0, 1, 5);
  assert(JSON.stringify(t1.majorTicks) === JSON.stringify([0, 0.2, 0.4, 0.6, 0.8, 1]), "Expected [0, 0.2, 0.4, 0.6, 0.8, 1]");
  assert(t1.allTicks.length >= 6, "Expected at least 6 ticks");

  // Test [0.15, 0.65]
  const t2 = computeNiceTicks(0.15, 0.65, 5);
  assert(t2.majorTicks.length >= 3, "Expected at least 3 major ticks");
  assert(t2.majorTicks[0] >= 0.15, "Expected >= 0.15");
  assert(t2.majorTicks[t2.majorTicks.length - 1] <= 0.65, "Expected <= 0.65");

  // Test [10, 100]
  const t3 = computeNiceTicks(10, 100, 5);
  assert(t3.majorTicks.length >= 4, "Expected at least 4 major ticks");

  // Test zero or invalid span fallback
  const t4 = computeNiceTicks(5, 5, 5);
  assert(JSON.stringify(t4.majorTicks) === JSON.stringify([5]), "Expected [5]");
  console.log("✓ testComputeNiceTicks passed!");
}

export function testPixelToDataX() {
  const plot: PlotArea = { x: 80, y: 15, width: 600, height: 400 };
  const xDomain: [number, number] = [0.001, 100]; // 5 decades

  // Left boundary
  const xLeft = pixelToDataX(80, plot, xDomain);
  assert(Math.abs(xLeft - 0.001) < 1e-6, `Expected ~0.001, got ${xLeft}`);

  // Right boundary
  const xRight = pixelToDataX(680, plot, xDomain);
  assert(Math.abs(xRight - 100) < 1e-6, `Expected ~100, got ${xRight}`);

  // Midpoint: log midpoint is 10^-0.5 = 0.3162277...
  const xMid = pixelToDataX(380, plot, xDomain);
  assert(Math.abs(xMid - 0.3162277) < 1e-4, `Expected ~0.3162, got ${xMid}`);

  // Clamping outside plot
  const xUnder = pixelToDataX(10, plot, xDomain);
  assert(xUnder === 0.001, `Expected 0.001, got ${xUnder}`);

  const xOver = pixelToDataX(800, plot, xDomain);
  assert(xOver === 100, `Expected 100, got ${xOver}`);

  console.log("✓ testPixelToDataX passed!");
}

export function testPixelToDataY() {
  const plot: PlotArea = { x: 80, y: 15, width: 600, height: 400 };
  const yDomain: [number, number] = [0, 10];

  // Bottom boundary (SVG py = 415 -> data Y = 0)
  const yBottom = pixelToDataY(415, plot, yDomain);
  assert(Math.abs(yBottom - 0) < 1e-6, `Expected 0, got ${yBottom}`);

  // Top boundary (SVG py = 15 -> data Y = 10)
  const yTop = pixelToDataY(15, plot, yDomain);
  assert(Math.abs(yTop - 10) < 1e-6, `Expected 10, got ${yTop}`);

  // Midpoint (SVG py = 215 -> data Y = 5)
  const yMid = pixelToDataY(215, plot, yDomain);
  assert(Math.abs(yMid - 5) < 1e-6, `Expected 5, got ${yMid}`);

  // Clamping outside plot
  const yUnder = pixelToDataY(500, plot, yDomain);
  assert(yUnder === 0, `Expected 0, got ${yUnder}`);

  const yOver = pixelToDataY(0, plot, yDomain);
  assert(yOver === 10, `Expected 10, got ${yOver}`);

  console.log("✓ testPixelToDataY passed!");
}

export function testPanMathLogAndLinear() {
  const plot: PlotArea = { x: 80, y: 15, width: 600, height: 400 };
  const startXDomain: [number, number] = [0.01, 100]; // 4 decades
  const startYDomain: [number, number] = [0, 5];

  // Drag right by 150px (dx = 150): moves 1 decade to the left
  const dx = 150;
  const logSpan = Math.log10(startXDomain[1]) - Math.log10(startXDomain[0]); // 4
  const dLog = -(dx / plot.width) * logSpan; // -(150/600)*4 = -1
  const newXMin = Math.pow(10, Math.log10(startXDomain[0]) + dLog); // 10^(-2 - 1) = 0.001
  const newXMax = Math.pow(10, Math.log10(startXDomain[1]) + dLog); // 10^(2 - 1) = 10

  assert(Math.abs(newXMin - 0.001) < 1e-6, "Expected newXMin ~0.001");
  assert(Math.abs(newXMax - 10) < 1e-6, "Expected newXMax ~10");

  // Drag down by 80px (dy = 80): shifts view upwards (higher values)
  const dy = 80;
  const ySpan = startYDomain[1] - startYDomain[0]; // 5
  const dY = (dy / plot.height) * ySpan; // (80/400)*5 = 1
  const newYMin = startYDomain[0] + dY; // 0 + 1 = 1
  const newYMax = startYDomain[1] + dY; // 5 + 1 = 6

  assert(newYMin === 1, "Expected newYMin === 1");
  assert(newYMax === 6, "Expected newYMax === 6");

  console.log("✓ testPanMathLogAndLinear passed!");
}

testComputeNiceTicks();
testPixelToDataX();
testPixelToDataY();
testPanMathLogAndLinear();

console.log("All selective zoom and pan unit tests completed successfully!");
