/**
 * Production entry: `node server.mjs`.
 *
 * Serves the built app. Static files (the stylesheet, quick-exit.js, fonts,
 * favicon) are served here with the same security headers as the pages; the
 * adapter's own standalone server would send them without any. Everything else
 * goes to Astro, whose middleware adds the headers to rendered pages.
 *
 * No request logging. One line at startup, nothing per request.
 */
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SECURITY_HEADERS } from './security-headers.mjs';
import { handler as astro } from './dist/server/entry.mjs';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number.parseInt(process.env.PORT || '4321', 10);
const CLIENT_DIR = resolve(fileURLToPath(new URL('./dist/client/', import.meta.url)));

const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
};

/** Path of a real file under dist/client for this request, or null. */
function staticFile(req) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return null;
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return null;
  }
  if (pathname.includes('\0') || pathname.endsWith('/')) return null;
  const file = resolve(CLIENT_DIR, '.' + pathname);
  if (file !== CLIENT_DIR && !file.startsWith(CLIENT_DIR + sep)) return null; // never leave dist/client
  try {
    const st = statSync(file);
    return st.isFile() ? { file, size: st.size } : null;
  } catch {
    return null;
  }
}

function serveStatic(req, res, { file, size }) {
  const headers = { ...SECURITY_HEADERS };
  headers['Content-Type'] = TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
  headers['Content-Length'] = String(size);
  // Hashed build assets can be cached for a long time; the rest for an hour.
  headers['Cache-Control'] = file.startsWith(resolve(CLIENT_DIR, '_astro') + sep)
    ? 'public, max-age=31536000, immutable'
    : 'public, max-age=3600';
  res.writeHead(200, headers);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  const stream = createReadStream(file);
  stream.on('error', () => {
    // Message only; nothing about the request.
    console.error('[tea-talks] error: could not read a static file');
    if (!res.headersSent) res.writeHead(500, SECURITY_HEADERS);
    res.end();
  });
  stream.pipe(res);
}

const server = createServer((req, res) => {
  const hit = staticFile(req);
  if (hit) return serveStatic(req, res, hit);
  return astro(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`[tea-talks] listening on http://${HOST}:${PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
