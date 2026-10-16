/**
 * Automated unit test runner for Bioassay-LOD-Fitter.
 * Discovers all `*.test.ts` files under `src/`, bundles each suite with esbuild,
 * and executes it in an isolated Node process.
 */
import esbuild from "esbuild";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const _CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const _ROOT_DIR = path.join(_CURRENT_DIR, "..");
const _SRC_DIR = path.join(_ROOT_DIR, "src");
const _TEMP_BUNDLE_FILENAME = `.tmp_test_${process.pid}.mjs`;
const _TEST_FILE_SUFFIX = ".test.ts";

/**
 * Recursively collects all `*.test.ts` file paths relative to the repository root.
 *
 * @param {string} directory - Absolute directory path to scan.
 * @returns {string[]} Sorted list of relative test file paths.
 */
function _discoverTestFiles(directory) {
  const discovered = [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      discovered.push(..._discoverTestFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(_TEST_FILE_SUFFIX)) {
      discovered.push(path.relative(_ROOT_DIR, fullPath));
    }
  }
  return discovered.sort();
}

/**
 * Bundles and runs all discovered test suites sequentially.
 */
function _runAllTestSuites() {
  const testFiles = _discoverTestFiles(_SRC_DIR);
  const tempBundlePath = path.join(_ROOT_DIR, _TEMP_BUNDLE_FILENAME);

  for (const relativePath of testFiles) {
    const fullPath = path.join(_ROOT_DIR, relativePath);
    console.log(`Running: ${relativePath}...`);
    try {
      esbuild.buildSync({
        entryPoints: [fullPath],
        bundle: true,
        platform: "node",
        outfile: tempBundlePath,
        format: "esm",
      });

      execSync(`node "${tempBundlePath}"`, { stdio: "inherit" });
    } finally {
      if (fs.existsSync(tempBundlePath)) {
        fs.unlinkSync(tempBundlePath);
      }
    }
  }

  console.log(`\nAll ${testFiles.length} test suites passed successfully!\n`);
}

_runAllTestSuites();
