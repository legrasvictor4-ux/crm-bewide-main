// Script pour créer la table clients dans Supabase automatiquement
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erreur: Variables d\'environnement manquantes');
  console.error('Définissez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
  console.log('🔄 Création de la table clients...\n');

  try {
    // Lire le fichier SQL
    const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '001_create_clients_table.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    // Exécuter le SQL via Supabase
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Si la fonction RPC n'existe pas, essayer directement avec la requête
      console.log('⚠️  Tentative alternative: exécution directe...\n');
      
      // Diviser le SQL en commandes individuelles
      const commands = sql
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

      for (const command of commands) {
        if (command.toLowerCase().includes('create table')) {
          // Extraire le nom de la table et les colonnes
          const tableMatch = command.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:public\.)?(\w+)/i);
          if (tableMatch) {
            const tableName = tableMatch[1];
            console.log(`📋 Création de la table: ${tableName}`);
            
            // Pour créer la table, on va utiliser une approche différente
            // Créer la table via l'API REST de Supabase
            const createTableSQL = `
              CREATE TABLE IF NOT EXISTS public.clients (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                first_name TEXT,
                last_name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                company TEXT,
                address TEXT,
                postal_code TEXT,
                city TEXT,
                arrondissement TEXT,
                contact TEXT,
                status TEXT DEFAULT 'new' CHECK (status IN ('new', 'success', 'pending', 'lost', 'to_recontact')),
                notes TEXT,
                next_action TEXT,
                date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                date_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                imported_at TIMESTAMP WITH TIME ZONE,
                source_file TEXT,
                enrichment_data JSONB,
                business_description TEXT,
                segmentation TEXT,
                lead_score INTEGER,
                enriched_at TIMESTAMP WITH TIME ZONE,
                metadata JSONB DEFAULT '{}'::jsonb
              );
            `;

            // Utiliser l'API REST directement
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ sql: createTableSQL })
            });

            if (!response.ok) {
              // Essayer une autre méthode: créer via PostgREST
              console.log('⚠️  Méthode RPC non disponible, création manuelle recommandée');
              console.log('\n📝 Veuillez exécuter ce SQL dans Supabase SQL Editor:\n');
              console.log(sql);
              console.log('\n');
              return;
            }
          }
        }
      }
    }

    // Vérifier que la table existe
    const { data: tables, error: checkError } = await supabase
      .from('clients')
      .select('id')
      .limit(1);

    if (checkError && checkError.code === 'PGRST116') {
      console.log('❌ La table n\'existe toujours pas.');
      console.log('\n📝 Veuillez exécuter ce SQL dans Supabase SQL Editor:\n');
      console.log(sql);
      console.log('\n');
      console.log('Ou utilisez cette commande SQL simplifiée:\n');
      console.log(getSimplifiedSQL());
    } else {
      console.log('✅ Table clients créée avec succès!');
      console.log('✅ Vous pouvez maintenant importer des clients depuis Excel.');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('\n📝 Veuillez exécuter ce SQL dans Supabase SQL Editor:\n');
    const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '001_create_clients_table.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    console.log(sql);
  }
}

function getSimplifiedSQL() {
  return `
-- Créer la table clients
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  arrondissement TEXT,
  contact TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'success', 'pending', 'lost', 'to_recontact')),
  notes TEXT,
  next_action TEXT,
  date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  imported_at TIMESTAMP WITH TIME ZONE,
  source_file TEXT,
  enrichment_data JSONB,
  business_description TEXT,
  segmentation TEXT,
  lead_score INTEGER,
  enriched_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_company ON public.clients(company) WHERE company IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_date_created ON public.clients(date_created DESC);
`;
}

createTable();


