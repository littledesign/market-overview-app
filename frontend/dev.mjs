/**
 * Frontend development server script.
 *
 * Why this exists: macOS 26 beta's security scanning makes loading
 * thousands of node_modules files extremely slow (~30-50s per module).
 * The Angular CLI takes 10+ minutes just to initialise because of this.
 *
 * The fix: pre-bundle the Angular CLI into ONE file using esbuild,
 * so Node only loads a single file at startup. Then run ng serve
 * from the bundled CLI.
 */

import { buildSync } from './node_modules/esbuild/lib/main.js';
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUNDLE_OUT = join(__dirname, '.angular/cli-bundle.cjs');

// Ensure output directory exists
const outDir = dirname(BUNDLE_OUT);
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

console.log('[dev] Bundling Angular CLI (one-time, avoids macOS scanning)...');

try {
  buildSync({
    entryPoints: [join(__dirname, 'node_modules/@angular/cli/lib/init.js')],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    outfile: BUNDLE_OUT,
    // Keep the build tools external — they get loaded later by the
    // Angular build system and are already optimised (esbuild/vite binaries)
    external: [
      'esbuild',
      'vite',
      '@angular/compiler-cli',
      '@angular/compiler',
      '@angular/build',
      '@angular-devkit/build-angular',
      'typescript',
      'sass',
      'less',
      'fsevents',
    ],
    logLevel: 'warning',
    // Some Angular CLI dependencies use __dirname — keep it working
    define: {
      'import.meta.url': 'undefined',
    },
  });
  console.log('[dev] CLI bundle ready.');
} catch (err) {
  console.error('[dev] Bundle failed:', err.message);
  console.error('[dev] Falling back to unbundled ng serve (will be slow)...');

  // Fall back to running ng serve directly
  const fallback = spawn(
    process.execPath,
    [join(__dirname, 'node_modules/@angular/cli/bin/ng.js'), 'serve'],
    { stdio: 'inherit', cwd: __dirname }
  );
  fallback.on('exit', (code) => process.exit(code ?? 1));
  // Prevent script from continuing
  await new Promise(() => {});
}

// Run the bundled CLI with 'serve' arguments
console.log('[dev] Starting Angular dev server...');

process.argv = [process.execPath, 'ng', 'serve'];
process.chdir(__dirname);

try {
  require(BUNDLE_OUT);
} catch (err) {
  // If the CJS require fails, try a dynamic import
  await import(`file://${BUNDLE_OUT}`);
}
