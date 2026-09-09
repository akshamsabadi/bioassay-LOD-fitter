export const APP_VERSION = "0.8.1";

// Replicate variation thresholds (%) for bioassay quality checks
export const BLANK_CV_WARNING_THRESHOLD = 50; // Background blank signals naturally exhibit higher relative variance
export const STANDARD_CV_WARNING_THRESHOLD = 20; // Bioanalytical acceptance limit for standard calibrators (FDA/EMA LBA guidance)
export interface StandardRow {
  id: string;
  conc: string;
  signals: string;
}

export interface AssaySeries {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  fitMethod: "linear" | "langmuir" | "4pl" | "5pl" | "auto";
  blankSignals: string;
  standardRows: StandardRow[];
}

// Official Observable10 categorical color palette (d3.schemeObservable10)
export const OBSERVABLE10_COLORS = [
  "#4269d0", // 0. Blue (Primary)
  "#efb118", // 1. Amber / Orange
  "#ff725c", // 2. Coral / Red
  "#6cc5b0", // 3. Cyan / Teal
  "#3ca951", // 4. Green
  "#ff8ab7", // 5. Pink
  "#a463f2", // 6. Purple
  "#97bbf5", // 7. Light Blue
  "#9c6b4e", // 8. Brown
  "#9498a0", // 9. Gray
];

export const SERIES_COLORS = OBSERVABLE10_COLORS;

export interface DemoPreset {
  name: string;
  series: AssaySeries[];
  plotTitle: string;
}

export const DEMO_PRESETS: DemoPreset[] = [
  {
    name: "Standard Sigmoidal (4PL)",
    plotTitle: "Dose-Response (Standard 4PL)",
    series: [
      {
        id: "single-4pl",
        name: "Ref",
        color: SERIES_COLORS[0],
        visible: true,
        fitMethod: "auto",
        blankSignals: "0.07, 0.13, 0.08",
        standardRows: [
          { id: "1", conc: "0.001", signals: "0.08, 0.09, 0.08" },
          { id: "2", conc: "0.003", signals: "0.11, 0.12, 0.11" },
          { id: "3", conc: "0.01", signals: "0.17, 0.19, 0.16" },
          { id: "4", conc: "0.03", signals: "0.29, 0.33, 0.28" },
          { id: "5", conc: "0.1", signals: "0.62, 0.68, 0.58" },
          { id: "6", conc: "0.3", signals: "1.25, 1.38, 1.18" },
          { id: "7", conc: "1", signals: "2.55, 2.75, 2.45" },
          { id: "8", conc: "3", signals: "3.75, 3.95, 3.65" },
          { id: "9", conc: "10", signals: "4.48, 4.68, 4.38" },
          { id: "10", conc: "30", signals: "4.82, 4.96, 4.74" },
          { id: "11", conc: "100", signals: "4.91, 5.03, 4.85" },
          { id: "12", conc: "300", signals: "4.95, 5.05, 4.89" },
        ]
      }
    ]
  },
  {
    name: "Multi-Construct Panel (4 Curves)",
    plotTitle: "Synthetic Construct Panel (4 Curves)",
    series: [
      {
        id: "wt-series",
        name: "Ref",
        color: SERIES_COLORS[0],
        visible: true,
        fitMethod: "auto",
        blankSignals: "0.06, 0.09, 0.07",
        standardRows: [
          { id: "wt-1", conc: "0.001", signals: "0.08, 0.09, 0.08" },
          { id: "wt-2", conc: "0.003", signals: "0.11, 0.13, 0.11" },
          { id: "wt-3", conc: "0.01", signals: "0.19, 0.22, 0.18" },
          { id: "wt-4", conc: "0.03", signals: "0.38, 0.42, 0.36" },
          { id: "wt-5", conc: "0.1", signals: "0.85, 0.92, 0.81" },
          { id: "wt-6", conc: "0.3", signals: "1.85, 1.98, 1.78" },
          { id: "wt-7", conc: "1", signals: "3.20, 3.42, 3.10" },
          { id: "wt-8", conc: "3", signals: "4.25, 4.45, 4.15" },
          { id: "wt-9", conc: "10", signals: "4.75, 4.90, 4.68" },
          { id: "wt-10", conc: "30", signals: "4.92, 5.05, 4.88" },
        ]
      },
      {
        id: "mut-k120a-series",
        name: "Sample 1",
        color: SERIES_COLORS[1],
        visible: true,
        fitMethod: "auto",
        blankSignals: "0.07, 0.10, 0.08",
        standardRows: [
          { id: "k120a-1", conc: "0.003", signals: "0.09, 0.10, 0.09" },
          { id: "k120a-2", conc: "0.01", signals: "0.12, 0.13, 0.11" },
          { id: "k120a-3", conc: "0.03", signals: "0.18, 0.20, 0.17" },
          { id: "k120a-4", conc: "0.1", signals: "0.35, 0.38, 0.32" },
          { id: "k120a-5", conc: "0.3", signals: "0.82, 0.89, 0.78" },
          { id: "k120a-6", conc: "1", signals: "1.75, 1.88, 1.68" },
          { id: "k120a-7", conc: "3", signals: "3.05, 3.25, 2.95" },
          { id: "k120a-8", conc: "10", signals: "4.15, 4.35, 4.05" },
          { id: "k120a-9", conc: "30", signals: "4.70, 4.85, 4.62" },
          { id: "k120a-10", conc: "100", signals: "4.90, 5.02, 4.85" },
        ]
      },
      {
        id: "mut-e85q-series",
        name: "Sample 2",
        color: SERIES_COLORS[2],
        visible: true,
        fitMethod: "auto",
        blankSignals: "0.05, 0.07, 0.06",
        standardRows: [
          { id: "e85q-1", conc: "0.0003", signals: "0.07, 0.08, 0.07" },
          { id: "e85q-2", conc: "0.001", signals: "0.10, 0.12, 0.10" },
          { id: "e85q-3", conc: "0.003", signals: "0.18, 0.21, 0.17" },
          { id: "e85q-4", conc: "0.01", signals: "0.42, 0.46, 0.39" },
          { id: "e85q-5", conc: "0.03", signals: "1.05, 1.15, 0.98" },
          { id: "e85q-6", conc: "0.1", signals: "2.35, 2.48, 2.25" },
          { id: "e85q-7", conc: "0.3", signals: "3.65, 3.82, 3.52" },
          { id: "e85q-8", conc: "1", signals: "4.50, 4.68, 4.40" },
          { id: "e85q-9", conc: "3", signals: "4.85, 4.98, 4.78" },
          { id: "e85q-10", conc: "10", signals: "4.96, 5.06, 4.92" },
        ]
      },
      {
        id: "var-d32a-series",
        name: "Sample 3",
        color: SERIES_COLORS[3],
        visible: true,
        fitMethod: "auto",
        blankSignals: "0.06, 0.08, 0.07",
        standardRows: [
          { id: "d32a-1", conc: "0.003", signals: "0.08, 0.09, 0.08" },
          { id: "d32a-2", conc: "0.01", signals: "0.11, 0.13, 0.11" },
          { id: "d32a-3", conc: "0.03", signals: "0.19, 0.22, 0.18" },
          { id: "d32a-4", conc: "0.1", signals: "0.45, 0.50, 0.42" },
          { id: "d32a-5", conc: "0.3", signals: "1.10, 1.20, 1.05" },
          { id: "d32a-6", conc: "1", signals: "1.95, 2.10, 1.88" },
          { id: "d32a-7", conc: "3", signals: "2.65, 2.80, 2.55" },
          { id: "d32a-8", conc: "10", signals: "3.02, 3.15, 2.95" },
          { id: "d32a-9", conc: "30", signals: "3.15, 3.22, 3.08" },
          { id: "d32a-10", conc: "100", signals: "3.18, 3.25, 3.12" },
        ]
      }
    ]
  },

  {
    name: "Linear Response Assay",
    plotTitle: "Linear Calibration Range",
    series: [
      {
        id: "single-linear",
        name: "Ref",
        color: SERIES_COLORS[0],
        visible: true,
        fitMethod: "auto",
        blankSignals: "0.05, 0.06, 0.04",
        standardRows: [
          { id: "1", conc: "0.1", signals: "0.12, 0.14, 0.13" },
          { id: "2", conc: "0.2", signals: "0.23, 0.25, 0.22" },
          { id: "3", conc: "0.5", signals: "0.51, 0.55, 0.53" },
          { id: "4", conc: "1.0", signals: "1.02, 1.08, 1.04" },
          { id: "5", conc: "2.0", signals: "1.98, 2.05, 2.01" },
          { id: "6", conc: "5.0", signals: "4.85, 5.12, 4.98" },
        ]
      }
    ]
  },
  {
    name: "Asymmetric 5PL Assay",
    plotTitle: "Asymmetric Sigmoidal (5PL)",
    series: [
      {
        id: "single-5pl",
        name: "Ref",
        color: SERIES_COLORS[0],
        visible: true,
        fitMethod: "auto",
        blankSignals: "0.12, 0.15, 0.10",
        standardRows: [
          { id: "1", conc: "0.005", signals: "0.12, 0.15, 0.14" },
          { id: "2", conc: "0.02", signals: "0.16, 0.19, 0.18" },
          { id: "3", conc: "0.1", signals: "0.26, 0.30, 0.28" },
          { id: "4", conc: "0.5", signals: "0.68, 0.75, 0.72" },
          { id: "5", conc: "2", signals: "1.78, 1.92, 1.85" },
          { id: "6", conc: "10", signals: "3.78, 4.02, 3.90" },
          { id: "7", conc: "50", signals: "4.78, 4.92, 4.85" },
          { id: "8", conc: "200", signals: "4.92, 5.04, 4.98" },
        ]
      }
    ]
  }
];

export const DEFAULT_STANDARDS = DEMO_PRESETS[1].series[0].standardRows;
export const DEFAULT_BLANKS = DEMO_PRESETS[1].series[0].blankSignals;
