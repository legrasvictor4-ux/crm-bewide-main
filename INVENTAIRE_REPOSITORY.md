# INVENTAIRE COMPLET DU REPOSITORY CRM

## A) REPOSITORY SCAN

### Frontend Stack

**Framework:**
- Vite + React 18.3.1 + TypeScript
- Fichier: `vite.config.ts`, `package.json`
- Port dev: 8080 (proxy vers backend 3000)

**Router:**
- React Router DOM v6.30.1
- Fichier: `src/App.tsx`
- Routes:
  - `/` → `Index.tsx` (page prospection/homepage)
  - `/map` → `Map.tsx`
  - `/agenda` → `Agenda.tsx`
  - `/ai-features` → `AIFeatures.tsx`
  - `/pro-tools` → `ProTools.tsx`

**Pages/Composants Prospection:**
- **Page principale prospection:** `src/pages/Index.tsx`
  - Affiche `ProspectionList` component
  - Stats hardcodées (24 prospections, 8 RDV, etc.)
  
- **Liste des clients:** `src/components/ProspectionList.tsx`
  - Utilise `mockData` (4 clients hardcodés)
  - Modal de détail client intégrée
  - Filtres par statut (all, success, to_recontact, pending)
  - **PAS de connexion à la base de données**

- **Page détail client:** 
  - **NON TROUVÉE** - Le détail est dans une modal dans `ProspectionList.tsx`

### Backend Stack

**Framework:**
- Express 5.2.1
- Fichier: `api-server.mjs`
- Port: 3000 (ou PORT env variable)
- Script: `npm run dev:backend` ou `node api-server.mjs`

**Routes API existantes:**
- `GET /api/health` - Health check
- `POST /api/import/prospection` - Import prospects (MOCK - ne sauvegarde pas en DB)
- `POST /api/chat` - Chat mock

**Routes non montées:**
- `src/backend/batchImportRoute.js` - Route pour upload dossiers (EXISTE mais pas montée dans api-server.mjs)
  - Endpoint: `/api/upload/folder`
  - Utilise multer pour upload
  - Traite fichiers JSON/txt uniquement (pas Excel)

### Database Layer

**Type:**
- Supabase (PostgreSQL)
- Client: `src/integrations/supabase/client.ts`
- Types: `src/integrations/supabase/types.ts`

**Schéma:**
- **AUCUNE TABLE DÉFINIE** - Le fichier `types.ts` montre `Tables: { [_ in never]: never }`
- Pas de table `clients` ou `prospects` existante

### API Layer

**Routes clients:**
- ❌ `GET /api/clients` - **NON TROUVÉE**
- ❌ `POST /api/clients` - **NON TROUVÉE**
- ❌ `GET /api/clients/:id` - **NON TROUVÉE**
- ✅ `POST /api/import/prospection` - EXISTE mais MOCK

**Routes prospection:**
- ❌ Routes spécifiques prospection - **NON TROUVÉES**

**Routes import:**
- ✅ `POST /api/import/prospection` - EXISTE (mock)
- ⚠️ `POST /api/upload/folder` - EXISTE dans `batchImportRoute.js` mais NON MONTÉE

**Routes upload:**
- ⚠️ `POST /api/upload/folder` - EXISTE mais non montée

**Import controller/service:**
- ⚠️ `src/backend/batchImportRoute.js` - EXISTE mais:
  - Pas monté dans api-server.mjs
  - Ne parse pas Excel (seulement JSON/txt)
  - Ne sauvegarde pas en DB (commentaire ligne 86)

### Excel / File Upload

**Bibliothèques XLSX/CSV:**
- ❌ **AUCUNE BIBLIOTHÈQUE XLSX INSTALLÉE**
- ❌ Pas de `xlsx`, `exceljs`, `csv-parser` dans package.json

**Upload middleware:**
- ✅ Multer configuré dans `batchImportRoute.js`
- ⚠️ Mais route non montée dans api-server.mjs

**Composants upload frontend:**
- ✅ `src/upload/FolderUpload.jsx` - Upload dossiers (pas Excel)
- ⚠️ `src/components/AICallAnalysis.tsx` - Mentionne .xlsx mais pas implémenté

### Fake / Demo Data

**Données mockées trouvées:**

1. **Frontend:**
   - `src/components/ProspectionList.tsx` - `mockData` (4 clients)
   - `src/components/SpeedProspecting.tsx` - `mockProspects` (5 prospects)
   - `src/components/SmartDialQueue.tsx` - `mockProspects`
   - `src/components/CallWindowOptimizer.tsx` - `mockProspects`
   - `src/components/AutoLogActivity.tsx` - `mockActivities`
   - `src/pages/Agenda.tsx` - `mockEvents`
   - `src/components/SmartSearch.tsx` - `mockProspectData`

2. **Backend:**
   - `api-server.mjs` ligne 91-97 - Mock processing prospects
   - `api-server.mjs` ligne 114-129 - Mock chat responses

3. **Seed files:**
   - ❌ **AUCUN FICHIER SEED TROUVÉ**

## B) STACK + FILE MAPPING

### Frontend Pages/Components

- **Prospection list component:** `src/components/ProspectionList.tsx`
- **Client card component:** Intégré dans `ProspectionList.tsx` (pas de composant séparé)
- **Client detail page:** Modal dans `ProspectionList.tsx` (lignes 126-199)

### Backend

- **Client model/schema:** ❌ **NON EXISTANT** - Pas de table DB
- **Client controller/service:** ❌ **NON EXISTANT**
- **Import endpoint file:** ⚠️ `src/backend/batchImportRoute.js` (existe mais non monté, pas Excel)
- **DB access layer:** ✅ `src/integrations/supabase/client.ts` (existe mais pas de tables)

### Data Flow

**Actuel (BROKEN):**
```
Excel → ❌ (pas de parsing Excel)
API → ❌ (route non montée)
DB → ❌ (pas de table)
Prospection list → mockData (hardcodé)
Client detail → mockData (hardcodé)
```

**Cible:**
```
Excel → API (parsing XLSX) → DB (table clients) → Prospection list (requête Supabase) → Client detail (requête Supabase)
```

## C) FIX / FEATURE PLAN

### 1) Supprimer données fake/demo
- [ ] Supprimer `mockData` de `ProspectionList.tsx`
- [ ] Supprimer `mockProspects` de `SpeedProspecting.tsx`
- [ ] Supprimer `mockProspects` de `SmartDialQueue.tsx`
- [ ] Supprimer `mockProspects` de `CallWindowOptimizer.tsx`
- [ ] Supprimer `mockActivities` de `AutoLogActivity.tsx`
- [ ] Supprimer `mockEvents` de `Agenda.tsx`
- [ ] Supprimer `mockProspectData` de `SmartSearch.tsx`
- [ ] Supprimer mock processing de `api-server.mjs`

### 2) Implémenter import Excel réel
- [ ] Installer `xlsx` ou `exceljs`
- [ ] Créer route `/api/import/excel` dans api-server.mjs
- [ ] Parser Excel avec validation headers
- [ ] Valider champs requis: first_name, last_name, email, phone, company
- [ ] Rejeter lignes invalides avec erreurs claires

### 3) Persister clients en DB
- [ ] Créer table `clients` dans Supabase
- [ ] Mettre à jour `types.ts` avec le schéma
- [ ] Créer service backend pour insert clients
- [ ] Connecter route import à DB

### 4) UI Integration
- [ ] Créer composant `ExcelUpload.tsx`
- [ ] Ajouter bouton "Enregistrer dans la base de données"
- [ ] Connecter à `/api/import/excel`
- [ ] Rafraîchir `ProspectionList` après import
- [ ] Remplacer `mockData` par requête Supabase dans `ProspectionList`
- [ ] Connecter modal détail à données DB

### 5) Enrichissement OpenAI
- [ ] Créer route `/api/enrich/client/:id` ou intégrer dans import
- [ ] Utiliser fonction Supabase `enrich-prospect` existante
- [ ] Stocker résultats enrichissement en DB
- [ ] Gérer erreurs OpenAI gracieusement

## D) FICHIERS À CRÉER/MODIFIER

### À CRÉER:
1. `supabase/migrations/001_create_clients_table.sql` - Schéma DB
2. `src/components/ExcelUpload.tsx` - Composant upload Excel
3. Service backend pour DB (dans api-server.mjs ou fichier séparé)

### À MODIFIER:
1. `api-server.mjs` - Ajouter route Excel, supprimer mocks
2. `src/components/ProspectionList.tsx` - Remplacer mockData par Supabase
3. `src/integrations/supabase/types.ts` - Ajouter schéma clients
4. `package.json` - Ajouter dépendance xlsx
5. Supprimer toutes les données mockées des composants


