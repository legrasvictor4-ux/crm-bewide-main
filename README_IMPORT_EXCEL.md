# 📊 Système d'Import Excel - Documentation Complète

## 🎯 Vue d'ensemble

Le système d'import Excel a été entièrement implémenté pour remplacer toutes les données mockées par un système réel basé sur Supabase (PostgreSQL).

## ✅ Ce qui a été fait

### 1. Base de données
- ✅ Table `clients` créée avec tous les champs nécessaires
- ✅ Support pour l'enrichissement OpenAI
- ✅ Index pour les performances
- ✅ Migration SQL prête à exécuter

### 2. Backend API
- ✅ Route `/api/import/excel` - Import Excel avec validation
- ✅ Route `/api/clients` - Liste des clients
- ✅ Route `/api/clients/:id` - Détail d'un client
- ✅ Enrichissement OpenAI automatique (optionnel)
- ✅ Validation complète des données

### 3. Frontend
- ✅ Composant `ExcelUpload` - Interface d'upload
- ✅ `ProspectionList` connecté à la base de données
- ✅ Bouton "Enregistrer dans la base de données"
- ✅ Refresh automatique après import
- ✅ Gestion d'erreurs complète

### 4. Données mockées supprimées
- ✅ `ProspectionList.tsx` - Plus de mockData
- ✅ `SpeedProspecting.tsx` - Plus de mockProspects
- ✅ `api-server.mjs` - Plus de mock processing

## 🚀 Démarrage Rapide

### Étape 1: Créer la table dans Supabase

1. Connectez-vous à votre projet Supabase
2. Allez dans SQL Editor
3. Exécutez le contenu de `supabase/migrations/001_create_clients_table.sql`

### Étape 2: Configurer les variables d'environnement

**Backend** (`.env` ou variables système):
```env
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
OPENAI_API_KEY=sk-... (optionnel, pour enrichissement)
PORT=3000
```

**Frontend** (`.env`):
```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre_anon_key
```

### Étape 3: Installer les dépendances

```bash
npm install
```

### Étape 4: Démarrer l'application

```bash
# Démarrer backend et frontend
npm run dev

# Ou séparément:
npm run dev:backend  # Port 3000
npm run dev:frontend # Port 8080
```

### Étape 5: Importer des clients

1. Ouvrez `http://localhost:8080`
2. Cliquez sur "Importer un fichier Excel"
3. Sélectionnez un fichier Excel avec les colonnes requises
4. Optionnel: Cochez "Enrichir automatiquement avec OpenAI"
5. Cliquez sur "Enregistrer dans la base de données"
6. Les clients apparaissent dans la liste de prospection

## 📋 Format Excel Requis

### Colonnes Obligatoires
- **`last_name`** (ou `nom`) - Nom de famille du client

### Colonnes Optionnelles
- `first_name` (ou `prénom`, `prenom`)
- `email` (ou `e-mail`, `mail`)
- `phone` (ou `téléphone`, `telephone`, `tel`)
- `company` (ou `entreprise`, `société`)
- `address` (ou `adresse`)
- `postal_code` (ou `code postal`)
- `city` (ou `ville`)
- `arrondissement` (ou `arr`)
- `contact` (ou `contact person`)
- `notes` (ou `note`, `commentaires`)

**Note**: Le mapping est flexible et case-insensitive. Les variantes françaises/anglaises sont supportées.

### Exemple de fichier Excel

| last_name | first_name | email | phone | company | city |
|-----------|------------|-------|-------|---------|------|
| Dupont | Jean | jean@example.com | +33 6 12 34 56 78 | Le Petit Bistrot | Paris |
| Martin | Marie | marie@example.com | +33 6 98 76 54 32 | Café de Flore | Paris |

## 🔧 API Endpoints

### POST /api/import/excel
Importe un fichier Excel et sauvegarde les clients en base de données.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `file`: Fichier Excel (.xlsx, .xls, .csv)
  - `enrich`: `true` ou `false` (optionnel, pour enrichissement OpenAI)

**Response:**
```json
{
  "success": true,
  "message": "Successfully imported 5 client(s)",
  "count": 5,
  "totalRows": 5,
  "validRows": 5,
  "invalidRows": 0,
  "clients": [...],
  "validationErrors": [] // Si des erreurs
}
```

### GET /api/clients
Récupère la liste des clients.

**Query Parameters:**
- `status`: Filtrer par statut (`new`, `success`, `pending`, `lost`, `to_recontact`, `all`)
- `limit`: Nombre de résultats (défaut: 100)
- `offset`: Décalage pour pagination (défaut: 0)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "clients": [...]
}
```

### GET /api/clients/:id
Récupère les détails d'un client spécifique.

**Response:**
```json
{
  "success": true,
  "client": {
    "id": "uuid",
    "last_name": "Dupont",
    "first_name": "Jean",
    "email": "jean@example.com",
    ...
  }
}
```

## 🤖 Enrichissement OpenAI

L'enrichissement automatique est disponible en option lors de l'import. Il génère:
- Description de l'entreprise
- Segmentation marché
- Score de lead (0-100)

Pour activer:
1. Cochez "Enrichir automatiquement avec OpenAI" lors de l'upload
2. Configurez `OPENAI_API_KEY` dans les variables d'environnement backend

**Note**: L'enrichissement se fait en arrière-plan et n'affecte pas le temps de réponse de l'import.

## 🐛 Dépannage

### Erreur: "Database not configured"
- Vérifiez que `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont définis
- Utilisez la Service Role Key (pas l'Anon Key) pour le backend

### Erreur: "Failed to parse Excel file"
- Vérifiez que le fichier est bien un .xlsx, .xls ou .csv valide
- Essayez de réenregistrer le fichier Excel

### Erreur: "Missing required columns"
- Vérifiez que la colonne `last_name` (ou `nom`) existe
- Les noms de colonnes sont case-insensitive

### Les clients n'apparaissent pas après import
- Vérifiez la console du navigateur pour les erreurs
- Vérifiez que la table `clients` existe dans Supabase
- Vérifiez les logs du backend pour les erreurs de base de données

## 📝 Fichiers Importants

- `supabase/migrations/001_create_clients_table.sql` - Schéma de base de données
- `api-server.mjs` - Backend API avec routes Excel
- `src/components/ExcelUpload.tsx` - Composant d'upload Excel
- `src/components/ProspectionList.tsx` - Liste connectée à la DB
- `src/integrations/supabase/types.ts` - Types TypeScript pour Supabase

## 🎯 Prochaines Étapes

1. ✅ Exécuter la migration SQL dans Supabase
2. ✅ Configurer les variables d'environnement
3. ✅ Tester l'import avec un fichier Excel de test
4. ⏳ Mettre à jour les autres composants (SmartDialQueue, AutoLogActivity, etc.) pour utiliser la DB

## 📚 Documentation Supplémentaire

- `INVENTAIRE_REPOSITORY.md` - Inventaire complet du repository
- `IMPLEMENTATION_SUMMARY.md` - Résumé technique de l'implémentation
