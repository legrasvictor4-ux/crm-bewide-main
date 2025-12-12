# ✅ Vérification de la Base de Données

## Méthode 1: Via l'API (Recommandé)

### Étape 1: Démarrer le backend

```bash
npm run dev:backend
```

Le serveur démarre sur `http://localhost:3000`

### Étape 2: Vérifier l'état de la base de données

**Option A: Via curl (Terminal)**
```bash
curl http://localhost:3000/api/setup/database
```

**Option B: Via navigateur**
Ouvrez: `http://localhost:3000/api/setup/database`

**Option C: Via PowerShell (Windows)**
```powershell
Invoke-WebRequest -Uri http://localhost:3000/api/setup/database | Select-Object -ExpandProperty Content
```

### Réponse si la table existe:
```json
{
  "success": true,
  "message": "Table clients already exists",
  "tableExists": true
}
```

### Réponse si la table n'existe pas:
```json
{
  "success": false,
  "message": "Table does not exist. Please execute the SQL below...",
  "tableExists": false,
  "sql": "CREATE TABLE IF NOT EXISTS...",
  "instructions": [...]
}
```

## Méthode 2: Vérifier directement via Supabase

```bash
curl 'https://[VOTRE_PROJET].supabase.co/rest/v1/clients?select=id&limit=1' \
  -H "apikey: [VOTRE_ANON_KEY]"
```

**Si la table existe:** Vous obtiendrez `[]` ou `[{...}]`  
**Si la table n'existe pas:** Erreur `relation "clients" does not exist`

## Méthode 3: Test complet

```bash
# 1. Vérifier l'état
curl http://localhost:3000/api/setup/database

# 2. Tester l'endpoint clients (doit fonctionner si table existe)
curl http://localhost:3000/api/clients

# 3. Vérifier la santé du serveur
curl http://localhost:3000/api/health
```

## 🐛 Dépannage

### Erreur: "Database not configured"
- Vérifiez que `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont définis
- Créez un fichier `.env` à la racine avec:
  ```env
  SUPABASE_URL=https://votre-projet.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
  ```

### Erreur: "ECONNREFUSED" ou "Cannot connect"
- Vérifiez que le backend est démarré: `npm run dev:backend`
- Vérifiez que le port 3000 n'est pas utilisé par un autre processus

### La table n'existe pas
- Copiez le SQL retourné par l'API
- Exécutez-le dans Supabase SQL Editor ou via un client PostgreSQL
- Voir `SETUP_DATABASE.md` pour plus d'options

## 📝 Prochaines Étapes

Une fois la table créée:
1. ✅ Vérifiez avec `curl http://localhost:3000/api/setup/database`
2. ✅ Testez l'import Excel: `npm run dev` puis importez un fichier
3. ✅ Vérifiez que les clients apparaissent dans la liste


