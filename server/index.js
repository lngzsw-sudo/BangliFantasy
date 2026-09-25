import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { JsonStore } from './store.js';
import { World } from './world.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = process.env.DATA_FILE || join(ROOT, 'data', 'players.json');

// URL prefix -> directory on disk. Everything is static; no build step.
const MOUNTS = [
  ['/shared/', join(ROOT, 'shared')],
  ['/vendor/phaser.js', join(ROOT, 'node_modules', 'phaser', 'dist', 'phaser.min.js')],
  ['/', join(ROOT, 'client')],
];

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function resolveStatic(urlPath) {
  for (const [prefix, target] of MOUNTS) {
    if (!urlPath.startsWith(prefix)) continue;
    if (!prefix.endsWith('/')) return urlPath === prefix ? target : null;
    const rel = normalize(decodeURIComponent(urlPath.slice(prefix.length)) || 'index.html');
    const file = join(target, rel);
    return file.startsWith(target + sep) ? file : null;
  }
  return null;
}

const http = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    return res.end('ok');
  }
  let file = null;
  try {
    file = resolveStatic(url.pathname);
    if (file && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (file) statSync(file);
  } catch {
    file = null;
  }
  if (!file || (req.method !== 'GET' && req.method !== 'HEAD')) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    return res.end('not found');
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-cache',
  });
  createReadStream(file).pipe(res);
});

const world = new World({ store: new JsonStore(DATA_FILE) });
const wss = new WebSocketServer({ server: http, path: '/ws', maxPayload: 4096 });

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  const session = world.connect(
    (msg) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(msg)),
    () => ws.close(),
  );
  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    session.message(msg);
  });
  ws.on('close', () => session.disconnect());
});

// Drop connections that stopped answering pings (closed laptop lids etc.).
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) ws.terminate();
    else {
      ws.isAlive = false;
      ws.ping();
    }
  }
}, 30000);

world.start();
http.listen(PORT, () => console.log(`Bang Li Fantasy running at http://localhost:${PORT}`));

function shutdown() {
  clearInterval(heartbeat);
  world.stop();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
