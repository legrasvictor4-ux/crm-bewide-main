-- Migration: Création de la table clients
-- Date: 2025-01-XX

-- Table principale des clients/prospects
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
  
  -- Données enrichies OpenAI
  enrichment_data JSONB,
  business_description TEXT,
  segmentation TEXT,
  lead_score INTEGER,
  enriched_at TIMESTAMP WITH TIME ZONE,
  
  -- Métadonnées
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_company ON public.clients(company) WHERE company IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_date_created ON public.clients(date_created DESC);

-- Trigger pour mettre à jour date_updated automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_updated = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) - Activer si nécessaire
-- ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Politique de lecture publique (à adapter selon vos besoins de sécurité)
-- CREATE POLICY "Allow public read access" ON public.clients FOR SELECT USING (true);
-- CREATE POLICY "Allow public insert access" ON public.clients FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow public update access" ON public.clients FOR UPDATE USING (true);

COMMENT ON TABLE public.clients IS 'Table principale pour stocker les clients/prospects importés';
COMMENT ON COLUMN public.clients.enrichment_data IS 'Données complètes d''enrichissement OpenAI (JSON)';
COMMENT ON COLUMN public.clients.lead_score IS 'Score de qualité du lead (0-100)';


