// Local preview at both /project-dashboard/ and the repository-prefixed URL.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repository = JSON.parse(await readFile(resolve(root, 'config/project.json'), 'utf8')).project.repository.split('/')[1];
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.md': 'text/plain' };
const port = Number(process.env.PORT || 8765);
createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    path = path.replace(new RegExp(`^/${repository}(?=/)`), '').replace(/^\/project-dashboard(?=\/|$)/, '');
    let file = resolve(root, `.${path || '/'}`);
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    res.writeHead(200, { 'Content-Type': `${types[extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-cache' });
    res.end(await readFile(file));
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Dashboard: http://127.0.0.1:${port}/${repository}/project-dashboard/`));
