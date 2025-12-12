// Script de test pour vérifier que la route existe
import { readFileSync } from 'fs';

const content = readFileSync('api-server.mjs', 'utf8');

console.log('🔍 Vérification de la route /api/setup/database...\n');

if (content.includes("app.get('/api/setup/database'")) {
  console.log('✅ Route trouvée dans api-server.mjs');
  const lineNumber = content.substring(0, content.indexOf("app.get('/api/setup/database'")).split('\n').length;
  console.log(`📍 Ligne: ${lineNumber}`);
} else {
  console.log('❌ Route NON trouvée dans api-server.mjs');
}

if (content.includes('/api/setup/database')) {
  console.log('✅ Le chemin "/api/setup/database" est présent dans le fichier');
} else {
  console.log('❌ Le chemin "/api/setup/database" n\'est PAS présent');
}

console.log('\n📋 Routes disponibles dans le fichier:');
const routeMatches = content.matchAll(/app\.(get|post|put|delete)\('([^']+)'/g);
for (const match of routeMatches) {
  console.log(`  ${match[1].toUpperCase()} ${match[2]}`);
}
