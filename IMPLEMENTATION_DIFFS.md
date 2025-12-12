# IMPLEMENTATION DIFFS - Manual Client Creation Feature

## Fichiers Modifiés

### 1. `api-server.mjs` - Ajout endpoint POST /api/clients

**Position**: Après `GET /api/clients` (ligne ~597), avant `GET /api/clients/:id`

```diff
+// Create client endpoint
+app.post('/api/clients', async (req, res, next) => {
+  try {
+    if (!supabase) {
+      return res.status(500).json({
+        success: false,
+        error: 'Database not configured'
+      });
+    }
+
+    const { name, phone_number, email, description } = req.body;
+
+    // Server-side validation
+    const errors = [];
+
+    if (!name || typeof name !== 'string' || name.trim().length === 0) {
+      errors.push('name is required and must be a non-empty string');
+    }
+
+    if (!phone_number || typeof phone_number !== 'string' || phone_number.trim().length === 0) {
+      errors.push('phone_number is required and must be a non-empty string');
+    }
+
+    if (email && typeof email === 'string' && email.trim().length > 0) {
+      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
+      if (!emailRegex.test(email.trim())) {
+        errors.push('email must be a valid email address');
+      }
+    }
+
+    if (description && typeof description === 'string' && description.length > 10000) {
+      errors.push('description must be less than 10000 characters');
+    }
+
+    if (errors.length > 0) {
+      return res.status(400).json({
+        success: false,
+        error: 'Validation failed',
+        validationErrors: errors
+      });
+    }
+
+    // Prepare client data for database
+    // Map name to last_name (required), first_name can be empty
+    // If name contains space, split it; otherwise use as last_name
+    const nameParts = name.trim().split(/\s+/);
+    const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : null;
+    const lastName = nameParts[nameParts.length - 1];
+
+    const clientData = {
+      last_name: lastName,
+      first_name: firstName,
+      phone: phone_number.trim(),
+      email: email && email.trim().length > 0 ? email.trim() : null,
+      notes: description && description.trim().length > 0 ? description.trim() : null,
+      status: 'new'
+    };
+
+    // Insert into database
+    const { data, error } = await supabase
+      .from('clients')
+      .insert(clientData)
+      .select()
+      .single();
+
+    if (error) {
+      console.error(`[${new Date().toISOString()}] Database insert error:`, error);
+      throw error;
+    }
+
+    console.log(`[${new Date().toISOString()}] Created client: ${data.id} (${lastName})`);
+
+    res.status(201).json({
+      success: true,
+      message: 'Client created successfully',
+      client: data
+    });
+  } catch (error) {
+    next(error);
+  }
+});
```

### 2. `src/components/AddClientDialog.tsx` - Nouveau fichier

**Fichier créé**: Composant dialog avec formulaire de création client

- Utilise shadcn/ui Dialog, Input, Textarea, Button, Label
- Validation côté client (required fields, email format)
- Utilise React Query `useMutation` pour appeler l'API
- Invalide la query `['clients']` après succès pour rafraîchir la liste
- Gestion d'erreurs avec toast notifications

### 3. `src/components/ProspectionList.tsx` - Ajout bouton et dialog

**Modifications**:

```diff
+import { Plus } from "lucide-react";
+import AddClientDialog from "@/components/AddClientDialog";

 const ProspectionList = ({ refreshTrigger }: { refreshTrigger?: number }) => {
   const [filter, setFilter] = useState<string>("all");
   const [selectedProspection, setSelectedProspection] = useState<Prospection | null>(null);
+  const [showAddDialog, setShowAddDialog] = useState(false);

   // ... existing code ...

   return (
     <div className="relative bg-card rounded-xl shadow-md border border-border">
       {/* ... existing code ... */}
       
       {/* Header */}
       <div className="p-6 border-b border-border">
-        <h2 className="text-xl font-bold text-foreground mb-4">Prospections</h2>
+        <div className="flex items-center justify-between mb-4">
+          <h2 className="text-xl font-bold text-foreground">Prospections</h2>
+          <Button onClick={() => setShowAddDialog(true)} size="sm" className="gap-2">
+            <Plus className="h-4 w-4" />
+            Ajouter un client
+          </Button>
+        </div>
         <div className="flex gap-2 flex-wrap">
           {/* ... existing filter buttons ... */}
         </div>
       </div>

       {/* ... existing list code ... */}

+      {/* Add Client Dialog */}
+      <AddClientDialog
+        open={showAddDialog}
+        onOpenChange={setShowAddDialog}
+        onSuccess={() => {
+          refetch();
+        }}
+      />
     </div>
   );
 };
```

## Mapping des Champs

| Requirement | DB Column | Notes |
|------------|-----------|-------|
| `name` (required) | `last_name` (NOT NULL) + `first_name` (nullable) | Split name on spaces: last part → last_name, rest → first_name |
| `phone_number` (required) | `phone` | Validated as required in backend (DB allows NULL but backend enforces) |
| `email` (optional) | `email` | Validated format if provided |
| `description` (optional) | `notes` | Max 10000 chars |

## Validation

### Client-side (AddClientDialog.tsx)
- `name`: Required, non-empty string
- `phone_number`: Required, non-empty string
- `email`: Optional, validated format if provided
- `description`: Optional, max 10000 characters

### Server-side (api-server.mjs POST /api/clients)
- `name`: Required, non-empty string
- `phone_number`: Required, non-empty string
- `email`: Optional, validated format if provided
- `description`: Optional, max 10000 characters
- Returns 400 with `validationErrors` array on failure

## Refresh Mechanism

1. **React Query Mutation**: `useMutation` in AddClientDialog
2. **Query Invalidation**: `queryClient.invalidateQueries({ queryKey: ['clients'] })`
3. **Manual Refetch**: Also calls `refetch()` from ProspectionList query
4. **Result**: List automatically updates with new client

## API Endpoint

**POST /api/clients**

**Request Body**:
```json
{
  "name": "Jean Dupont",
  "phone_number": "+33 6 12 34 56 78",
  "email": "jean@example.com",
  "description": "Client intéressé par nos services"
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "message": "Client created successfully",
  "client": {
    "id": "uuid",
    "last_name": "Dupont",
    "first_name": "Jean",
    "phone": "+33 6 12 34 56 78",
    "email": "jean@example.com",
    "notes": "Client intéressé par nos services",
    "status": "new",
    ...
  }
}
```

**Error Response (400)**:
```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": [
    "name is required and must be a non-empty string",
    "phone_number is required and must be a non-empty string"
  ]
}
```

## Tests Manuels

### 1. Test Création Client
```bash
# Démarrer backend
npm run dev:backend

# Dans un autre terminal, tester l'endpoint
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Client",
    "phone_number": "+33 6 12 34 56 78",
    "email": "test@example.com",
    "description": "Client de test"
  }'
```

### 2. Test Validation
```bash
# Test avec champs manquants
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "",
    "phone_number": ""
  }'
# Devrait retourner 400 avec validationErrors
```

### 3. Test Frontend
1. Démarrer l'application: `npm run dev`
2. Aller sur la page d'accueil (`/`)
3. Cliquer sur "Ajouter un client" dans ProspectionList
4. Remplir le formulaire:
   - Nom: "Test Client"
   - Téléphone: "+33 6 12 34 56 78"
   - Email: "test@example.com" (optionnel)
   - Description: "Client de test" (optionnel)
5. Cliquer sur "Créer le client"
6. Vérifier que le client apparaît immédiatement dans la liste

### 4. Test Validation Frontend
1. Ouvrir le dialog "Ajouter un client"
2. Ne pas remplir les champs requis
3. Cliquer sur "Créer le client"
4. Vérifier que les erreurs de validation s'affichent
5. Remplir les champs requis
6. Vérifier que les erreurs disparaissent

## Fichiers Créés

1. `src/components/AddClientDialog.tsx` - Nouveau composant dialog

## Fichiers Modifiés

1. `api-server.mjs` - Ajout POST /api/clients
2. `src/components/ProspectionList.tsx` - Ajout bouton et intégration dialog

## Fichiers Inspectés (Non Modifiés)

1. `package.json` - Vérification dépendances
2. `src/pages/Index.tsx` - Page Prospection
3. `src/integrations/supabase/types.ts` - Types DB
4. `supabase/migrations/001_create_clients_table.sql` - Schéma DB
5. `src/components/ui/dialog.tsx` - Composant Dialog
6. `src/components/ui/form.tsx` - Composants Form
7. `src/components/ui/input.tsx` - Composant Input
8. `src/components/ui/textarea.tsx` - Composant Textarea
9. `src/components/ui/label.tsx` - Composant Label


