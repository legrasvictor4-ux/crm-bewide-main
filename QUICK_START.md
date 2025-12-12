# 🚀 Démarrage Rapide - Alternative si Supabase SQL Editor inaccessible

## Solution Rapide

Si vous ne pouvez pas accéder à Supabase SQL Editor, voici plusieurs alternatives:

### Option 1: Vérifier l'état de la base de données

```bash
# Démarrer le backend
npm run dev:backend

# Dans un autre terminal, vérifier l'état
curl http://localhost:3000/api/setup/database
```

Cela vous dira si la table existe et affichera le SQL à exécuter si nécessaire.

### Option 2: Afficher le SQL à copier

```bash
npm run setup:db
```

Copiez le SQL affiché et exécutez-le dans Supabase via:
- L'API REST Supabase
- Un client PostgreSQL (psql, DBeaver, etc.)
- Un autre outil de gestion de base de données

### Option 3: Utiliser un client PostgreSQL

Si vous avez accès à la base de données PostgreSQL directement:

```bash
# Se connecter à Supabase PostgreSQL
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# Puis exécuter le SQL
\i supabase/migrations/001_create_clients_table.sql
```

### Option 4: Via l'API Supabase REST

Si vous avez la Service Role Key:

```bash
# Créer la table via l'API (si la fonction exec_sql existe)
curl -X POST 'https://[PROJECT].supabase.co/rest/v1/rpc/exec_sql' \
  -H "apikey: [SERVICE_ROLE_KEY]" \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"sql": "CREATE TABLE ..."}'
```

### Option 5: Table Editor (Interface Graphique)

1. Allez dans Supabase Dashboard
2. **Table Editor** → **New Table**
3. Nom: `clients`
4. Ajoutez les colonnes manuellement (voir `SETUP_DATABASE.md`)

## 📋 SQL Minimal (Copier-Coller)

Si vous avez juste besoin de créer la table rapidement, voici le SQL minimal:

```sql
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
  status TEXT DEFAULT 'new',
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
```

## ✅ Vérification

Après avoir créé la table, testez:

```bash
# Test 1: Vérifier via l'API
curl http://localhost:3000/api/clients

# Test 2: Vérifier via Supabase
curl 'https://[PROJECT].supabase.co/rest/v1/clients?select=id&limit=1' \
  -H "apikey: [ANON_KEY]"
```

Si vous obtenez une réponse (même vide `{"clients": []}`), la table existe!

## 🆘 Besoin d'aide?

- Voir `SETUP_DATABASE.md` pour plus de détails
- Voir `README_IMPORT_EXCEL.md` pour l'utilisation complète
- Vérifier les logs du backend pour les erreurs


