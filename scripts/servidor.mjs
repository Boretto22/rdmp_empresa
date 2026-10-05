// Servidor estático mínimo para revisar la web en local, sin dependencias.
// Uso: npm start  (puerto configurable con PORT)
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const RAIZ = path.resolve("public");
const PUERTO = Number(process.env.PORT) || 4173;
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

createServer(async (req, res) => {
  try {
    const ruta = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    let archivo = path.join(RAIZ, ruta);
    if (!archivo.startsWith(RAIZ)) throw new Error("fuera de raíz");
    if ((await stat(archivo)).isDirectory()) archivo = path.join(archivo, "index.html");
    const datos = await readFile(archivo);
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(archivo)] || "application/octet-stream" });
    res.end(datos);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("No encontrado");
  }
}).listen(PUERTO, () => console.log(`RDMP en http://localhost:${PUERTO}`));
