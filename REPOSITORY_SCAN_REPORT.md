# REPOSITORY SCAN REPORT - Manual Client Creation Feature

## A) FRONTEND STACK & PROSPECTION UI

### Framework
- **Framework**: Vite + React 18.3.1 + TypeScript
- **File**: `package.json` (scripts: `dev:frontend: vite`)
- **Port**: 8080 (dev, proxy vers backend 3000)

### Routing
- **Router**: React Router DOM v6.30.1
- **File**: `src/App.tsx`
- **Routes**:
  - `/` → `Index.tsx` (page Prospection/homepage)

### Prospection Page Implementation
- **Page**: `src/pages/Index.tsx`
  - Route: `/`
  - Affiche `ProspectionList` component
  - Actions rapides dans sidebar

### Prospection List Component
- **File**: `src/components/ProspectionList.tsx`
- **Data Source**: React Query (`useQuery`) avec Supabase client
- **Query Key**: `['clients', filter, refreshTrigger]`
- **Query Function**: Fetches from `supabase.from('clients').select('*')`
- **Refresh Mechanism**: `refreshTrigger` prop from parent, `refetch()` on trigger change

### Client Detail
- **Implementation**: Modal/side panel intégré dans `ProspectionList.tsx` (lignes 155-236)
- **No separate route**: Détail affiché dans modal overlay

### UI Component Library
- **Library**: shadcn/ui (Radix UI primitives)
- **Available Components**:
  - Dialog: `src/components/ui/dialog.tsx` ✅
  - Sheet: `src/components/ui/sheet.tsx` ✅
  - Form: `src/components/ui/form.tsx` (react-hook-form) ✅
  - Input: `src/components/ui/input.tsx` ✅
  - Textarea: `src/components/ui/textarea.tsx` ✅
  - Button: `src/components/ui/button.tsx` ✅
  - Label: `src/components/ui/label.tsx` ✅

### Validation
- **Library**: react-hook-form v7.61.1 + zod v3.25.76
- **Resolver**: @hookform/resolvers v3.10.0
- **Pattern**: Form components use Controller from react-hook-form

## B) BACKEND STACK, PORTS, ROUTES

### Backend Entrypoint
- **File**: `api-server.mjs`
- **Framework**: Express 5.2.1
- **Start Script**: `npm run dev:backend` → `node api-server.mjs`
- **Port**: 3000 (env: `PORT` or default 3000)

### Existing API Routes
- `GET /api/health` - Health check
- `GET /api/setup/database` - DB setup check
- `POST /api/import/excel` - Excel import
- `POST /api/import/prospection` - Legacy import
- `GET /api/clients` - List clients (with filters)
- `GET /api/clients/:id` - Get single client
- `POST /api/chat` - Chat mock
- **MISSING**: `POST /api/clients` - Create client ❌

### Error Handling
- **Middleware**: Error handler at line 664-671 (api-server.mjs)
- **Logging**: Request logging middleware at line 52-55
- **Pattern**: `next(error)` → error handler returns JSON with status code

## C) DATABASE/ORM/SCHEMA

### Database Type
- **Type**: Supabase (PostgreSQL)
- **Client**: `@supabase/supabase-js` v2.87.1
- **Backend Client**: Created in `api-server.mjs` (line 23-25)
  - Uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars
- **Frontend Client**: `src/integrations/supabase/client.ts`
  - Uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`

### Schema/Migrations
- **Migration File**: `supabase/migrations/001_create_clients_table.sql`
- **Types File**: `src/integrations/supabase/types.ts`

### Table: `clients` (public.clients)
**Columns**:
- `id` UUID PRIMARY KEY
- `first_name` TEXT (nullable)
- `last_name` TEXT NOT NULL ✅
- `email` TEXT (nullable) ✅
- `phone` TEXT (nullable) ⚠️ (requirement: phone_number required)
- `company` TEXT (nullable)
- `address` TEXT (nullable)
- `postal_code` TEXT (nullable)
- `city` TEXT (nullable)
- `arrondissement` TEXT (nullable)
- `contact` TEXT (nullable)
- `status` TEXT DEFAULT 'new'
- `notes` TEXT (nullable) ✅ (can be used for description)
- `next_action` TEXT (nullable)
- `date_created` TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- `date_updated` TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- `imported_at` TIMESTAMP WITH TIME ZONE (nullable)
- `source_file` TEXT (nullable)
- `enrichment_data` JSONB (nullable)
- `business_description` TEXT (nullable)
- `segmentation` TEXT (nullable)
- `lead_score` INTEGER (nullable)
- `enriched_at` TIMESTAMP WITH TIME ZONE (nullable)
- `metadata` JSONB DEFAULT '{}'::jsonb

**Field Mapping for Requirements**:
- `name` (required) → Use `last_name` (NOT NULL) + optional `first_name`
- `phone_number` (required) → Use `phone` (currently nullable, validate in backend)
- `email` (optional) → `email` ✅
- `description` (optional) → `notes` ✅

## D) STATE MANAGEMENT & LIST REFRESH

### React Query Usage
- **QueryClient**: Created in `src/App.tsx` (line 13)
- **Query Key Pattern**: `['clients', filter, refreshTrigger]`
- **Query Location**: `src/components/ProspectionList.tsx` (line 31-66)
- **Refresh Mechanism**: 
  - Parent passes `refreshTrigger` prop
  - `useEffect` calls `refetch()` when trigger changes
  - Alternative: Can use `queryClient.invalidateQueries(['clients'])`

### Mutation Pattern
- **Not yet used** for client creation
- **Pattern to follow**: `useMutation` from `@tanstack/react-query`
- **After mutation**: `queryClient.invalidateQueries(['clients'])` or update `refreshTrigger`

## E) FILES INSPECTED

1. `package.json` - Dependencies and scripts
2. `src/pages/Index.tsx` - Prospection page
3. `src/components/ProspectionList.tsx` - List component with React Query
4. `api-server.mjs` - Backend Express server
5. `src/integrations/supabase/types.ts` - DB types
6. `supabase/migrations/001_create_clients_table.sql` - DB schema
7. `src/components/ui/dialog.tsx` - Dialog component
8. `src/components/ui/form.tsx` - Form components
9. `src/components/ui/input.tsx` - Input component
10. `src/components/ui/textarea.tsx` - Textarea component
11. `src/App.tsx` - Router setup

## F) DESIGN DECISIONS

**Path A Selected**: Backend persists to DB; frontend calls backend REST endpoint
- ✅ Backend already has `/api/clients` GET routes
- ✅ Backend uses Supabase service-role key (secure)
- ✅ Frontend already uses React Query for data fetching
- ✅ Pattern consistent with existing `/api/import/excel` endpoint

**Field Mapping**:
- `name` → `last_name` (required) + `first_name` (optional, for full name)
- `phone_number` → `phone` (validate as required in backend, even though DB allows NULL)
- `email` → `email` (optional)
- `description` → `notes` (optional)

**No DB Migration Needed**: Existing columns can accommodate requirements with backend validation.
