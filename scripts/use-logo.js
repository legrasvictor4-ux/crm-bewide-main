#!/usr/bin/env node
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = process.argv[2];

if (!src) {
  console.error('\n❌  Donne le chemin de ton logo :');
  console.error('   node scripts/use-logo.js "C:\\Users\\jfleg\\Desktop\\myclerk-logo.png"');
  process.exit(1);
}

const resolved = path.resolve(src.replace(/"/g, ''));
if (!fs.existsSync(resolved)) {
  console.error(`\n❌  Fichier introuvable : ${resolved}\n`);
  process.exit(1);
}

const data = fs.readFileSync(resolved);
const ext  = path.extname(resolved).slice(1).toLowerCase();
const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
const b64  = `data:${mime};base64,${data.toString('base64')}`;

// 1. Copie dans public/
const root    = path.join(__dirname, '..');
const pubDest = path.join(root, 'public', `myclerk-logo.${ext}`);
fs.copyFileSync(resolved, pubDest);
console.log(`\n✅  Copié dans public/myclerk-logo.${ext}`);

// 2. Intègre en base64 dans src/assets/logoBase64.ts (persiste dans git)
const tsDir  = path.join(root, 'src', 'assets');
const tsDest = path.join(tsDir, 'logoBase64.ts');
fs.mkdirSync(tsDir, { recursive: true });
fs.writeFileSync(tsDest,
`// Généré par scripts/use-logo.js — ne pas modifier manuellement\nexport const LOGO_SRC = "${b64}";\n`,
'utf8');
console.log(`✅  Base64 intégré dans src/assets/logoBase64.ts`);
console.log(`📦  Taille : ${Math.round(data.length / 1024)} KB\n`);
console.log('─────────────────────────────────────────────────────');
console.log('👉  Committe pour que ça reste TOUJOURS :');
console.log(`    git add public/myclerk-logo.${ext} src/assets/logoBase64.ts scripts/use-logo.js`);
console.log('    git commit -m "feat: logo myclerk intégré"');
console.log('─────────────────────────────────────────────────────\n');
