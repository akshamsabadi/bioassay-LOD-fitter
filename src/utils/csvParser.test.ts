import { parseCSVData } from './csvParser';

const testSimpleCSV = () => {
  const csvContent = `
# This is a comment
Concentration,Signals
0,0.07,0.13,0.08
0.001,0.08,0.15,0.09
3.0,3.5,4.0,3.65
0.1,0.45,0.65,0.52
  `;

  const result = parseCSVData(csvContent);

  // Assert blank signals
  if (result.blankSignals !== '0.07, 0.13, 0.08') {
    throw new Error(`Expected blankSignals to be "0.07, 0.13, 0.08", got "${result.blankSignals}"`);
  }

  // Assert standard count
  if (result.standards.length !== 3) {
    throw new Error(`Expected 3 standards, got ${result.standards.length}`);
  }

  // Assert sorted order (0.001, then 0.1, then 3.0)
  if (result.standards[0].conc !== '0.001' || result.standards[1].conc !== '0.1' || result.standards[2].conc !== '3.0') {
    throw new Error(`Expected sorted concentration order "0.001, 0.1, 3.0", got "${result.standards[0].conc}, ${result.standards[1].conc}, ${result.standards[2].conc}"`);
  }

  // Assert signal mapping
  if (result.standards[0].signals !== '0.08, 0.15, 0.09') {
    throw new Error(`Expected signals for 0.001 to be "0.08, 0.15, 0.09", got "${result.standards[0].signals}"`);
  }

  console.log('✓ testSimpleCSV passed!');
};

const testMetadataAndSpecialRows = () => {
  const csvContent = `
# BIOASSAY REPORT EXPORT
"Model Parameter",Value
"Bottom (a)",0.0754
"Hill Slope (b)",1.0500

# INPUT DATA
"Concentration","Signals"
"blank",0.07,0.13,0.08
"1.5",1.25,1.35
  `;

  const result = parseCSVData(csvContent);

  if (result.blankSignals !== '0.07, 0.13, 0.08') {
    throw new Error(`Expected blankSignals to be "0.07, 0.13, 0.08", got "${result.blankSignals}"`);
  }

  if (result.standards.length !== 1) {
    throw new Error(`Expected 1 standard, got ${result.standards.length}`);
  }

  if (result.standards[0].conc !== '1.5' || result.standards[0].signals !== '1.25, 1.35') {
    throw new Error(`Expected standard "1.5" with signals "1.25, 1.35", got "${result.standards[0].conc}" with "${result.standards[0].signals}"`);
  }

  console.log('✓ testMetadataAndSpecialRows passed!');
};

const runAllTests = () => {
  testSimpleCSV();
  testMetadataAndSpecialRows();
  console.log('All CSV parser unit tests completed successfully!');
};

runAllTests();
