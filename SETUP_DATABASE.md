# 🗄️ Configuration de la Base de Données

## Option 1: Via Script (Recommandé)

Exécutez cette commande pour afficher le SQL à copier:

```bash
npm run setup:db
```

Puis:
1. Copiez le SQL affiché
2. Allez dans Supabase → SQL Editor
3. Collez et exécutez

## Option 2: SQL Direct

Si vous ne pouvez pas utiliser Supabase SQL Editor, voici le SQL simplifié à exécuter:

```sql
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

-- Trigger pour date_updated automatique
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_updated = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Option 3: Via l'API Supabase (Alternative)

Si vous avez accès à l'API Supabase mais pas à l'interface, vous pouvez créer la table via une requête HTTP:

```bash
curl -X POST 'https://votre-projet.supabase.co/rest/v1/rpc/exec_sql' \
  -H "apikey: VOTRE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer VOTRE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "CREATE TABLE IF NOT EXISTS public.clients (...)"
  }'
```

**Note**: Cette méthode nécessite que la fonction `exec_sql` soit disponible dans votre projet Supabase.

## Option 4: Table Editor (Interface Graphique)

Si vous préférez utiliser l'interface graphique de Supabase:

1. Allez dans **Table Editor** dans Supabase
2. Cliquez sur **New Table**
3. Nommez la table: `clients`
4. Ajoutez les colonnes suivantes:

| Nom | Type | Nullable | Default |
|-----|------|----------|---------|
| id | uuid | ❌ | gen_random_uuid() |
| first_name | text | ✅ | - |
| last_name | text | ❌ | - |
| email | text | ✅ | - |
| phone | text | ✅ | - |
| company | text | ✅ | - |
| address | text | ✅ | - |
| postal_code | text | ✅ | - |
| city | text | ✅ | - |
| arrondissement | text | ✅ | - |
| contact | text | ✅ | - |
| status | text | ✅ | 'new' |
| notes | text | ✅ | - |
| next_action | text | ✅ | - |
| date_created | timestamptz | ✅ | now() |
| date_updated | timestamptz | ✅ | now() |
| imported_at | timestamptz | ✅ | - |
| source_file | text | ✅ | - |
| enrichment_data | jsonb | ✅ | - |
| business_description | text | ✅ | - |
| segmentation | text | ✅ | - |
| lead_score | integer | ✅ | - |
| enriched_at | timestamptz | ✅ | - |
| metadata | jsonb | ✅ | '{}' |

5. Ajoutez une contrainte CHECK sur `status`:
   - Valeurs autorisées: `'new'`, `'success'`, `'pending'`, `'lost'`, `'to_recontact'`

6. Créez les index:
   - `idx_clients_status` sur `status`
   - `idx_clients_email` sur `email` (WHERE email IS NOT NULL)
   - `idx_clients_company` sur `company` (WHERE company IS NOT NULL)
   - `idx_clients_date_created` sur `date_created DESC`

## ✅ Vérification

Après avoir créé la table, vérifiez qu'elle existe:

```bash
# Via l'API
curl 'https://votre-projet.supabase.co/rest/v1/clients?select=id&limit=1' \
  -H "apikey: VOTRE_ANON_KEY"
```

Si vous obtenez une réponse (même vide), la table existe!

## 🚨 Problèmes Courants

### "relation does not exist"
- La table n'a pas été créée. Réessayez avec une des méthodes ci-dessus.

### "permission denied"
- Vérifiez que vous utilisez la **Service Role Key** (pas l'Anon Key) pour créer la table.
- Vérifiez les permissions RLS (Row Level Security) dans Supabase.

### "function does not exist"
- Le trigger nécessite la fonction `update_updated_at_column()`. Exécutez d'abord la création de la fonction, puis le trigger.

## 📝 Fichier SQL Complet

Le fichier SQL complet est disponible dans:
`supabase/migrations/001_create_clients_table.sql`


