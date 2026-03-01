/**
 * Backend development server script.
 *
 * Why this exists: macOS 26 beta's security scanning makes loading
 * thousands of node_modules files extremely slow (~2-12s each).
 * The fix is to pre-bundle everything into ONE file using esbuild,
 * so Node only needs to load a single file at startup.
 *
 * This script:
 *   1. Builds a bundle from src/server.ts
 *   2. Starts the bundled server with --watch (auto-restarts on changes)
 *   3. Watches src/ for changes and rebuilds automatically
 */

import { buildSync } from './node_modules/esbuild/lib/main.js';
import { spawn } from 'child_process';
import { watch } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUNDLE_OUT = join(__dirname, 'dist/server.bundled.cjs');
const SRC_DIR = join(__dirname, 'src');

function buildBundle() {
  console.log('[dev] Building bundle...');
  try {
    buildSync({
      entryPoints: [join(__dirname, 'src/server.ts')],
      bundle: true,
      platform: 'node',
      target: 'node22',
      format: 'cjs',
      outfile: BUNDLE_OUT,
      loader: { '.ts': 'ts', '.json': 'json' },
      logLevel: 'warning',
    });
    console.log('[dev] Bundle built successfully.');
    return true;
  } catch (err) {
    console.error('[dev] Build failed:', err.message);
    return false;
  }
}

let serverProcess = null;

function startServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }

  console.log('[dev] Starting server...');
  serverProcess = spawn(process.execPath, [BUNDLE_OUT], {
    stdio: 'inherit',
    env: { ...process.env },
    cwd: __dirname,
  });

  serverProcess.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.log(`[dev] Server exited with code ${code}`);
    }
  });
}

// Initial build + start
if (buildBundle()) {
  startServer();
}

// Watch src/ for changes and rebuild
let rebuildTimeout = null;
watch(SRC_DIR, { recursive: true }, (event, filename) => {
  if (!filename || (!filename.endsWith('.ts') && !filename.endsWith('.json'))) return;

  // Debounce: wait 300ms after the last change before rebuilding
  clearTimeout(rebuildTimeout);
  rebuildTimeout = setTimeout(() => {
    console.log(`[dev] Change detected in ${filename}, rebuilding...`);
    if (buildBundle()) {
      startServer();
    }
  }, 300);
});

console.log('[dev] Watching src/ for changes...');

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n[dev] Shutting down...');
  if (serverProcess) serverProcess.kill();
  process.exit(0);
});
