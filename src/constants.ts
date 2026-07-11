export interface StandardRow {
  id: string;
  conc: string;
  signals: string;
}

export interface DemoPreset {
  name: string;
  blanks: string;
  standards: StandardRow[];
  fitMethod: 'linear' | 'langmuir' | '4pl' | '5pl' | 'auto';
  plotTitle: string;
}

export const DEMO_PRESETS: DemoPreset[] = [
  {
    name: "Standard Sigmoidal (4PL)",
    blanks: "0.07, 0.13, 0.08",
    fitMethod: "auto",
    plotTitle: "Dose-Response (Standard 4PL)",
    standards: [
      { id: '1', conc: '0.001', signals: '0.08, 0.15, 0.09' },
      { id: '2', conc: '0.003', signals: '0.10, 0.18, 0.11' },
      { id: '3', conc: '0.01', signals: '0.14, 0.10, 0.19' },
      { id: '4', conc: '0.03', signals: '0.20, 0.32, 0.23' },
      { id: '5', conc: '0.1', signals: '0.45, 0.65, 0.52' },
      { id: '6', conc: '0.3', signals: '1.05, 1.45, 1.20' },
      { id: '7', conc: '1', signals: '2.30, 2.80, 2.45' },
      { id: '8', conc: '3', signals: '3.50, 4.00, 3.65' },
      { id: '9', conc: '10', signals: '4.30, 4.75, 4.45' },
      { id: '10', conc: '30', signals: '4.65, 5.05, 4.75' },
      { id: '11', conc: '100', signals: '4.80, 5.20, 4.85' },
      { id: '12', conc: '300', signals: '4.85, 5.25, 4.90' },
    ]
  },
  {
    name: "Linear Response Assay",
    blanks: "0.05, 0.06, 0.04",
    fitMethod: "auto",
    plotTitle: "Linear Calibration Range",
    standards: [
      { id: '1', conc: '0.1', signals: '0.12, 0.14, 0.13' },
      { id: '2', conc: '0.2', signals: '0.23, 0.25, 0.22' },
      { id: '3', conc: '0.5', signals: '0.51, 0.55, 0.53' },
      { id: '4', conc: '1.0', signals: '1.02, 1.08, 1.04' },
      { id: '5', conc: '2.0', signals: '1.98, 2.05, 2.01' },
      { id: '6', conc: '5.0', signals: '4.85, 5.12, 4.98' },
    ]
  },
  {
    name: "Asymmetric 5PL Assay",
    blanks: "0.12, 0.15, 0.10",
    fitMethod: "auto",
    plotTitle: "Asymmetric Sigmoidal (5PL)",
    standards: [
      { id: '1', conc: '0.005', signals: '0.12, 0.15, 0.14' },
      { id: '2', conc: '0.02', signals: '0.16, 0.19, 0.18' },
      { id: '3', conc: '0.1', signals: '0.26, 0.30, 0.28' },
      { id: '4', conc: '0.5', signals: '0.68, 0.75, 0.72' },
      { id: '5', conc: '2', signals: '1.78, 1.92, 1.85' },
      { id: '6', conc: '10', signals: '3.78, 4.02, 3.90' },
      { id: '7', conc: '50', signals: '4.78, 4.92, 4.85' },
      { id: '8', conc: '200', signals: '4.92, 5.04, 4.98' },
    ]
  },
  {
    name: "High-Noise Assay",
    blanks: "0.08, 0.14, 0.22, 0.10",
    fitMethod: "auto",
    plotTitle: "High Variance Assay Run",
    standards: [
      { id: '1', conc: '0.01', signals: '0.12, 0.28, 0.15' },
      { id: '2', conc: '0.05', signals: '0.30, 0.15, 0.45' },
      { id: '3', conc: '0.2', signals: '0.75, 1.25, 0.60' },
      { id: '4', conc: '1.0', signals: '2.10, 2.95, 2.40' },
      { id: '5', conc: '5.0', signals: '4.10, 3.20, 4.65' },
      { id: '6', conc: '20.0', signals: '4.85, 4.20, 5.15' },
    ]
  }
];

export const DEFAULT_STANDARDS = DEMO_PRESETS[0].standards;
export const DEFAULT_BLANKS = DEMO_PRESETS[0].blanks;
