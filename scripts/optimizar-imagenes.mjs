// Genera las versiones optimizadas (WebP + JPEG) de las imágenes seleccionadas.
// Uso: npm run imagenes
import { mkdir, copyFile, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ORIGEN = "imagenes-originales";
const DESTINO = "public/assets/img";
const FUENTES = "public/assets/fonts";

// archivo original -> nombre publicado y anchos a generar (nunca se amplía por encima del original).
// webp: solo donde pesa menos que el JPEG equivalente (en fotos con mucha textura de grava no compensa).
const SELECCION = [
  { origen: "06-bulldozer-cat-d9t-al-atardecer.jpg", nombre: "portada-bulldozer", anchos: [480, 735], webp: true },
  { origen: "02-bulldozer-liebherr-con-ripper-en-roca.jpg", nombre: "servicios-bulldozer-ripper", anchos: [400, 564], webp: true },
  { origen: "04-flota-de-bulldozers-cat-alineados.jpg", nombre: "mantenimiento-flota", anchos: [480, 736] },
  { origen: "12-pala-minera-komatsu-con-tecnicos.jpg", nombre: "proceso-tecnicos-mina", anchos: [480, 736] },
  { origen: "03-tres-bulldozers-cat-empujando-en-ladera.jpg", nombre: "estudio-bulldozers-ladera", anchos: [480, 736] },
];

const FUENTES_USADAS = [
  ["@fontsource/barlow", "barlow-latin-400-normal.woff2"],
  ["@fontsource/barlow", "barlow-latin-600-normal.woff2"],
  ["@fontsource/barlow-condensed", "barlow-condensed-latin-600-normal.woff2"],
  ["@fontsource/barlow-condensed", "barlow-condensed-latin-800-normal.woff2"],
];

await rm(DESTINO, { recursive: true, force: true });
await mkdir(DESTINO, { recursive: true });
await mkdir(FUENTES, { recursive: true });

for (const { origen, nombre, anchos, webp } of SELECCION) {
  const entrada = path.join(ORIGEN, origen);
  const { width } = await sharp(entrada).metadata();
  for (const ancho of anchos) {
    const w = Math.min(ancho, width);
    const base = sharp(entrada).resize({ width: w, withoutEnlargement: true });
    if (webp) await base.clone().webp({ quality: 64, effort: 6, smartSubsample: true }).toFile(path.join(DESTINO, `${nombre}-${w}.webp`));
    await base.clone().jpeg({ quality: 72, mozjpeg: true, progressive: true }).toFile(path.join(DESTINO, `${nombre}-${w}.jpg`));
  }
  console.log(`✔ ${nombre} (${anchos.join(", ")} px)`);
}

for (const [paquete, archivo] of FUENTES_USADAS) {
  await copyFile(path.join("node_modules", paquete, "files", archivo), path.join(FUENTES, archivo));
}
console.log("✔ fuentes copiadas");
