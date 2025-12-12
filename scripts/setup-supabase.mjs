// Script simplifié pour créer la table - Affiche juste le SQL à copier
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('📋 SQL à exécuter dans Supabase SQL Editor:\n');
console.log('='.repeat(80));
console.log('\n');

try {
  const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '001_create_clients_table.sql');
  const sql = readFileSync(sqlPath, 'utf-8');
  console.log(sql);
} catch (error) {
  console.log(`
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

-- Trigger pour date_updated
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_updated = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`);
}

console.log('\n');
console.log('='.repeat(80));
console.log('\n📝 Instructions:');
console.log('1. Copiez le SQL ci-dessus');
console.log('2. Allez dans votre projet Supabase');
console.log('3. Ouvrez SQL Editor');
console.log('4. Collez le SQL et exécutez-le');
console.log('\n');
