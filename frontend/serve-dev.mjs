/**
 * Dev server using only Node.js built-ins (no node_modules).
 * Avoids macOS security scanning delays on first load.
 *
 * Two responsibilities:
 *   1. Proxy /api/* requests → http://localhost:3000
 *   2. Serve the pre-built Angular app from dist/frontend/browser
 *      (Angular handles its own client-side routing via SPA fallback)
 */

import { createServer, request as httpRequest } from 'http';
import { readFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, 'dist/frontend/browser');
const PORT = 4200;
const BACKEND_PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

/** Forward /api/* requests to the Express backend running on BACKEND_PORT. */
function proxyToBackend(req, res) {
  const options = {
    hostname: 'localhost',
    port: BACKEND_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${BACKEND_PORT}` },
  };

  const proxy = httpRequest(options, (backendRes) => {
    res.writeHead(backendRes.statusCode, backendRes.headers);
    backendRes.pipe(res);
  });

  proxy.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Backend is offline. Start the backend server.' }));
  });

  req.pipe(proxy);
}

const server = createServer(async (req, res) => {
  // ── Proxy all /api/* requests to the backend ──────────────────────────────
  if (req.url?.startsWith('/api')) {
    proxyToBackend(req, res);
    return;
  }

  // ── Serve static Angular files ────────────────────────────────────────────
  let urlPath = req.url?.split('?')[0] ?? '/';
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = join(DIST_DIR, urlPath);

  try {
    await stat(filePath);
    const content = await readFile(filePath);
    const ext = extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(content);
  } catch {
    // SPA fallback: unknown paths → index.html (Angular router handles it)
    try {
      const content = await readFile(join(DIST_DIR, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not Found');
    }
  }
});

server.listen(PORT, () => {
  console.log(`Frontend server running at http://localhost:${PORT}`);
  console.log(`  → Static files: ${DIST_DIR}`);
  console.log(`  → API proxy: /api → http://localhost:${BACKEND_PORT}`);
  console.log('Note: This serves the pre-built app. Run "ng build" to rebuild after changes.');
});
