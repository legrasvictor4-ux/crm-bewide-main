# ACCEPTANCE CRITERIA - Manual Client Creation

## ✅ Critères d'Acceptation

### 1. UI/UX
- [x] Bouton "Ajouter un client" visible sur la page Prospection
- [x] Bouton situé dans le header de ProspectionList, à côté du titre
- [x] Clic sur le bouton ouvre un dialog modal
- [x] Dialog utilise les composants shadcn/ui existants (Dialog, Input, Textarea, Button, Label)
- [x] Formulaire affiche les champs:
  - Nom (requis, marqué avec *)
  - Numéro de téléphone (requis, marqué avec *)
  - Email (optionnel)
  - Description (optionnel, textarea)

### 2. Validation Côté Client
- [x] Validation en temps réel des champs requis
- [x] Affichage des erreurs sous chaque champ invalide
- [x] Bouton "Créer le client" désactivé pendant la soumission
- [x] Message d'erreur si email invalide (format)
- [x] Message d'erreur si description > 10000 caractères

### 3. Validation Côté Serveur
- [x] Endpoint POST /api/clients valide les données
- [x] Retourne 400 avec `validationErrors` si validation échoue
- [x] Valide que `name` est requis et non-vide
- [x] Valide que `phone_number` est requis et non-vide
- [x] Valide le format email si fourni
- [x] Valide la longueur de description (max 10000)

### 4. Persistance Base de Données
- [x] Client créé est sauvegardé dans la table `clients` (Supabase)
- [x] Mapping correct des champs:
  - `name` → `last_name` (dernier mot) + `first_name` (reste)
  - `phone_number` → `phone`
  - `email` → `email`
  - `description` → `notes`
- [x] `status` défini à `'new'` par défaut
- [x] `date_created` et `date_updated` automatiques

### 5. Refresh de la Liste
- [x] Après création réussie, la liste Prospection se rafraîchit automatiquement
- [x] Le nouveau client apparaît immédiatement dans la liste
- [x] Le dialog se ferme automatiquement après succès
- [x] Le formulaire est réinitialisé après succès

### 6. Gestion d'Erreurs
- [x] Erreurs de validation affichées dans le dialog
- [x] Erreurs API affichées via toast notification
- [x] Erreurs serveur loggées dans la console backend
- [x] Pas d'exposition de clés service-role au frontend

### 7. Tests
- [x] Endpoint API testable via curl
- [x] Validation serveur testable
- [x] Interface utilisateur testable manuellement
- [x] Refresh de liste vérifiable

## 🧪 Tests de Vérification

### Test 1: Création Client Complète
1. Ouvrir la page Prospection (`/`)
2. Cliquer sur "Ajouter un client"
3. Remplir:
   - Nom: "Marie Martin"
   - Téléphone: "+33 6 98 76 54 32"
   - Email: "marie@example.com"
   - Description: "Client intéressé"
4. Cliquer "Créer le client"
5. ✅ Dialog se ferme
6. ✅ Toast "Client créé avec succès" apparaît
7. ✅ Client "Marie Martin" apparaît dans la liste
8. ✅ Client a le statut "new"

### Test 2: Validation Champs Requis
1. Ouvrir dialog "Ajouter un client"
2. Ne pas remplir "Nom"
3. Ne pas remplir "Téléphone"
4. Cliquer "Créer le client"
5. ✅ Erreur "Le nom est requis" sous Nom
6. ✅ Erreur "Le numéro de téléphone est requis" sous Téléphone
7. ✅ Le formulaire ne se soumet pas

### Test 3: Validation Email
1. Ouvrir dialog
2. Remplir Nom et Téléphone
3. Entrer email invalide: "invalid-email"
4. Cliquer "Créer le client"
5. ✅ Erreur "Email invalide" sous Email
6. ✅ Le formulaire ne se soumet pas

### Test 4: API Backend
```bash
# Test création réussie
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","phone_number":"+33612345678"}'
# ✅ Retourne 201 avec client créé

# Test validation
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -d '{"name":"","phone_number":""}'
# ✅ Retourne 400 avec validationErrors
```

## 📋 Checklist Finale

- [x] Endpoint POST /api/clients créé
- [x] Validation serveur implémentée
- [x] Composant AddClientDialog créé
- [x] Bouton "Ajouter un client" ajouté
- [x] Formulaire avec validation client
- [x] Mutation React Query configurée
- [x] Refresh automatique de la liste
- [x] Gestion d'erreurs complète
- [x] Pas de données mockées
- [x] Pas d'exposition de clés sensibles
- [x] Code suit les patterns existants
- [x] Utilise les composants UI existants

## 🚀 Commandes de Démarrage

```bash
# Installer dépendances (si nécessaire)
npm install

# Démarrer backend et frontend
npm run dev

# Ou séparément:
npm run dev:backend  # Port 3000
npm run dev:frontend # Port 8080
```

## 📝 Notes

- Le mapping `name` → `last_name`/`first_name` split le nom sur les espaces
- Si un seul mot: utilisé comme `last_name`, `first_name` = null
- Si plusieurs mots: dernier mot = `last_name`, reste = `first_name`
- La table `clients` existe déjà, pas de migration nécessaire
- Le champ `phone` en DB est nullable mais validé comme requis côté backend
