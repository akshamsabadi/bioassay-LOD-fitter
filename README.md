# Bioassay LOD Fitter

<p align="center">
  <a href="https://akshamsabadi.github.io/bioassay-LOD-fitter/"><img src="https://img.shields.io/badge/Live%20App-GitHub%20Pages-3ca951?style=for-the-badge&logo=github&logoColor=white" alt="Live Demo" /></a>
  <img src="https://img.shields.io/badge/version-v0.6.22-4269d0?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/tests-9%2F9%20passing-3ca951?style=for-the-badge" alt="Tests" />
  <img src="https://img.shields.io/badge/license-MIT-a463f2?style=for-the-badge" alt="License" />
</p>

Bioassay LOD Fitter is a modern, responsive scientific web application built to analyse concentration-response calibration curves, perform non-linear sigmoidal fitting (Linear, Langmuir, 4PL, 5PL), and rigorously determine the **Limit of Detection (LOD)** using validated statistical frameworks (Currie 1968, Holstein et al. 2015).

👉 **[Launch Bioassay LOD Fitter in Browser](https://akshamsabadi.github.io/bioassay-LOD-fitter/)**

---

## Key Features

* **🔬 Multi-Curve Overlay & Panel Comparison:** Plot and compare multiple concentration-response curves simultaneously on a single unified chart with a shared broken logarithmic axis. Includes an interactive 4-curve panel demo (*Synthetic Ref*, *Synthetic Construct B (Low Potency)*, *Synthetic Construct C (High Sensitivity)*, and *Synthetic Construct D (Partial Efficacy)*) showcasing sensitivity shifts, efficacy modulation, and comparative potency.
* **🏆 Comparative Sensitivity Leaderboard:** Automatically ranks all active curves by Limit of Detection (LOD), displays fitted models and $R^2$, and computes relative sensitivity fold-changes against the reference construct (e.g. $12.4\times$ higher sensitivity vs WT).
* **🎨 Clean Editorial Horizontal Top-Split Design:** Professional, uncluttered interface featuring clean card containers with colored top horizontal accent splits, removing distracting vertical left borders for maximum readability.
* **📋 Direct Spreadsheet Clipboard Paste:** Copy rows and columns directly from **Microsoft Excel** or **Google Sheets** (`Ctrl+V` / `Cmd+V`) into the application for instant table parsing into blanks and standard concentrations.
* **🤖 Automatic AICc Model Selection:** Automatically selects the optimal statistical model among **Linear**, **Langmuir**, **4-Parameter Logistic (4PL)**, and **5-Parameter Logistic (5PL)** based on the corrected Akaike Information Criterion (AICc) to guard against overfitting, with the flexibility to manually select any specific model.
* **📊 Unified Analytics Single-View:** View the prominent LOD Hero Card, fitted parameter micro-grid, interactive AICc model comparison table, and collapsible statistical noise limits ($L_C, L_D$, blank SD, pooled SD) in one scrollable panel without tab-hopping.
* **📈 Publication-Grade Broken Logarithmic Visualization:** An interactive logarithmic plot with a calibrated broken-axis for zero-concentration blanks, 95% confidence intervals, and subdued guideline opacities highlighting the true LOD.
* **⚡ Responsive Multi-Device Design:** Optimized layouts across desktop monitors, laptops, landscape/portrait tablets, and mobile screens.
* **💾 High-Resolution & Audit Export:** One-click download of publication-ready 300 DPI transparent PNG plots, or export complete statistical and mathematical audits to multi-series CSV and Markdown.

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
