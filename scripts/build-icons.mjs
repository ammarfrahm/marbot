// Renders the home-screen icons in public/ from public/favicon.svg.
// Usage: node scripts/build-icons.mjs
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const PUBLIC = new URL('../public/', import.meta.url);
const svg = await readFile(new URL('favicon.svg', PUBLIC));
const BG = '#f5efe4';

/** The drum at `scale` of the icon, on the page background or transparent. */
async function icon(file, size, scale, background) {
  const drum = await sharp(svg, { density: 1200 }).resize(Math.round(size * scale)).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: background ?? { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: drum, gravity: 'centre' }])
    .png()
    .toFile(new URL(file, PUBLIC).pathname);
}

await icon('icon-192.png', 192, 1);
await icon('icon-512.png', 512, 1);
await icon('icon-maskable-512.png', 512, 0.62, BG); // inside the 80% safe zone of a maskable icon
await icon('apple-touch-icon.png', 180, 0.8, BG); // iOS fills transparency with black
console.log('icons written');
