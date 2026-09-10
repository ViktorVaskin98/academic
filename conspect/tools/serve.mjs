import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
};

createServer(async (request, response) => {
  const requested = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  let target = path.join(root, requested === '/' ? 'index.html' : requested);
  if (!target.startsWith(root)) {
    response.writeHead(403).end('forbidden');
    return;
  }
  try {
    const info = await stat(target);
    if (info.isDirectory()) target = path.join(target, 'index.html');
    const body = await readFile(target);
    response.writeHead(200, {
      'Content-Type': TYPES[path.extname(target)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('not found');
  }
}).listen(port, () => {
  console.log(`конспект на http://localhost:${port}/`);
});
