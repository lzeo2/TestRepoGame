import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 8080;
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.txt':'text/plain','.glb':'model/gltf-binary','.jpg':'image/jpeg'};
http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url,'http://localhost');
    const requestPath = decodeURIComponent(url.pathname);
    const p = path.resolve(root,'.'+requestPath);
    if (p !== root && !p.startsWith(root + path.sep)) {res.writeHead(403); return res.end('Forbidden');}
    const file = (await stat(p)).isDirectory() ? path.join(p,'index.html') : p;
    const content = await readFile(file);
    res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(content);
  } catch {res.writeHead(404); res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Brainrot Boulevard: http://localhost:${port}\nCtrl+C to stop.`));
