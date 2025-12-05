# Nouvelles fonctionnalités AI pour le CRM

## 1. Analyse d'appels en temps réel

### Fichiers ajoutés :
- `src/ai/callListener.js` - Écoute les appels en temps réel
- `src/ai/analyzer.js` - Analyse les transcriptions et génère des insights
- `src/ai/index.js` - Point d'entrée pour les fonctionnalités AI

### Fonctionnalités :
- Écoute en temps réel des appels téléphoniques
- Transcription automatique des conversations
- Analyse du sentiment et détection d'objections
- Calcul du niveau d'intérêt du client
- Génération de scripts de suivi personnalisés

### Comment l'utiliser :
1. L'analyse démarre automatiquement sur les pages d'appel (`/call/*`)
2. Un indicateur visuel apparaît en bas à droite pendant l'écoute
3. Les analyses en temps réel sont disponibles dans la console du navigateur
4. Un résumé complet est généré à la fin de chaque appel

---

## 2. Importation de dossiers clients

### Fichiers ajoutés :
- `src/upload/FolderUpload.jsx` - Composant React pour l'interface d'upload
- `src/backend/batchImportRoute.js` - Gestionnaire d'importation côté serveur

### Fonctionnalités :
- Glisser-déposer de dossiers entiers
- Barre de progression en temps réel
- Gestion des erreurs et rapports détaillés
- Traitement par lots des fichiers clients

### Comment l'utiliser :
1. Accédez à la section d'importation dans l'interface d'administration
2. Glissez-déposez un dossier ou cliquez pour sélectionner
3. Suivez la progression de l'importation
4. Consultez le rapport de fin d'importation

---

## 3. Règles de développement

### Principes clés :
1. **Aucune modification du code existant**
   - Toutes les nouvelles fonctionnalités sont ajoutées dans de nouveaux fichiers
   - Aucun fichier existant n'a été modifié

2. **Architecture modulaire**
   - Chaque composant est autonome et peut être désactivé sans affecter les autres
   - Communication via des événements personnalisés

3. **Extensibilité**
   - Facile d'ajouter de nouvelles analyses ou traitements
   - API clairement définie pour chaque module

---

## 4. Prochaines étapes

### Améliorations potentielles :
- Intégration avec le système de notification existant
- Tableau de bord d'analyse des appels
- Modèles d'IA personnalisés pour des secteurs spécifiques
- Export des analyses au format PDF

### Personnalisation :
- Modifiez les paramètres dans `src/ai/analyzer.js` pour ajuster :
  - Les seuils de détection d'intérêt
  - Les mots-clés d'objection
  - Les modèles de réponses

---

## 5. Dépannage

### Problèmes courants :
1. **L'analyse d'appel ne démarre pas**
   - Vérifiez que vous êtes sur une page d'appel (`/call/*`)
   - Vérifiez les autorisations du microphone dans le navigateur
   - Consultez la console du navigateur pour les erreurs

2. **Échec de l'importation de dossiers**
   - Vérifiez la taille des fichiers (max 50MB par fichier)
   - Assurez-vous d'avoir les permissions nécessaires
   - Consultez les journaux du serveur pour plus de détails

3. **Performances**
   - Pour les gros volumes de données, envisagez un traitement par lots
   - Optimisez les modèles d'IA pour des temps de réponse plus rapides

---

## 6. Sécurité

- Toutes les données audio sont traitées localement dans le navigateur
- Les transcriptions sont chiffrées avant d'être envoyées au serveur
- Les fichiers temporaires sont supprimés après traitement
- Les jetons d'accès sont gérés de manière sécurisée

---

Pour toute question ou assistance, veuillez contiquer l'équipe de développement.
