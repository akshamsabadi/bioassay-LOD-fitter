import { APP_VERSION, type AssaySeries } from "../constants";
import { type AdvancedLoDResult } from "./calculations";
import { formatScientificUnicode } from "./formatters";

/** Fallback width (in pixels) when exporting an SVG whose bounding rect has zero width. */
const _DEFAULT_EXPORT_WIDTH_PX = 800;

/** Fallback height (in pixels) when exporting an SVG whose bounding rect has zero height. */
const _DEFAULT_EXPORT_HEIGHT_PX = 500;

/** Fallback canvas background color when the `--base` CSS custom property is unavailable. */
const _DEFAULT_EXPORT_BG_COLOR = "#141824";

/** Target print-grade resolution (dots per inch) for raster PNG exports. */
const _PNG_EXPORT_DPI = 300;

/** Standard CSS pixel reference resolution (dots per inch). */
const _STANDARD_SCREEN_DPI = 96;

/** Upper absolute value threshold above which fitted parameters use scientific notation in Markdown reports. */
const _SCIENTIFIC_UPPER_THRESHOLD = 1000;

/** Lower positive value threshold below which fitted parameters use scientific notation in Markdown reports. */
const _SCIENTIFIC_LOWER_THRESHOLD = 0.01;

/** Fractional digits used for exponential LOD/CI values in CSV audit reports. */
const _CSV_EXPONENTIAL_DIGITS = 6;

/** Decimal places used for R² metrics in CSV audit reports. */
const _CSV_R2_DECIMALS = 6;

/** Decimal places used for AICc metrics in CSV and Markdown audit reports. */
const _CSV_AICC_DECIMALS = 2;

/** Significant digits used for LOD and CI columns in the Markdown leaderboard table. */
const _MARKDOWN_LEADERBOARD_LOD_PRECISION = 3;

/** Decimal places used for R² in the Markdown leaderboard table. */
const _MARKDOWN_LEADERBOARD_R2_DECIMALS = 4;

/** Significant digits used for the active curve's LOD and CI in Markdown reports. */
const _MARKDOWN_ACTIVE_LOD_PRECISION = 4;

/** Decimal places used for the active curve's R² in Markdown reports. */
const _MARKDOWN_ACTIVE_R2_DECIMALS = 5;

/** Decimal places used for fixed-point statistical limits and fitted parameters in Markdown reports. */
const _MARKDOWN_PARAM_DECIMALS = 4;

/** Font stack embedded into exported standalone SVG/PNG chart files. */
const _CHART_EXPORT_FONT_FAMILY = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";

/** Theme CSS custom properties resolved inline when serializing standalone SVG/PNG charts. */
const _THEME_CSS_VARIABLES: readonly string[] = [
  "--rosewater",
  "--flamingo",
  "--pink",
  "--mauve",
  "--red",
  "--maroon",
  "--peach",
  "--yellow",
  "--green",
  "--teal",
  "--sky",
  "--sapphire",
  "--blue",
  "--lavender",
  "--text",
  "--subtext1",
  "--subtext0",
  "--overlay2",
  "--overlay1",
  "--overlay0",
  "--surface2",
  "--surface1",
  "--surface0",
  "--base",
  "--mantle",
  "--crust",
  "--border-subtle",
  "--card-bg",
  "--indigo",
  "--radius-pill",
  "--radius-sm",
  "--radius-xs",
];

/**
 * Represents a single curve entry in the comparative sensitivity leaderboard.
 */
export interface SeriesLeaderboardEntry {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  results: AdvancedLoDResult;
  foldChangeVsRef: string;
}

/**
 * Supported sort columns for the multi-curve sensitivity leaderboard.
 */
export type LeaderboardSortField = "name" | "model" | "lod" | "r2" | "fold";

/**
 * Returns a new array of leaderboard items sorted by the specified column and direction.
 * Non-finite or non-positive LOD values are sorted to the end when ascending.
 *
 * @param items - Readonly array of leaderboard entries to sort.
 * @param sortField - Column to sort by, or `null` to preserve input order.
 * @param isAscending - Whether to sort in ascending (`true`) or descending (`false`) order.
 * @returns Newly allocated sorted array of leaderboard entries.
 */
export function sortLeaderboardItems<T extends SeriesLeaderboardEntry>(
  items: readonly T[],
  sortField: LeaderboardSortField | null,
  isAscending: boolean
): T[] {
  if (!sortField) return [...items];
  return [...items].sort((a, b) => {
    let cmp = 0;
    if (sortField === "name") {
      cmp = a.name.localeCompare(b.name);
    } else if (sortField === "model") {
      cmp = a.results.fit.method.localeCompare(b.results.fit.method);
    } else if (sortField === "lod" || sortField === "fold") {
      const aLod = Number.isFinite(a.results.lodConc) && a.results.lodConc > 0 ? a.results.lodConc : Infinity;
      const bLod = Number.isFinite(b.results.lodConc) && b.results.lodConc > 0 ? b.results.lodConc : Infinity;
      cmp = aLod - bLod;
    } else if (sortField === "r2") {
      const aR2 = Number.isFinite(a.results.fit.metrics.r2) ? a.results.fit.metrics.r2 : -Infinity;
      const bR2 = Number.isFinite(b.results.fit.metrics.r2) ? b.results.fit.metrics.r2 : -Infinity;
      cmp = aR2 - bR2;
    }
    return isAscending ? cmp : -cmp;
  });
}

/**
 * Builds the complete multi-curve CSV audit report containing metadata, comparative
 * leaderboard metrics (when multiple curves are present), and raw replicate data per series.
 *
 * @param seriesList - List of all assay curve series in the workspace.
 * @param leaderboardItems - Comparative sensitivity leaderboard entries.
 * @param appVersion - Application semantic version string (defaults to `APP_VERSION`).
 * @returns Formatted CSV string ready for file export.
 */
export function buildMultiCurveCSVReport(
  seriesList: readonly AssaySeries[],
  leaderboardItems: readonly SeriesLeaderboardEntry[],
  appVersion: string = APP_VERSION
): string {
  const csvRows: string[] = [];
  csvRows.push("# ===================================================");
  csvRows.push(`# BIOASSAY LOD FITTER - MULTI-CURVE AUDIT REPORT (v${appVersion})`);
  csvRows.push("# ===================================================");
  csvRows.push(`App Version,v${appVersion}`);
  csvRows.push(`Total Curves,${seriesList.length}`);
  csvRows.push("");

  if (leaderboardItems.length > 1) {
    csvRows.push("# ===================================================");
    csvRows.push("# COMPARATIVE SENSITIVITY LEADERBOARD");
    csvRows.push("# ===================================================");
    csvRows.push("Curve Name,Fitted Model,LOD (Conc),LOD 95% CI Low,LOD 95% CI High,R2,AICc,Sensitivity vs Ref");
    leaderboardItems.forEach(item => {
      csvRows.push(
        `"${item.name}",${item.results.fit.method.toUpperCase()},${item.results.lodConc.toExponential(_CSV_EXPONENTIAL_DIGITS)},${item.results.lodCI.low.toExponential(_CSV_EXPONENTIAL_DIGITS)},${item.results.lodCI.high.toExponential(_CSV_EXPONENTIAL_DIGITS)},${item.results.fit.metrics.r2.toFixed(_CSV_R2_DECIMALS)},${item.results.fit.metrics.aicc.toFixed(_CSV_AICC_DECIMALS)},"${item.foldChangeVsRef}"`
      );
    });
    csvRows.push("");
  }

  seriesList.forEach(s => {
    csvRows.push("# ===================================================");
    csvRows.push(`# SERIES: ${s.name}`);
    csvRows.push("# ===================================================");
    csvRows.push("Concentration,Signals");
    if (s.blankSignals) csvRows.push(`0,${s.blankSignals}`);
    s.standardRows.forEach(row => {
      if (row.conc && row.signals) csvRows.push(`${row.conc},${row.signals}`);
    });
    csvRows.push("");
  });

  return csvRows.join("\n");
}

/**
 * Builds a multi-curve CSV import template demonstrating the commented `# Series:` header format.
 *
 * @returns Multi-curve template CSV string.
 */
export function buildMultiCurveTemplateCSV(): string {
  const csvRows = [
    "# ===================================================",
    "# BIOASSAY LOD FITTER - MULTI-CURVE IMPORT TEMPLATE",
    "# ===================================================",
    "# Series: Synthetic Ref (Construct A)",
    "Concentration,Replicate1,Replicate2,Replicate3",
    "0,0.06,0.09,0.07",
    "0.001,0.08,0.09,0.08",
    "0.01,0.19,0.22,0.18",
    "0.1,0.85,0.92,0.81",
    "1,3.20,3.42,3.10",
    "10,4.75,4.90,4.68",
    "",
    "# Series: Synthetic Construct B (Low Potency)",
    "Concentration,Replicate1,Replicate2,Replicate3",
    "0,0.07,0.10,0.08",
    "0.003,0.09,0.10,0.09",
    "0.03,0.18,0.20,0.17",
    "0.3,0.82,0.89,0.78",
    "3,3.05,3.25,2.95",
    "30,4.70,4.85,4.62",
  ];
  return csvRows.join("\n");
}

/**
 * Generates a Markdown-formatted analytical audit report for clipboard export.
 *
 * @param targetSeries - Active or displayed assay curve series.
 * @param targetResults - Calculated LOD and regression results for `targetSeries`.
 * @param leaderboardItems - Comparative sensitivity leaderboard entries.
 * @param appVersion - Application semantic version string (defaults to `APP_VERSION`).
 * @param generatedDate - Human-readable date stamp (defaults to `new Date().toLocaleDateString()`).
 * @returns Markdown audit report string.
 */
export function buildMarkdownAuditReport(
  targetSeries: AssaySeries,
  targetResults: AdvancedLoDResult,
  leaderboardItems: readonly SeriesLeaderboardEntry[],
  appVersion: string = APP_VERSION,
  generatedDate: string = new Date().toLocaleDateString()
): string {
  let leaderboardMarkdown = "";
  if (leaderboardItems.length > 1) {
    leaderboardMarkdown = `#### 🏆 Multi-Curve Sensitivity Comparison
| Curve | Model | LOD (Concentration) | 95% CI | R² | vs Ref |
| :--- | :--- | :--- | :--- | :--- | :--- |
`;
    leaderboardItems.forEach(item => {
      leaderboardMarkdown += `| **${item.name}** | ${item.results.fit.method.toUpperCase()} | **${formatScientificUnicode(item.results.lodConc, _MARKDOWN_LEADERBOARD_LOD_PRECISION)}** | [${formatScientificUnicode(item.results.lodCI.low, _MARKDOWN_LEADERBOARD_LOD_PRECISION)}, ${formatScientificUnicode(item.results.lodCI.high, _MARKDOWN_LEADERBOARD_LOD_PRECISION)}] | ${item.results.fit.metrics.r2.toFixed(_MARKDOWN_LEADERBOARD_R2_DECIMALS)} | ${item.foldChangeVsRef} |
`;
    });
    leaderboardMarkdown += "\n";
  }

  let fitParamsText = "";
  Object.entries(targetResults.fit.parameters).forEach(([p, val]) => {
    const formattedVal =
      Math.abs(val) >= _SCIENTIFIC_UPPER_THRESHOLD || (Math.abs(val) > 0 && Math.abs(val) < _SCIENTIFIC_LOWER_THRESHOLD)
        ? formatScientificUnicode(val, _MARKDOWN_LEADERBOARD_LOD_PRECISION)
        : val.toFixed(_MARKDOWN_PARAM_DECIMALS);
    fitParamsText += `| **${p}** | ${formattedVal} |
`;
  });

  return `### 🔬 Bioassay LOD Fitter Multi-Curve Report (v${appVersion})
Generated: ${generatedDate}

${leaderboardMarkdown}#### 📈 Active Curve: ${targetSeries.name}
| Parameter | Value |
| :--- | :--- |
| **Limit of Detection (LOD)** | **${formatScientificUnicode(targetResults.lodConc, _MARKDOWN_ACTIVE_LOD_PRECISION)}** |
| **95% Confidence Interval** | [${formatScientificUnicode(targetResults.lodCI.low, _MARKDOWN_ACTIVE_LOD_PRECISION)}, ${formatScientificUnicode(targetResults.lodCI.high, _MARKDOWN_ACTIVE_LOD_PRECISION)}] |
| **Model Fitted** | ${targetResults.fit.method.toUpperCase()} |
| **R² (Coefficient of Determination)** | ${targetResults.fit.metrics.r2.toFixed(_MARKDOWN_ACTIVE_R2_DECIMALS)} |
| **AICc Score** | ${targetResults.fit.metrics.aicc.toFixed(_CSV_AICC_DECIMALS)} |

#### 🧪 Statistical Limits (Currie 1968 / Holstein et al. 2015)
| Parameter | Value | Description |
| :--- | :--- | :--- |
| **Blank Mean** | ${targetResults.meanBlank.toFixed(_MARKDOWN_PARAM_DECIMALS)} | Average background signal |
| **Blank SD** | ${targetResults.sdBlank.toFixed(_MARKDOWN_PARAM_DECIMALS)} | Background standard deviation |
| **Pooled SD** | ${targetResults.sdPooled.toFixed(_MARKDOWN_PARAM_DECIMALS)} | Standards pooled standard deviation |
| **L_C (Decision Limit)** | ${targetResults.lc.toFixed(_MARKDOWN_PARAM_DECIMALS)} | Critical signal threshold (α=0.05) |
| **L_D (Detection Limit)** | ${targetResults.ld.toFixed(_MARKDOWN_PARAM_DECIMALS)} | Minimal detectable signal level (β=0.05) |

#### ⚙️ Fitted Parameters (${targetSeries.name})
| Parameter | Value |
| :--- | :--- |
${fitParamsText}`;
}

/**
 * Triggers a browser file download for a text payload using a temporary object URL.
 *
 * @param content - Text content to write to the downloaded file.
 * @param filename - Suggested filename for the download.
 * @param mimeType - MIME type string (defaults to `"text/csv;charset=utf-8;"`).
 */
export function downloadTextFile(
  content: string,
  filename: string,
  mimeType: string = "text/csv;charset=utf-8;"
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Clones an SVG element, injects explicit dimensions and optional background fill,
 * and substitutes all theme CSS custom properties (`var(--...)`) with their computed values.
 *
 * @param svgElement - Source Recharts `<svg>` DOM element.
 * @param includeBackgroundRect - Whether to insert a full-size background `<rect>` into the SVG clone.
 * @returns Serialized standalone SVG string along with resolved dimensions and background color.
 */
function _serializeStandaloneChartSvg(
  svgElement: SVGSVGElement,
  includeBackgroundRect: boolean
): { svgString: string; width: number; height: number; backgroundColor: string } {
  const rect = svgElement.getBoundingClientRect();
  const width = rect.width || _DEFAULT_EXPORT_WIDTH_PX;
  const height = rect.height || _DEFAULT_EXPORT_HEIGHT_PX;

  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("width", width.toString());
  clone.setAttribute("height", height.toString());
  clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
  clone.setAttribute("font-family", _CHART_EXPORT_FONT_FAMILY);

  const docStyle = getComputedStyle(document.documentElement);
  const backgroundColor = docStyle.getPropertyValue("--base").trim() || _DEFAULT_EXPORT_BG_COLOR;

  if (includeBackgroundRect) {
    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bgRect.setAttribute("width", "100%");
    bgRect.setAttribute("height", "100%");
    bgRect.setAttribute("fill", backgroundColor);
    clone.insertBefore(bgRect, clone.firstChild);
  } else {
    clone.style.backgroundColor = "transparent";
  }

  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(clone);

  for (const varName of _THEME_CSS_VARIABLES) {
    const resolvedValue = docStyle.getPropertyValue(varName).trim();
    if (resolvedValue) {
      svgString = svgString.split(`var(${varName})`).join(resolvedValue);
    }
  }

  return { svgString, width, height, backgroundColor };
}

/**
 * Exports the `<svg>` inside `chartContainer` as a standalone vector `.svg` file.
 *
 * @param chartContainer - Container HTML element holding the rendered Recharts `<svg>`.
 * @param filename - Target `.svg` download filename.
 */
export function downloadChartAsSVG(
  chartContainer: HTMLElement | null,
  filename: string = `bioassay_plot_v${APP_VERSION}.svg`
): void {
  if (!chartContainer) return;
  const svgElement = chartContainer.querySelector("svg");
  if (!svgElement) return;

  const { svgString } = _serializeStandaloneChartSvg(svgElement, true);
  downloadTextFile(svgString, filename, "image/svg+xml;charset=utf-8");
}

/**
 * Rasterizes the `<svg>` inside `chartContainer` at 300 DPI onto an HTML5 `<canvas>`
 * and triggers a `.png` file download.
 *
 * @param chartContainer - Container HTML element holding the rendered Recharts `<svg>`.
 * @param filename - Target `.png` download filename.
 */
export function downloadChartAsPNG(
  chartContainer: HTMLElement | null,
  filename: string = `bioassay_plot_v${APP_VERSION}.png`
): void {
  if (!chartContainer) return;
  const svgElement = chartContainer.querySelector("svg");
  if (!svgElement) return;

  const { svgString, width, height, backgroundColor } = _serializeStandaloneChartSvg(svgElement, false);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const scale = _PNG_EXPORT_DPI / _STANDARD_SCREEN_DPI;
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(scale, scale);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
    URL.revokeObjectURL(url);
  };
  img.src = url;
}
