import esbuild from 'esbuild';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const testFiles = [
  'src/utils/csvParser.test.ts',
  'src/utils/calculations.test.ts',
  'src/utils/zoom.test.ts'
];

for (const relPath of testFiles) {
  const fullPath = path.join(rootDir, relPath);
  console.log(`Running: ${relPath}...`);
  const tempOut = path.join(rootDir, '.tmp_test.mjs');
  try {
    esbuild.buildSync({
      entryPoints: [fullPath],
      bundle: true,
      platform: 'node',
      outfile: tempOut,
      format: 'esm'
    });

    execSync(`node "${tempOut}"`, { stdio: 'inherit' });
  } finally {
    if (fs.existsSync(tempOut)) {
      fs.unlinkSync(tempOut);
    }
  }
}
console.log('\nAll test suites passed successfully!\n');
