# Bioassay LOD Fitter

<p align="center">
  <a href="https://akshamsabadi.github.io/bioassay-LOD-fitter/"><img src="https://img.shields.io/badge/Live%20App-GitHub%20Pages-3ca951?style=for-the-badge&logo=github&logoColor=white" alt="Live Demo" /></a>
  <img src="https://img.shields.io/badge/version-v0.6.16-4269d0?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/tests-8%2F8%20passing-3ca951?style=for-the-badge" alt="Tests" />
  <img src="https://img.shields.io/badge/license-MIT-a463f2?style=for-the-badge" alt="License" />
</p>

Bioassay LOD Fitter is a modern, responsive scientific web application built to analyse concentration-response calibration curves, perform non-linear sigmoidal fitting (Linear, Langmuir, 4PL, 5PL), and rigorously determine the **Limit of Detection (LOD)** using validated statistical frameworks (Currie 1968, Holstein et al. 2015).

👉 **[Launch Bioassay LOD Fitter in Browser](https://akshamsabadi.github.io/bioassay-LOD-fitter/)**

---

## Key Features

* **📋 Direct Spreadsheet Clipboard Paste:** Copy rows and columns directly from **Microsoft Excel** or **Google Sheets** (`Ctrl+V` / `Cmd+V`) into the application for instant table parsing into blanks and standard concentrations.
* **🤖 Automatic AICc Model Selection:** Automatically selects the optimal statistical model among **Linear**, **Langmuir**, **4-Parameter Logistic (4PL)**, and **5-Parameter Logistic (5PL)** based on the corrected Akaike Information Criterion (AICc) to guard against overfitting, with the flexibility to manually select any specific model.
* **📊 Unified Analytics Single-View:** View the prominent LOD Hero Card, fitted parameter micro-grid, interactive AICc model comparison table, and collapsible statistical noise limits ($L_C, L_D$, blank SD, pooled SD) in one scrollable panel without tab-hopping.
* **📈 Publication-Grade Broken Logarithmic Visualization:** An interactive logarithmic plot with a calibrated broken-axis for zero-concentration blanks, 95% confidence intervals, and subdued guideline opacities highlighting the true LOD.
* **⚡ Responsive Multi-Device Design:** Optimized layouts across desktop monitors, laptops, landscape/portrait tablets, and mobile screens.
* **🔬 High-Resolution & Audit Export:** One-click download of publication-ready 300 DPI transparent PNG plots, or export complete statistical and mathematical audits to CSV and Markdown.

---

## Quick Start & Usage

1. **Load or Paste Your Data:**
   - Click **"Load Demo"** in the top bar to cycle through pre-loaded calibration curves.
   - Or paste directly from Excel / Sheets using `Ctrl+V` (or click **"Import ↑"** for CSV/TSV files).
2. **Review Model Fit & LOD:**
   - The app automatically fits models and calculates the Critical Level ($L_C$), Detection Limit Signal ($L_D$), and concentration Limit of Detection (LOD).
   - In the **Compare & Select Models** table, view $R^2$ and AICc values across all models or click any model row to switch.
3. **Export Your Results:**
   - Click **"Copy Report"** for instant Markdown formatted tables ready for lab notebooks or Slack.
   - Click **"Export CSV"** for an audit file of all raw data, curve parameters, and confidence intervals.
   - Click **"PNG ↓"** on the chart card for a high-resolution 300 DPI figure.

---

## LOD Calculation Methodology

Historically, the Limit of Detection in bioassays has often been calculated using a simple arithmetic rule: **Mean of the Blanks + 3 × Standard Deviation of the Blanks**. 

While useful as a rough estimate for highly linear, low-noise systems, this traditional approach is deeply flawed for complex biological assays because:
1. **It assumes homoscedasticity:** It assumes variance is identical everywhere. In reality, bioassays are usually *heteroscedastic*—the variance (noise) increases as the concentration increases.
2. **It ignores curve fit uncertainty:** It does not account for the mathematical uncertainty of the non-linear curve fit itself. 
3. **It fails to account for False Negatives:** The "Blank + 3SD" rule only guards against false positives, ignoring the statistical probability of false negatives at low concentrations.

### The Robust Statistical Approach
**Bioassay LOD Fitter** implements the rigorous statistical framework developed by Currie (1968) and adapted for non-linear bioassays by **Holstein et al. (2015)**. 

This method distinctly separates the concepts of the **Critical Level ($L_C$)**, the **Detection Limit Signal ($L_D$)**, and the final **Concentration Limit of Detection (LOD)** to balance both Type I (false positive) and Type II (false negative) statistical errors.

#### 1. The Critical Level ($L_C$) - "The Decision Limit"

$$ L_C = \text{Mean}_{\text{Blanks}} + (t_{\text{value}} \times \text{SD}_{\text{Blanks}}) $$

The Critical Level is the signal threshold above which an observed response is statistically considered to be distinct from background noise. It is designed to guard against **false positives** (typically set at a 95% confidence level, $\alpha = 0.05$). If the assay yields a signal below $L_C$, it is considered "not detected."

#### 2. The Detection Limit Signal ($L_D$) - "The True Signal"

$$ L_D = L_C + (t_{\text{value}} \times \text{SD}_{\text{Low Standards}}) $$

If a sample's true signal was exactly at $L_C$, normal experimental noise means it would read *below* $L_C$ 50% of the time (yielding a 50% false negative rate). 
To ensure reliable detection of the analyte, we must evaluate higher up the curve to $L_D$. $L_D$ is the true signal level at which there is a 95% probability that the *measured* signal will fall above $L_C$, thereby guarding against **false negatives** ($\beta = 0.05$). $L_D$ incorporates the pooled variance of low-concentration standards, acknowledging that noise changes as concentration increases.

#### 3. Limit of Detection (LOD) - "The Concentration"

The final LOD represents a concentration rather than a signal. **Bioassay LOD Fitter** utilises inverse regression to map the $L_D$ signal back through the rigorously fitted sigmoidal equation. This yields the lowest actual *concentration* of analyte that can be reliably detected with a 95% probability.

---

## Local Development & Testing

```bash
# Clone the repository
git clone https://github.com/akshamsabadi/bioassay-LOD-fitter.git
cd bioassay-LOD-fitter

# Install dependencies
npm install

# Run targeted unit tests
npm test

# Launch local development server
npm run dev

# Build for production
npm run build
```

---

> **Acknowledgements**
> 
> *Original code developed by Carly Holstein, Department of Bioengineering, and Maryclare Griffin, Department of Statistics.*
> *Copyright Carly Holstein, University of Washington, 2014-2015.*
> 
> *Originally published in:* Carly A. Holstein, Maryclare Griffin et al. Statistical Method for Determining and Comparing Limits of Detection of Bioassays. *Analytical Chemistry* 2015 87 (19), 9795-9801. [DOI: 10.1021/acs.analchem.5b02082](https://doi.org/10.1021/acs.analchem.5b02082)

---

## References & Citations

1. **Holstein, C. A., Griffin, M., Hong, J., & Sampson, P. D. (2015).** A Statistical Method for Determining and Comparing Limits of Detection of Bioassays. *Analytical Chemistry*, 87(19), 9795–9801. [DOI: 10.1021/acs.analchem.5b02082](https://doi.org/10.1021/acs.analchem.5b02082)
2. **Currie, L. A. (1968).** Limits for qualitative detection and quantitative determination. Application to radiochemistry. *Analytical Chemistry*, 40(3), 586-593. [DOI: 10.1021/ac60259a007](https://doi.org/10.1021/ac60259a007)
3. **Miller, B. S., et al. (2022).** Sub-picomolar lateral flow antigen detection with two-wavelength imaging of composite nanoparticles. *Biosensors and Bioelectronics*, 207, 114133. [DOI: 10.1016/j.bios.2022.114133](https://doi.org/10.1016/j.bios.2022.114133)
