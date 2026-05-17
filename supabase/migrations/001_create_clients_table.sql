-- Migration: Création de la table clients
-- Cette migration reflète le schéma ACTUEL de la base Supabase

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  status TEXT DEFAULT 'prospect' CHECK (status IN ('prospect', 'activé', 'client actif', 'perdu')),
  role TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  statut_opportunite TEXT,
  priorite TEXT,
  motif_objection TEXT,
  date_relance TEXT,
  offre_cible TEXT,
  canal_acquisition TEXT
);

-- Index
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email) WHERE email IS NOT NULL;

-- RLS Policies pour permettre les opérations CRUD
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.clients FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.clients FOR DELETE USING (true);

COMMENT ON TABLE public.clients IS 'Table principale pour stocker les clients/prospects';


