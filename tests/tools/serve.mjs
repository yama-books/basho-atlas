// Minimal static server for the kyukoku atlas E2E tests.
// Binds to 127.0.0.1 only and serves the repository root read-only (GET/HEAD).
// Usage: node tests/tools/serve.mjs [port]   (default 4173, or $OLDMAP_E2E_PORT)
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {extname, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const port = Number(process.argv[2] || process.env.OLDMAP_E2E_PORT || 4173);
const types = {
  '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.geojson': 'application/geo+json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml',
};
// Only the paths the atlas actually loads; node_modules, .git etc. are never served.
const allowed = ['kyukoku/', 'src/', 'data/', 'docs/'];

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname).replace(/^\/+/, ''); }
  catch { res.writeHead(400).end(); return; }
  if (path === '' ) { res.writeHead(302, {location: '/kyukoku/'}).end(); return; }
  if (path.endsWith('/')) path += 'index.html';
  const file = resolve(root, path);
  if (!file.startsWith(root + sep) || !allowed.some(prefix => path.startsWith(prefix))) {
    res.writeHead(404).end(); return;
  }
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not a file');
    res.writeHead(200, {'content-type': types[extname(file)] || 'application/octet-stream',
      'content-length': info.size, 'cache-control': 'no-store'});
    if (req.method === 'HEAD') { res.end(); return; }
    createReadStream(file).pipe(res);
  } catch { res.writeHead(404).end(); }
});
server.listen(port, '127.0.0.1', () => console.log(`oldmap atlas: http://127.0.0.1:${port}/kyukoku/`));
