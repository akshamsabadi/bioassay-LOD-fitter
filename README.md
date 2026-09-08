# Bioassay LOD Fitter

<p align="center">
  <a href="https://akshamsabadi.github.io/bioassay-LOD-fitter/"><img src="https://img.shields.io/badge/Live%20App-GitHub%20Pages-3ca951?style=for-the-badge&logo=github&logoColor=white" alt="Live Demo" /></a>
  <img src="https://img.shields.io/badge/version-v0.7.8-4269d0?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/tests-10%2F10%20passing-3ca951?style=for-the-badge" alt="Tests" />
  <img src="https://img.shields.io/badge/license-MIT-a463f2?style=for-the-badge" alt="License" />
</p>

Bioassay LOD Fitter is a modern, responsive scientific web application built to analyse concentration-response calibration curves, perform non-linear sigmoidal fitting (Linear, Langmuir, 4PL, 5PL), and rigorously determine the **Limit of Detection (LOD)** using validated statistical frameworks (Currie 1968, Holstein et al. 2015).

👉 **[Launch Bioassay LOD Fitter in Browser](https://akshamsabadi.github.io/bioassay-LOD-fitter/)**

---

## Key Features

* **🔬 Multi-Curve Overlay & Panel Comparison:** Plot and compare multiple concentration-response curves simultaneously on a single unified chart with a shared broken logarithmic axis. Includes an interactive multi-curve panel demo showcasing sensitivity shifts, efficacy modulation, and comparative potency.
* **🏆 Sortable Comparative Sensitivity Leaderboard:** Automatically ranks all active curves by Limit of Detection (LOD), displays fitted models and $R^2$, and computes relative sensitivity fold-changes against the reference construct. Clickable column headers allow instant sorting by curve, model, LOD, $R^2$, or fold change.
* **📊 Inline Replicate Statistics & Quality Badges:** Real-time calculation of replicate count ($n$), mean, standard deviation, and coefficient of variation ($CV\%$) directly next to each concentration row, with automated amber alerts when replicate variance exceeds 15%.
* **⚡ Serial Dilution Auto-Generator:** Quick-configure standard dilution series with automated concentration calculation (start concentration, dilution factor, and replicate count).
* **🎛️ Interactive Chart Layer Toggles:** Custom toggle pills for `95% CI`, `LC / LD Lines`, `LOD Zone`, and `Grid` to inspect raw curves without visual clutter.
* **◀ / ▶ Collapsible Sidebar Layout:** Maximize chart viewport width and presentation footprint at the click of a button.
* **📂 Fullscreen Drag-and-Drop Import:** Drag and drop any CSV or TSV file directly onto the window for instantaneous multi-curve and replicate data ingestion.
* **🖨️ Printable Lab & PDF Reports:** Dedicated `@media print` layout formatting the active curve, leaderboard, noise limits, and parameters into a clean laboratory notebook report.
* **📋 Direct Spreadsheet Clipboard Paste:** Copy rows and columns directly from **Microsoft Excel** or **Google Sheets** (`Ctrl+V` / `Cmd+V`) into the application for instant table parsing into blanks and standard concentrations.
* **🤖 Automatic AICc Model Selection:** Automatically selects the optimal statistical model among **Linear**, **Langmuir**, **4-Parameter Logistic (4PL)**, and **5-Parameter Logistic (5PL)** based on the corrected Akaike Information Criterion (AICc) to guard against overfitting, with the flexibility to manually select any specific model.
* **📈 Publication-Grade Broken Logarithmic Visualization:** An interactive logarithmic plot with a calibrated broken-axis for zero-concentration blanks, 95% confidence intervals, and subdued guideline opacities highlighting the true LOD.
* **💾 Vector SVG, 300 DPI PNG & Audit CSV Export:** One-click download of publication-ready lossless Vector SVG plots (for Illustrator, Inkscape, or LaTeX/Overleaf), high-res 300 DPI PNG images, and complete multi-series audit CSV and Markdown reports.

---

## Statistical Methodology

Bioassay LOD Fitter adheres to the rigorous statistical definitions established by **Currie (1968)** and adapted for non-linear bioassays by **Holstein et al. (2015)**:

1. **Critical Level ($L_C$):** The signal threshold above which an observed response is statistically unlikely to be background noise alone ($\\alpha = 0.05$):
   $$L_C = \bar{y}_{\text{blank}} + t_{1-\alpha, \nu} \cdot s_{\text{pooled}}$$
2. **Detection Limit Signal ($L_D$):** The expected signal level required to reliably detect the analyte with a 95% true-positive probability ($\\beta = 0.05$):
   $$L_D = L_C + t_{1-\beta, \nu} \cdot s_{\text{pooled}}$$
3. **Limit of Detection ($x_{\text{LOD}}$):** Calculated by inverting the selected calibration function $f(x)$ at signal $L_D$:
   $$x_{\text{LOD}} = f^{-1}(L_D)$$
4. **Information-Theoretic Model Selection:** Evaluated using corrected Akaike Information Criterion (AICc) to penalize overparameterization:
   $$\text{AICc} = n \ln\left(\frac{\text{RSS}}{n}\right) + 2k + \frac{2k(k+1)}{n - k - 1}$$

---

## Quick Start & Usage

1. **Load or Paste Your Data:**
   - Click **"Load Demo"** in the top bar to explore the 4-curve multi-construct panel.
   - Or paste rows directly from Excel / Google Sheets into the table.
2. **Inspect Curve Fits & Sensitivity:**
   - Review the **Multi-Curve Sensitivity Leaderboard** to compare LODs and fold-changes across constructs.
   - Click on any curve in the leaderboard or chart legend to inspect its detailed parameters and 95% CI.
3. **Export & Share:**
   - Click **"Export PNG"** for publication-ready figures.
   - Click **"Export CSV"** or **"Copy Report"** to export full mathematical audits.

---

## Development & Testing

```bash
# Install dependencies
npm install

# Run unit test suite
npm test

# Build for production
npm run build
```

## License

MIT License. Developed for research and clinical assay calibration.
