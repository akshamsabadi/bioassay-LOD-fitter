# Bioassay LOD Fitter

![Version](https://img.shields.io/badge/version-v0.4.8-blue?style=for-the-badge)

Bioassay LOD Fitter is a web application built to analyse concentration-response data, perform advanced sigmoidal curve fitting, and rigorously calculate the Limit of Detection (LOD) for diagnostic assays using validated statistical frameworks.

**[Bioassay LOD Fitter](https://akshamsabadi.github.io/bioassay-LOD-fitter/)**

## Overview & Functionality

This tool provides an interface for inputting experimental data (blanks and standard concentrations with their corresponding signal readouts) and visualising the fitted concentration-response curve.

### Key Features
* **Interactive Data Entry:** Add, edit, or remove calibration standards and blank measurements.
* **Advanced Curve Fitting:** Automatically selects between 4-Parameter Logistic (4PL) and 5-Parameter Logistic (5PL) curve models using the Akaike Information Criterion (AICc) to ensure the most statistically sound fit, while still allowing the user to manually force a specific model.
* **Rich Visualisation:** A responsive, interactive logarithmic plot displays the data points, the modelled curve, the 95% confidence interval (CI) for the fit, and visually highlights the critical limits ($L_C$, $L_D$, and LOD).
* **High-Resolution Export:** Download the generated plot as a publication-ready, 300 DPI transparent PNG.

## LOD Calculation Methodology

Historically, the Limit of Detection in bioassays has often been calculated using a simple arithmetic rule: **Mean of the Blanks + 3 × Standard Deviation of the Blanks**. 

While useful as a rough estimate for highly linear, low-noise systems, this traditional approach is deeply flawed for complex biological assays because:
1. **It assumes homoscedasticity:** It assumes variance is identical everywhere. In reality, bioassays are usually *heteroscedastic*—the variance (noise) increases as the concentration increases.
2. **It ignores curve fit uncertainty:** It does not account for the mathematical uncertainty of the 4PL or 5PL curve fit itself. 
3. **It fails to account for False Negatives:** The "Blank + 3SD" rule only guards against false positives, ignoring the statistical probability of false negatives at low concentrations.

### The Robust Statistical Approach
**Bioassay LOD Fitter** abandons this oversimplified method in favour of a rigorous statistical framework developed by Currie (1968) and adapted for non-linear bioassays by **Holstein et al. (2015)**. 

This method distinctly separates the concepts of the **Critical Level ($L_C$)**, the **Detection Limit Signal ($L_D$)**, and the final **Concentration Limit of Detection (LOD)** to balance both Type I (false positive) and Type II (false negative) statistical errors.

#### 1. The Critical Level ($L_C$) - "The Decision Limit"

$$ L_C = \text{Mean}_{\text{Blanks}} + (t_{\text{value}} \times \text{SD}_{\text{Blanks}}) $$

The Critical Level is the signal threshold above which an observed response is statistically considered to be distinct from background noise. It is designed to guard against **false positives** (typically set at a 95% confidence level, $\alpha = 0.05$). If the assay yields a signal below $L_C$, it is considered "not detected."

#### 2. The Detection Limit Signal ($L_D$) - "The True Signal"

$$ L_D = L_C + (t_{\text{value}} \times \text{SD}_{\text{Low Standards}}) $$

If a sample's true signal was exactly at $L_C$, normal experimental noise means it would read *below* $L_C$ 50% of the time (yielding a 50% false negative rate). 
To ensure reliable detection of the analyte, we must evaluate higher up the curve to $L_D$. $L_D$ is the true signal level at which there is a 95% probability that the *measured* signal will fall above $L_C$, thereby guarding against **false negatives** ($\beta = 0.05$). Notice that $L_D$ incorporates the variance of low-concentration standards, acknowledging that noise changes as concentration increases.

#### 3. Limit of Detection (LOD) - "The Concentration"

The final LOD represents a concentration rather than a signal. **Bioassay LOD Fitter** utilises inverse regression to map the $L_D$ signal back through the rigorously fitted 4PL or 5PL sigmoidal equation. This yields the lowest actual *concentration* of analyte that can be reliably detected with a 95% probability.

<hr>

> **Acknowledgements**
> 
> *Original code developed by Carly Holstein, Department of Bioengineering, and Maryclare Griffin, Department of Statistics.*
> *Copyright Carly Holstein, University of Washington, 2014-2015.*
> 
> *Originally published in:* Carly A. Holstein, Maryclare Griffin et al. Statistical Method for Determining and Comparing Limits of Detection of Bioassays. *Analytical Chemistry* 2015 87 (19), 9795-9801. [DOI: 10.1021/acs.analchem.5b02082](https://doi.org/10.1021/acs.analchem.5b02082)

<hr>

## References & Citations

The statistical mathematics powering this application are based on the following seminal works:

1. **Holstein, C. A., Griffin, M., Hong, J., & Sampson, P. D. (2015).** A Statistical Method for Determining and Comparing Limits of Detection of Bioassays. *Analytical Chemistry*, 87(19), 9795–9801.[DOI: 10.1021/acs.analchem.5b02082](https://doi.org/10.1021/acs.analchem.5b02082)
2. **Currie, L. A. (1968).** Limits for qualitative detection and quantitative determination. Application to radiochemistry. *Analytical Chemistry*, 40(3), 586-593.[DOI: 10.1021/ac60259a007](https://doi.org/10.1021/ac60259a007)
3. **Miller, B. S., et al. (2022).** Sub-picomolar lateral flow antigen detection with two-wavelength imaging of composite nanoparticles. *Biosensors and Bioelectronics*, 207, 114133.[DOI: 10.1016/j.bios.2022.114133](https://doi.org/10.1016/j.bios.2022.114133)
