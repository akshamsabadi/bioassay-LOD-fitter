import {
  computeNiceTicks,
  pixelToDataX,
  pixelToDataY,
  easeOutCubic,
  interpolateDomain,
  computePannedDomain,
  resolveDragZoomDomain,
  computeZoomedXTicks,
  computeAxisBreakSegments,
  computeLodBadgeTiers,
  computeGlobalLogXAxisLayout,
  computeGlobalLinearYAxisLayout,
  type PlotArea,
} from "./zoom";

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(msg);
}

export function testComputeNiceTicks(): void {
  // Normal case: [0, 1]
  const t1 = computeNiceTicks(0, 1, 5);
  assert(
    JSON.stringify(t1.majorTicks) === JSON.stringify([0, 0.2, 0.4, 0.6, 0.8, 1]),
    "Expected [0, 0.2, 0.4, 0.6, 0.8, 1]"
  );
  assert(t1.allTicks.length >= 6, "Expected at least 6 ticks");

  // Normal case: [0.15, 0.65]
  const t2 = computeNiceTicks(0.15, 0.65, 5);
  assert(t2.majorTicks.length >= 3, "Expected at least 3 major ticks");
  assert(t2.majorTicks[0] >= 0.15, "Expected >= 0.15");
  assert(t2.majorTicks[t2.majorTicks.length - 1] <= 0.65, "Expected <= 0.65");

  // Edge case: [10, 100] with default maxTicks
  const t3 = computeNiceTicks(10, 100);
  assert(t3.majorTicks.length >= 4, "Expected at least 4 major ticks");

  // Failure / degenerate cases: zero or negative span, or non-finite bounds
  const t4 = computeNiceTicks(5, 5, 5);
  assert(JSON.stringify(t4.majorTicks) === JSON.stringify([5]), "Expected [5] for zero span");

  const t5 = computeNiceTicks(10, 2, 5);
  assert(JSON.stringify(t5.majorTicks) === JSON.stringify([10]), "Expected [10] for inverted span");

  const t6 = computeNiceTicks(0, 1, 0);
  assert(JSON.stringify(t6.majorTicks) === JSON.stringify([0]), "Expected [0] for maxTicks <= 0");

  console.log("✓ testComputeNiceTicks passed!");
}

export function testPixelToDataX(): void {
  const plot: PlotArea = { x: 80, y: 15, width: 600, height: 400 };
  const xDomain: [number, number] = [0.001, 100]; // 5 decades

  // Normal cases: left, right, midpoint
  const xLeft = pixelToDataX(80, plot, xDomain);
  assert(Math.abs(xLeft - 0.001) < 1e-6, `Expected ~0.001, got ${xLeft}`);

  const xRight = pixelToDataX(680, plot, xDomain);
  assert(Math.abs(xRight - 100) < 1e-6, `Expected ~100, got ${xRight}`);

  const xMid = pixelToDataX(380, plot, xDomain);
  assert(Math.abs(xMid - 0.3162277) < 1e-4, `Expected ~0.3162, got ${xMid}`);

  // Edge cases: clamping outside plot bounds
  const xUnder = pixelToDataX(10, plot, xDomain);
  assert(xUnder === 0.001, `Expected 0.001, got ${xUnder}`);

  const xOver = pixelToDataX(800, plot, xDomain);
  assert(xOver === 100, `Expected 100, got ${xOver}`);

  // Failure cases: zero width or non-positive domain bounds
  const zeroWidthPlot: PlotArea = { x: 80, y: 15, width: 0, height: 400 };
  assert(pixelToDataX(200, zeroWidthPlot, xDomain) === 0.001, "Expected fallback to xDomain[0] when width=0");
  assert(pixelToDataX(200, plot, [0, 100]) === 1e-12, "Expected positive floor when xDomain[0] <= 0");

  console.log("✓ testPixelToDataX passed!");
}

export function testPixelToDataY(): void {
  const plot: PlotArea = { x: 80, y: 15, width: 600, height: 400 };
  const yDomain: [number, number] = [0, 10];

  // Normal cases: bottom, top, midpoint
  const yBottom = pixelToDataY(415, plot, yDomain);
  assert(Math.abs(yBottom - 0) < 1e-6, `Expected 0, got ${yBottom}`);

  const yTop = pixelToDataY(15, plot, yDomain);
  assert(Math.abs(yTop - 10) < 1e-6, `Expected 10, got ${yTop}`);

  const yMid = pixelToDataY(215, plot, yDomain);
  assert(Math.abs(yMid - 5) < 1e-6, `Expected 5, got ${yMid}`);

  // Edge cases: clamping outside plot bounds
  const yUnder = pixelToDataY(500, plot, yDomain);
  assert(yUnder === 0, `Expected 0, got ${yUnder}`);

  const yOver = pixelToDataY(0, plot, yDomain);
  assert(yOver === 10, `Expected 10, got ${yOver}`);

  // Failure case: non-positive plot height
  const zeroHeightPlot: PlotArea = { x: 80, y: 15, width: 600, height: 0 };
  assert(pixelToDataY(100, zeroHeightPlot, yDomain) === 0, "Expected fallback to yDomain[0] when height=0");

  console.log("✓ testPixelToDataY passed!");
}

export function testComputePannedDomain(): void {
  const plot: PlotArea = { x: 80, y: 15, width: 600, height: 400 };
  const panStart = {
    xDomain: [0.01, 100] as [number, number], // 4 decades
    yDomain: [0, 5] as [number, number],
  };

  // Normal case: drag right by 150px (1 decade left) and down by 80px (+1 unit up)
  const panned = computePannedDomain(panStart, 150, 80, plot);
  assert(Math.abs(panned.x[0] - 0.001) < 1e-6, `Expected x[0] ~0.001, got ${panned.x[0]}`);
  assert(Math.abs(panned.x[1] - 10) < 1e-6, `Expected x[1] ~10, got ${panned.x[1]}`);
  assert(Math.abs(panned.y[0] - 1) < 1e-6, `Expected y[0] === 1, got ${panned.y[0]}`);
  assert(Math.abs(panned.y[1] - 6) < 1e-6, `Expected y[1] === 6, got ${panned.y[1]}`);

  // Edge case: extreme pan clamped to 10^-12 .. 10^12
  const clampedLow = computePannedDomain(panStart, 50000, 0, plot);
  assert(Math.abs(clampedLow.x[0] - 1e-12) < 1e-18, `Expected lower clamp at 1e-12, got ${clampedLow.x[0]}`);
  assert(Math.abs(clampedLow.x[1] - 1e-8) < 1e-14, `Expected preserved 4-decade span at 1e-8, got ${clampedLow.x[1]}`);

  // Failure case: invalid plotArea dimensions
  const invalidPlot: PlotArea = { x: 0, y: 0, width: 0, height: 400 };
  const unchanged = computePannedDomain(panStart, 150, 80, invalidPlot);
  assert(unchanged.x[0] === 0.01 && unchanged.x[1] === 100, "Expected unchanged X domain on zero plot width");

  console.log("✓ testComputePannedDomain passed!");
}

export function testResolveDragZoomDomain(): void {
  const plot: PlotArea = { x: 80, y: 15, width: 600, height: 400 };
  const xDomain: [number, number] = [0.001, 100];
  const yDomain: [number, number] = [0, 10];

  // Normal case: 2D box zoom across center
  const zoom2D = resolveDragZoomDomain(
    { svgStartPx: 200, svgCurrentPx: 560, svgStartPy: 115, svgCurrentPy: 315 },
    plot,
    xDomain,
    yDomain
  );
  assert(zoom2D !== null, "Expected valid 2D zoom domain");
  assert(zoom2D!.x[0] > 0.001 && zoom2D!.x[1] < 100, "Expected narrowed X domain");
  assert(Math.abs(zoom2D!.y[0] - 2.5) < 1e-6 && Math.abs(zoom2D!.y[1] - 7.5) < 1e-6, "Expected Y domain [2.5, 7.5]");

  // Edge case: 1D horizontal-only drag (height < 8px, width >= 15px)
  const zoom1DX = resolveDragZoomDomain(
    { svgStartPx: 200, svgCurrentPx: 500, svgStartPy: 200, svgCurrentPy: 203 },
    plot,
    xDomain,
    yDomain
  );
  assert(zoom1DX !== null, "Expected valid 1D X zoom");
  assert(zoom1DX!.y[0] === 0 && zoom1DX!.y[1] === 10, "Expected Y domain preserved during 1D X zoom");

  // Edge case: 1D vertical-only drag (width < 8px, height >= 15px)
  const zoom1DY = resolveDragZoomDomain(
    { svgStartPx: 300, svgCurrentPx: 304, svgStartPy: 115, svgCurrentPy: 315 },
    plot,
    xDomain,
    yDomain
  );
  assert(zoom1DY !== null, "Expected valid 1D Y zoom");
  assert(zoom1DY!.x[0] === 0.001 && zoom1DY!.x[1] === 100, "Expected X domain preserved during 1D Y zoom");

  // Failure case: tiny accidental click (width < 8, height < 8)
  const tinyClick = resolveDragZoomDomain(
    { svgStartPx: 300, svgCurrentPx: 303, svgStartPy: 200, svgCurrentPy: 202 },
    plot,
    xDomain,
    yDomain
  );
  assert(tinyClick === null, "Expected null for sub-threshold drag box");

  console.log("✓ testResolveDragZoomDomain passed!");
}

export function testEaseOutCubic(): void {
  assert(easeOutCubic(0) === 0, "Expected easeOutCubic(0) === 0");
  assert(easeOutCubic(1) === 1, "Expected easeOutCubic(1) === 1");
  assert(Math.abs(easeOutCubic(0.5) - 0.875) < 1e-6, "Expected easeOutCubic(0.5) === 0.875");
  assert(easeOutCubic(-0.5) === 0, "Expected easeOutCubic(-0.5) clamped to 0");
  assert(easeOutCubic(1.5) === 1, "Expected easeOutCubic(1.5) clamped to 1");
  assert(easeOutCubic(NaN) === 0, "Expected easeOutCubic(NaN) === 0");

  let prev = 0;
  for (let i = 1; i <= 20; i++) {
    const curr = easeOutCubic(i / 20);
    assert(curr > prev, `Expected strictly increasing, but ${curr} <= ${prev}`);
    prev = curr;
  }
  console.log("✓ testEaseOutCubic passed!");
}

export function testInterpolateDomain(): void {
  const fromDomain = { x: [0.001, 100] as [number, number], y: [0, 10] as [number, number] };
  const toDomain = { x: [0.1, 10] as [number, number], y: [2, 8] as [number, number] };

  // Normal cases: progress 0, 1, 0.5
  const d0 = interpolateDomain(fromDomain, toDomain, 0);
  assert(Math.abs(d0.x[0] - 0.001) < 1e-6 && Math.abs(d0.x[1] - 100) < 1e-6, "Expected fromDomain.x at p=0");
  assert(d0.y[0] === 0 && d0.y[1] === 10, "Expected fromDomain.y at p=0");

  const d1 = interpolateDomain(fromDomain, toDomain, 1);
  assert(Math.abs(d1.x[0] - 0.1) < 1e-6 && Math.abs(d1.x[1] - 10) < 1e-6, "Expected toDomain.x at p=1");
  assert(d1.y[0] === 2 && d1.y[1] === 8, "Expected toDomain.y at p=1");

  const dMid = interpolateDomain(fromDomain, toDomain, 0.5);
  assert(Math.abs(dMid.x[0] - 0.01) < 1e-6, `Expected x[0] ~0.01 at progress 0.5, got ${dMid.x[0]}`);
  assert(Math.abs(dMid.x[1] - 31.6227766) < 1e-4, `Expected x[1] ~31.6228 at progress 0.5, got ${dMid.x[1]}`);
  assert(dMid.y[0] === 1 && dMid.y[1] === 9, "Expected y=[1, 9] at progress 0.5");

  // Failure case: NaN progress falls back to 0
  const dNan = interpolateDomain(fromDomain, toDomain, NaN);
  assert(dNan.y[0] === 0 && dNan.y[1] === 10, "Expected p=0 fallback when progress is NaN");

  console.log("✓ testInterpolateDomain passed!");
}

export function testComputeZoomedXTicksAndBreakSegments(): void {
  const fallback = [0.0001, 0.001, 0.01, 0.1, 1, 10];
  // Normal case: > 2 decades
  const wideTicks = computeZoomedXTicks([0.01, 100], fallback, 0.0002, 0.0005);
  assert(wideTicks.includes(0.01) && wideTicks.includes(1) && wideTicks.includes(100), "Expected powers of 10");

  // Edge case: 0.8 to 2 decades (sparse 1, 2, 5 ticks)
  const midTicks = computeZoomedXTicks([0.1, 1], fallback, 0.0002, 0.0005);
  assert(midTicks.includes(0.2) && midTicks.includes(0.5), "Expected 1-2-5 sparse ticks");

  // Edge case: < 0.8 decades (linear nice ticks)
  const narrowTicks = computeZoomedXTicks([1, 2], fallback, 0.0002, 0.0005);
  assert(narrowTicks.length >= 3, "Expected linear nice ticks for narrow zoom");

  // Failure case: invalid domain
  const invalidTicks = computeZoomedXTicks([0, 10], fallback, 0.0002, 0.0005);
  assert(invalidTicks === fallback, "Expected fallbackTicks when minX <= 0");

  // Axis break segments: spanning break, right of break, and invalid domain
  const segSpan = computeAxisBreakSegments([0.0001, 10], 0, 0.0002, 0.0005);
  assert(segSpan.leftSegment.length === 2 && segSpan.rightSegment.length === 2, "Expected both segments when spanning break");

  const segRight = computeAxisBreakSegments([0.01, 10], 0, 0.0002, 0.0005);
  assert(segRight.leftSegment.length === 0 && segRight.rightSegment.length === 2, "Expected only right segment when zoomed past break");

  const segInvalid = computeAxisBreakSegments([10, 1], 0, 0.0002, 0.0005);
  assert(segInvalid.leftSegment.length === 0 && segInvalid.rightSegment.length === 0, "Expected empty segments for inverted domain");

  console.log("✓ testComputeZoomedXTicksAndBreakSegments passed!");
}

export function testLodBadgeTiersAndGlobalAxisLayouts(): void {
  // Single curve returns empty tier map
  assert(computeLodBadgeTiers([{ id: "s1", lodConc: 0.05 }]).size === 0, "Expected empty map for single curve");

  // Multi-curve overlapping LODs (< 1 decade apart) get staggered tier offsets, well-separated reuse tier 0
  const tiers = computeLodBadgeTiers([
    { id: "a", lodConc: 0.01 },
    { id: "b", lodConc: 0.02 }, // within 1 decade of 0.01 -> tier 1 (18px)
    { id: "c", lodConc: 0.05 }, // within 1 decade of 0.01 and 0.02 -> tier 2 (34px)
    { id: "d", lodConc: 0.5 },  // > 1 decade from 0.01 -> reuses tier 0 (2px)
  ]);
  assert(tiers.get("a") === 2, "Expected tier 0 offset (2px) for 'a'");
  assert(tiers.get("b") === 18, "Expected tier 1 offset (18px) for 'b'");
  assert(tiers.get("c") === 34, "Expected tier 2 offset (34px) for 'c'");
  assert(tiers.get("d") === 2, "Expected tier 0 offset (2px) reused for 'd'");

  // Global X and Y layout normal & empty cases
  const emptyX = computeGlobalLogXAxisLayout([]);
  assert(emptyX.xTicks.length === 0 && emptyX.breakStart === 0, "Expected empty X layout for no series");

  const validX = computeGlobalLogXAxisLayout([
    { actualX: [0.001, 0.01, 0.1, 1, 10], lodConc: 0.005, lodCILow: 0.003 },
  ]);
  assert(validX.xDomain[0] > 0 && validX.xDomain[1] === 15, "Expected valid global log X domain");
  assert(validX.breakStart > validX.xDomain[0] && validX.breakEnd > validX.breakStart, "Expected valid break bounds");

  const emptyY = computeGlobalLinearYAxisLayout([]);
  assert(emptyY.yDomain[0] === 0 && emptyY.yDomain[1] === 1 && emptyY.yTicks === undefined, "Expected default Y layout for empty series");

  const validY = computeGlobalLinearYAxisLayout([
    { actualY: [0.08, 0.5, 2.1, 4.9], lc: 0.12, ld: 0.18 },
  ]);
  assert(validY.yDomain[0] === 0 && validY.yDomain[1] >= 5, "Expected padded global linear Y domain");
  assert(validY.yMajorTicks.length >= 2, "Expected major Y ticks");

  console.log("✓ testLodBadgeTiersAndGlobalAxisLayouts passed!");
}

testComputeNiceTicks();
testPixelToDataX();
testPixelToDataY();
testComputePannedDomain();
testResolveDragZoomDomain();
testEaseOutCubic();
testInterpolateDomain();
testComputeZoomedXTicksAndBreakSegments();
testLodBadgeTiersAndGlobalAxisLayouts();

console.log("All selective zoom, pan, and layout unit tests completed successfully!");
