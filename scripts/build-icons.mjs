// Renders the home-screen icons in public/ from public/favicon.svg.
// Usage: node scripts/build-icons.mjs
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const PUBLIC = new URL('../public/', import.meta.url);
const svg = await readFile(new URL('favicon.svg', PUBLIC));
const BG = '#173f32'; // the panel green, so iOS and maskable crops stay seamless

/** The logo at `scale` of the icon, on the panel green or transparent. */
async function icon(file, size, scale, background) {
  const logo = await sharp(svg, { density: 1200 }).resize(Math.round(size * scale)).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: background ?? { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toFile(new URL(file, PUBLIC).pathname);
}

await icon('icon-192.png', 192, 1);
await icon('icon-512.png', 512, 1);
await icon('icon-maskable-512.png', 512, 1, BG); // the crescent already sits inside the 80% safe zone
await icon('apple-touch-icon.png', 180, 1, BG); // iOS rounds the corners itself and fills transparency with black
console.log('icons written');
