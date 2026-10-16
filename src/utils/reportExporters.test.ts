import { calculateAdvancedLoD } from "./calculations";
import { type AssaySeries } from "../constants";
import {
  sortLeaderboardItems,
  buildMultiCurveCSVReport,
  buildMultiCurveTemplateCSV,
  buildMarkdownAuditReport,
  type SeriesLeaderboardEntry,
} from "./reportExporters";

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(msg);
}

function createSampleFixtures(): {
  seriesA: AssaySeries;
  seriesB: AssaySeries;
  leaderboard: SeriesLeaderboardEntry[];
} {
  const resA = calculateAdvancedLoD(
    [0.06, 0.09, 0.07],
    [
      { concentration: 0.01, readout: 0.19 },
      { concentration: 0.01, readout: 0.22 },
      { concentration: 0.1, readout: 0.85 },
      { concentration: 0.1, readout: 0.92 },
      { concentration: 1.0, readout: 3.2 },
      { concentration: 1.0, readout: 3.4 },
      { concentration: 10.0, readout: 4.8 },
      { concentration: 10.0, readout: 4.9 },
    ],
    "4pl"
  );

  const resB = calculateAdvancedLoD(
    [0.07, 0.1, 0.08],
    [
      { concentration: 0.1, readout: 0.15 },
      { concentration: 0.1, readout: 0.17 },
      { concentration: 1.0, readout: 1.05 },
      { concentration: 1.0, readout: 1.09 },
      { concentration: 10.0, readout: 10.02 },
      { concentration: 10.0, readout: 10.08 },
    ],
    "linear"
  );

  const seriesA: AssaySeries = {
    id: "s-a",
    name: "Alpha Construct",
    color: "#4269d0",
    visible: true,
    fitMethod: "4pl",
    blankSignals: "0.06, 0.09, 0.07",
    standardRows: [
      { id: "r1", conc: "0.01", signals: "0.19, 0.22" },
      { id: "r2", conc: "0.1", signals: "0.85, 0.92" },
      { id: "r3", conc: "1.0", signals: "3.2, 3.4" },
      { id: "r4", conc: "10.0", signals: "4.8, 4.9" },
    ],
  };

  const seriesB: AssaySeries = {
    id: "s-b",
    name: "Beta Construct",
    color: "#efb118",
    visible: true,
    fitMethod: "linear",
    blankSignals: "0.07, 0.1, 0.08",
    standardRows: [
      { id: "b1", conc: "0.1", signals: "0.25, 0.28" },
      { id: "b2", conc: "1.0", signals: "1.4, 1.5" },
      { id: "b3", conc: "10.0", signals: "4.1, 4.3" },
    ],
  };

  const leaderboard: SeriesLeaderboardEntry[] = [
    {
      id: "s-b",
      name: "Beta Construct",
      color: "#efb118",
      isActive: false,
      results: resB,
      foldChangeVsRef: "3.50× lower",
    },
    {
      id: "s-a",
      name: "Alpha Construct",
      color: "#4269d0",
      isActive: true,
      results: resA,
      foldChangeVsRef: "1.0× (Ref)",
    },
  ];

  return { seriesA, seriesB, leaderboard };
}

export function testSortLeaderboardItems(): void {
  const { leaderboard } = createSampleFixtures();

  // Normal case: sort by name ascending and descending
  const byNameAsc = sortLeaderboardItems(leaderboard, "name", true);
  assert(byNameAsc[0].name === "Alpha Construct", "Expected Alpha Construct first when sorted by name asc");

  const byNameDesc = sortLeaderboardItems(leaderboard, "name", false);
  assert(byNameDesc[0].name === "Beta Construct", "Expected Beta Construct first when sorted by name desc");

  // Normal case: sort by LOD ascending
  const byLodAsc = sortLeaderboardItems(leaderboard, "lod", true);
  assert(
    byLodAsc[0].results.lodConc <= byLodAsc[1].results.lodConc,
    "Expected lowest LOD first when sorted by lod asc"
  );

  // Edge case: null sortField preserves original order without mutating input
  const preserved = sortLeaderboardItems(leaderboard, null, true);
  assert(preserved[0].id === leaderboard[0].id && preserved !== leaderboard, "Expected cloned original order for null sortField");

  // Failure case: non-finite (NaN) LOD is pushed to the end on ascending sort
  const withNanLod: SeriesLeaderboardEntry[] = [
    {
      ...leaderboard[0],
      id: "s-nan",
      name: "Invalid LOD Curve",
      results: { ...leaderboard[0].results, lodConc: NaN },
    },
    leaderboard[1],
  ];
  const sortedNan = sortLeaderboardItems(withNanLod, "lod", true);
  assert(sortedNan[0].id === "s-a" && sortedNan[1].id === "s-nan", "Expected NaN LOD sorted to end on ascending sort");

  console.log("✓ testSortLeaderboardItems passed!");
}

export function testBuildMultiCurveCSVReportAndTemplate(): void {
  const { seriesA, seriesB, leaderboard } = createSampleFixtures();

  // Normal case: multi-curve CSV includes comparative leaderboard section and both series
  const multiCsv = buildMultiCurveCSVReport([seriesA, seriesB], leaderboard, "0.8.6");
  assert(multiCsv.includes("COMPARATIVE SENSITIVITY LEADERBOARD"), "Expected leaderboard section in multi-curve CSV");
  assert(multiCsv.includes("# SERIES: Alpha Construct"), "Expected Alpha Construct section");
  assert(multiCsv.includes("# SERIES: Beta Construct"), "Expected Beta Construct section");

  // Edge case: single-curve CSV omits comparative leaderboard section
  const singleCsv = buildMultiCurveCSVReport([seriesA], [leaderboard[1]], "0.8.6");
  assert(!singleCsv.includes("COMPARATIVE SENSITIVITY LEADERBOARD"), "Expected no leaderboard section for single curve");
  assert(singleCsv.includes("Total Curves,1"), "Expected Total Curves,1");

  // Failure / empty case: empty series list produces valid header
  const emptyCsv = buildMultiCurveCSVReport([], [], "0.8.6");
  assert(emptyCsv.includes("Total Curves,0"), "Expected Total Curves,0 for empty series list");

  // Template CSV validation
  const templateCsv = buildMultiCurveTemplateCSV();
  assert(templateCsv.includes("# Series: Synthetic Ref (Construct A)"), "Expected Construct A in template");
  assert(templateCsv.includes("# Series: Synthetic Construct B (Low Potency)"), "Expected Construct B in template");

  console.log("✓ testBuildMultiCurveCSVReportAndTemplate passed!");
}

export function testBuildMarkdownAuditReport(): void {
  const { seriesA, leaderboard } = createSampleFixtures();

  // Normal case: multi-curve markdown report
  const mdMulti = buildMarkdownAuditReport(seriesA, leaderboard[1].results, leaderboard, "0.8.6", "2026-10-16");
  assert(mdMulti.includes("Multi-Curve Sensitivity Comparison"), "Expected multi-curve table in Markdown report");
  assert(mdMulti.includes("Active Curve: Alpha Construct"), "Expected active curve section in Markdown report");
  assert(mdMulti.includes("Generated: 2026-10-16"), "Expected deterministic generated date");

  // Edge case: single-curve markdown report omits multi-curve comparison table
  const mdSingle = buildMarkdownAuditReport(seriesA, leaderboard[1].results, [leaderboard[1]], "0.8.6", "2026-10-16");
  assert(!mdSingle.includes("Multi-Curve Sensitivity Comparison"), "Expected no multi-curve table for single series");

  console.log("✓ testBuildMarkdownAuditReport passed!");
}

testSortLeaderboardItems();
testBuildMultiCurveCSVReportAndTemplate();
testBuildMarkdownAuditReport();

console.log("All reportExporters unit tests completed successfully!");
