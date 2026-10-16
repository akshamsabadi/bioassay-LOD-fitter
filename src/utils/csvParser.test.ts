/**
 * Unit tests for `src/utils/csvParser.ts`.
 * Covers normal operation, edge cases, and malformed/failure inputs for
 * `parseSingleSeriesBlock` and `parseCSVData`.
 */
import assert from "node:assert/strict";
import { parseCSVData, parseSingleSeriesBlock } from "./csvParser";

/**
 * Tests standard comma-separated CSV parsing and concentration sorting.
 */
function _testSimpleCSV(): void {
  const csvContent = `
# This is a comment
Concentration,Signals
0,0.07,0.13,0.08
0.001,0.08,0.15,0.09
3.0,3.5,4.0,3.65
0.1,0.45,0.65,0.52
  `;

  const result = parseCSVData(csvContent);
  assert.equal(result.blankSignals, "0.07, 0.13, 0.08");
  assert.equal(result.standards.length, 3);
  assert.deepEqual(
    result.standards.map((s) => s.conc),
    ["0.001", "0.1", "3.0"]
  );
  assert.equal(result.standards[0].signals, "0.08, 0.15, 0.09");
}

/**
 * Tests direct TSV clipboard input from Excel or Google Sheets.
 */
function _testTSVExcelClipboard(): void {
  const tsvContent =
    "Concentration (ug/mL)\tRep1\tRep2\tRep3\r\n0\t0.08\t0.12\t0.10\r\n0.1\t0.15\t0.17\t0.16\r\n1.0\t1.05\t1.12\t1.08";

  const result = parseCSVData(tsvContent);
  assert.equal(result.blankSignals, "0.08, 0.12, 0.1");
  assert.equal(result.standards.length, 2);
  assert.equal(result.standards[0].conc, "0.1");
  assert.equal(result.standards[0].signals, "0.15, 0.17, 0.16");
}

/**
 * Tests long-format replicate aggregation across multiple rows with identical concentrations.
 */
function _testLongFormatCSV(): void {
  const csvContent = `
# Long format plate reader output
Concentration,Signal
0,0.07
0,0.13
0,0.08
0.01,0.15
0.01,0.17
0.1,0.55
0.1,0.60
  `;

  const result = parseCSVData(csvContent);
  assert.equal(result.blankSignals, "0.07, 0.13, 0.08");
  assert.equal(result.standards.length, 2);
  assert.equal(result.standards[0].signals, "0.15, 0.17");
  assert.equal(result.standards[1].signals, "0.55, 0.6");
}

/**
 * Tests ignoring report metadata rows and stripping single/double quotes around cells.
 */
function _testMetadataAndQuotedRows(): void {
  const csvContent = `
# BIOASSAY REPORT EXPORT
"Model Parameter",Value
"Bottom (a)",0.0754
"Hill Slope (b)",1.0500

# INPUT DATA
"Concentration","Signals"
"blank",0.07,0.13,0.08
'1.5','1.25',"1.35"
  `;

  const result = parseCSVData(csvContent);
  assert.equal(result.blankSignals, "0.07, 0.13, 0.08");
  assert.equal(result.standards.length, 1);
  assert.equal(result.standards[0].conc, "1.5");
  assert.equal(result.standards[0].signals, "1.25, 1.35");
}

/**
 * Tests multi-series `# Series:` parsing and verifies primary standards reuse series[0] rows without double-parsing.
 */
function _testMultiSeriesCSV(): void {
  const multiContent = `
# Series: Synthetic Ref (Construct A)
Concentration,Signals
0,0.06,0.09,0.07
0.001,0.08,0.09
1.0,3.2,3.4

# SERIES: Synthetic Construct B (Low Potency)
Concentration,Signals
0,0.08,0.10
0.003,0.09,0.10
3.0,3.05,3.25
  `;

  const result = parseCSVData(multiContent);
  assert.ok(result.multiSeries);
  assert.equal(result.multiSeries.length, 2);
  assert.equal(result.multiSeries[0].name, "Synthetic Ref (Construct A)");
  assert.equal(result.multiSeries[1].name, "Synthetic Construct B (Low Potency)");
  assert.equal(result.multiSeries[0].standardRows.length, 2);
  assert.equal(result.multiSeries[1].standardRows.length, 2);

  // Verify primary result reuses multiSeries[0] without re-parsing / regenerating IDs
  assert.equal(result.seriesName, "Synthetic Ref (Construct A)");
  assert.equal(result.blankSignals, result.multiSeries[0].blankSignals);
  assert.deepEqual(
    result.standards.map((r) => r.id),
    result.multiSeries[0].standardRows.map((r) => r.id)
  );
}

/**
 * Tests European semicolon-delimited CSV with comma decimal separators.
 */
function _testEuropeanCSV(): void {
  const europeanContent = `
Concentration;Signals
0;0,07;0,13;0,08
0,001;0,08;0,15
1,5;2,5;2,7
`;
  const result = parseCSVData(europeanContent);
  assert.equal(result.blankSignals, "0.07, 0.13, 0.08");
  assert.equal(result.standards.length, 2);
  assert.equal(result.standards[0].conc, "0.001");
  assert.equal(result.standards[1].conc, "1.5");
  assert.equal(result.standards[1].signals, "2.5, 2.7");
}

/**
 * Tests single `# Series:` header extraction and all supported plate reader blank labels.
 */
function _testSingleSeriesAndBlankLabels(): void {
  const singleSeriesContent = `
# Series: Monoclonal Antibody Batch 4
Concentration,Signals
0,0.05,0.06
1.0,1.2,1.3
`;
  const singleResult = parseCSVData(singleSeriesContent);
  assert.equal(singleResult.seriesName, "Monoclonal Antibody Batch 4");
  assert.equal(singleResult.multiSeries, undefined);
  assert.equal(singleResult.blankSignals, "0.05, 0.06");
  assert.equal(singleResult.standards.length, 1);

  const blankLabelsLines = [
    "Concentration,Signal1,Signal2",
    "Blank,0.01,0.02",
    "Blanks,0.03",
    "Background,0.04",
    "Bkg,0.05",
    "Zero,0.06",
    "Negative Control,0.07",
    "Ctrl_0,0.08",
    "Control,0.09",
    "0.0,0.10",
    "0.5,1.25,1.30",
  ];
  const blockResult = parseSingleSeriesBlock(blankLabelsLines);
  assert.equal(
    blockResult.blankSignals,
    "0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1"
  );
  assert.equal(blockResult.standards.length, 1);
  assert.equal(blockResult.standards[0].conc, "0.5");
}

/**
 * Tests failure, empty, and malformed inputs to verify resilient non-throwing behavior.
 */
function _testMalformedAndFailureInputs(): void {
  // Empty and whitespace-only strings
  assert.deepEqual(parseCSVData(""), { blankSignals: "", standards: [] });
  assert.deepEqual(parseCSVData("   \n\t  \r\n  "), { blankSignals: "", standards: [] });
  assert.deepEqual(parseSingleSeriesBlock([]), { blankSignals: "", standards: [] });

  // Comments-only input
  assert.deepEqual(parseCSVData("# Comment 1\n# Comment 2"), {
    blankSignals: "",
    standards: [],
  });

  // Malformed rows: single column, negative concentrations, non-numeric signals, Infinity/NaN
  const malformedCSV = `
SingleColumnOnly
-2.5,0.4,0.5
0,NaN,invalid,--
0.5,NaN,0.42,err,Infinity,-Infinity,0.48
2.0,not_a_number,N/A
  `;
  const result = parseCSVData(malformedCSV);
  assert.equal(result.blankSignals, "");
  assert.equal(result.standards.length, 1);
  assert.equal(result.standards[0].conc, "0.5");
  assert.equal(result.standards[0].signals, "0.42, 0.48");
}

/**
 * Runs all CSV parser unit tests.
 */
function _runAllCSVParserTests(): void {
  _testSimpleCSV();
  _testTSVExcelClipboard();
  _testLongFormatCSV();
  _testMetadataAndQuotedRows();
  _testMultiSeriesCSV();
  _testEuropeanCSV();
  _testSingleSeriesAndBlankLabels();
  _testMalformedAndFailureInputs();
  console.log("All CSV parser unit tests completed successfully!");
}

_runAllCSVParserTests();
