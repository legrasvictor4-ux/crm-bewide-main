import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath  = process.argv[2];

if (!jsonPath) {
  console.log('\n❌  Glisse ton fichier JSON ici :');
  console.log('   node scripts/setup-google-key.js "C:\\Users\\jfleg\\Downloads\\crm-bewide-xxxx.json"\n');
  process.exit(1);
}

// Lire le JSON
const json = JSON.parse(fs.readFileSync(jsonPath.replace(/"/g, ''), 'utf8'));

// Lire le .env actuel
const envPath = path.join(__dirname, '../.env');
let env = fs.readFileSync(envPath, 'utf8');

// Remplacer les 3 lignes Google
env = env.replace(/^GOOGLE_PROJECT_ID=.*/m,  `GOOGLE_PROJECT_ID=${json.project_id}`);
env = env.replace(/^GOOGLE_CLIENT_EMAIL=.*/m, `GOOGLE_CLIENT_EMAIL=${json.client_email}`);
env = env.replace(/^GOOGLE_PRIVATE_KEY=.*/m,  `GOOGLE_PRIVATE_KEY="${json.private_key.replace(/\n/g, '\\n')}"`);

fs.writeFileSync(envPath, env, 'utf8');

console.log('\n✅  Clé Google configurée avec succès !');
console.log(`   Projet  : ${json.project_id}`);
console.log(`   Email   : ${json.client_email}`);
console.log(`   Clé     : ${json.private_key_id}\n`);
