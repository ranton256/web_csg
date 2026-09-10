// Zero-dependency static file server for local development, e2e tests, and
// milestone captures. Serves the repository root on 127.0.0.1 only.
//
// Usage: node tools/serve.mjs [--port <n>]   (else $PORT, else 8080)

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HOST = '127.0.0.1';
export const DEFAULT_PORT = 8080;
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.csg': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};
const DEFAULT_MIME_TYPE = 'application/octet-stream';

export function contentTypeFor(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? DEFAULT_MIME_TYPE;
}

// Port precedence: --port <n> or --port=<n>, then the PORT environment
// variable, then 8080. A --port flag without a value is an error.
export function parsePort(argv, env) {
  let raw = env.PORT;
  const flagIndex = argv.findIndex((arg) => arg === '--port' || arg.startsWith('--port='));
  if (flagIndex >= 0) {
    const flag = argv[flagIndex];
    raw = flag === '--port' ? argv[flagIndex + 1] : flag.slice('--port='.length);
    if (raw === undefined || raw === '') throw new Error('--port requires a value');
  }
  if (raw === undefined || raw === '') return DEFAULT_PORT;
  // Decimal digits only: Number() would also accept " " (→ 0), "1e3", "0x1F90", "+80".
  const port = /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!(port >= 0 && port <= 65535)) {
    throw new Error(`Invalid port "${raw}": expected a decimal integer from 0 to 65535`);
  }
  return port;
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

// Maps a raw request target to a file path inside root. Returns
// { status: 403 } for anything that tries to leave the root. The raw target
// is examined before any normalization, so "/../x" is refused rather than
// silently rewritten to "/x".
function resolveTarget(root, rawTarget) {
  const rawPath = rawTarget.split(/[?#]/, 1)[0];
  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return { status: 400 };
  }
  if (!decoded.startsWith('/') || decoded.includes('\0') || decoded.includes('\\')) {
    return { status: 403 };
  }
  if (decoded.split('/').includes('..')) return { status: 403 };

  const filePath = path.resolve(root, `.${decoded}`);
  if (!isInside(root, filePath)) return { status: 403 };
  return { filePath, isRoot: decoded === '/' };
}

function sendStatus(res, status, extraHeaders = {}) {
  const body = `${status} ${http.STATUS_CODES[status]}\n`;
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(res.req.method === 'HEAD' ? undefined : body);
}

async function handle(realRoot, req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendStatus(res, 405, { Allow: 'GET, HEAD' });
    return;
  }

  const target = resolveTarget(realRoot, req.url);
  if (target.status) {
    sendStatus(res, target.status);
    return;
  }

  let filePath = target.filePath;
  try {
    let stats = await fs.promises.stat(filePath);
    if (stats.isDirectory()) {
      if (!target.isRoot) {
        sendStatus(res, 404);
        return;
      }
      filePath = path.join(filePath, 'index.html');
      stats = await fs.promises.stat(filePath);
    }
    // Refuse symlinks that lead outside the root.
    const realPath = await fs.promises.realpath(filePath);
    if (!isInside(realRoot, realPath)) {
      sendStatus(res, 403);
      return;
    }
    if (!stats.isFile()) {
      sendStatus(res, 404);
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentTypeFor(filePath),
      'Content-Length': stats.size,
      'Cache-Control': 'no-store',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(realPath).on('error', () => res.destroy()).pipe(res);
  } catch (error) {
    sendStatus(res, error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : 500);
  }
}

// Starts the server and resolves once it is listening. Pass port 0 for a
// free port; read it back from server.address().port.
export async function startServer({ port = DEFAULT_PORT, root = REPO_ROOT } = {}) {
  const realRoot = await fs.promises.realpath(root);
  const server = http.createServer((req, res) => {
    handle(realRoot, req, res).catch(() => res.destroy());
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, HOST, () => {
      server.off('error', reject);
      resolve();
    });
  });
  return server;
}

// Compare real paths: import.meta.url is already resolved through symlinks
// (e.g. /tmp → /private/tmp on macOS), but process.argv[1] is not.
function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isMainModule()) {
  try {
    const server = await startServer({ port: parsePort(process.argv.slice(2), process.env) });
    const { port } = server.address();
    console.log(`Serving ${REPO_ROOT} at http://${HOST}:${port}/`);
  } catch (error) {
    console.error(`serve: ${error.message}`);
    process.exit(1);
  }
}
