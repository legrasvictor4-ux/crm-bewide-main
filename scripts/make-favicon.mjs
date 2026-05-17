// Usage:
//   npm run favicon                              → utilise public/myclerk-logo.png
//   node scripts/make-favicon.mjs mon-logo.png  → utilise l'image fournie

import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const input = process.argv[2] ?? 'public/myclerk-logo.png';

if (!existsSync(input)) {
  console.error(`❌ Fichier introuvable : ${input}`);
  process.exit(1);
}

const meta = await sharp(input).metadata();
const { width, height } = meta;
console.log(`  Image : ${width}×${height}px`);

// Carré centré (fonctionne avec n'importe quelle image)
const sq   = Math.min(width, height);
const left = Math.floor((width  - sq) / 2);
const top  = Math.floor((height - sq) / 2);

const crop = { left, top, width: sq, height: sq };

const sizes = [
  { file: 'public/favicon.png',          size: 32  },
  { file: 'public/apple-touch-icon.png', size: 180 },
  { file: 'public/icon-192.png',         size: 192 },
];

for (const { file, size } of sizes) {
  await sharp(input)
    .extract(crop)
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(file);
  console.log(`✓ ${file.padEnd(32)} (${size}×${size})`);
}

// Met à jour index.html
const indexPath = 'index.html';
let html = readFileSync(indexPath, 'utf8');

const faviconTags = `    <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />`;

if (html.includes('rel="icon"'))            html = html.replace(/<link rel="icon"[^>]*\/?>/g, '');
if (html.includes('rel="apple-touch-icon"')) html = html.replace(/<link rel="apple-touch-icon"[^>]*\/?>/g, '');
html = html.replace('  </head>', `${faviconTags}\n  </head>`);

writeFileSync(indexPath, html);
console.log('✓ index.html mis à jour');
console.log('\nRelance ton serveur pour voir le changement.');
