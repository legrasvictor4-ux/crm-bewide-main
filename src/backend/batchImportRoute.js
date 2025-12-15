// batchImportRoute.js - Gestionnaire d'importation de dossiers clients
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

const router = express.Router();

// Configuration du stockage des fichiers temporaires
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'temp_uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Conserver la structure de dossiers dans le nom du fichier
    const relativePath = file.originalname.replace(/\\/g, '/');
    cb(null, `${randomUUID()}_${path.basename(relativePath)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max par fichier
  fileFilter: (req, file, cb) => {
    // Accepter tous les types de fichiers pour l'instant
    cb(null, true);
  }
});

// Middleware pour gérer les erreurs d'upload
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        success: false, 
        error: 'Fichier trop volumineux (max 50MB par fichier)' 
      });
    }
    return res.status(400).json({ 
      success: false, 
      error: 'Erreur lors du téléchargement du fichier' 
    });
  } else if (err) {
    return res.status(500).json({ 
      success: false, 
      error: 'Erreur serveur lors du traitement du fichier' 
    });
  }
  next();
};

// Endpoint pour l'upload de dossiers
router.post('/folder', upload.array('files'), handleUploadErrors, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Aucun fichier téléchargé' 
      });
    }

    const results = {
      totalFiles: req.files.length,
      processed: 0,
      errors: 0,
      clients: [],
      errorDetails: []
    };

    // Traiter chaque fichier téléchargé
    for (const file of req.files) {
      try {
        // Extraire les informations du chemin du fichier
        const fileInfo = extractFileInfo(file.originalname);
        
        // Lire et traiter le contenu du fichier
        const content = fs.readFileSync(file.path, 'utf-8');
        const clientData = await processClientFile(content, fileInfo);
        
        // Ici, vous devriez ajouter la logique pour sauvegarder dans votre base de données
        // Par exemple : await saveClientToDatabase(clientData);
        
        results.clients.push({
          id: clientData.id || uuidv4(),
          name: clientData.name || 'Client sans nom',
          status: 'imported',
          file: file.originalname
        });
        
        results.processed++;
      } catch (error) {
        console.error(`Erreur lors du traitement du fichier ${file.originalname}:`, error);
        results.errors++;
        results.errorDetails.push({
          file: file.originalname,
          error: error.message
        });
      } finally {
        // Nettoyer le fichier temporaire
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          console.error(`Erreur lors de la suppression du fichier temporaire ${file.path}:`, e);
        }
      }
    }

    // Répondre avec les résultats
    res.json({
      success: true,
      message: `Import terminé avec succès (${results.processed} clients importés, ${results.errors} erreurs)`,
      ...results
    });

  } catch (error) {
    console.error('Erreur lors du traitement du lot:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors du traitement du lot',
      details: error.message 
    });
  }
});

// Fonction pour extraire les informations du fichier à partir du chemin
function extractFileInfo(filePath) {
  const pathParts = filePath.split(/[\\/]/);
  const fileName = path.basename(filePath);
  
  // Exemple: extraire le nom du client du chemin du dossier
  // Cela dépend de votre structure de dossiers
  const clientName = pathParts.length > 1 ? pathParts[pathParts.length - 2] : null;
  
  return {
    fileName,
    clientName,
    extension: path.extname(filePath).toLowerCase(),
    directory: path.dirname(filePath)
  };
}

// Fonction pour traiter le contenu d'un fichier client
async function processClientFile(content, fileInfo) {
  // Cette fonction doit être adaptée selon le format de vos fichiers clients
  // Voici un exemple basique pour un fichier JSON ou texte
  
  let clientData = {};
  
  try {
    // Essayer de parser comme JSON
    clientData = JSON.parse(content);
  } catch (e) {
    // Si ce n'est pas du JSON, traiter comme du texte brut
    clientData = {
      name: fileInfo.clientName || 'Client inconnu',
      notes: content,
      sourceFile: fileInfo.fileName
    };
  }
  
  // Normaliser les données du client
  return {
    id: clientData.id || uuidv4(),
    name: clientData.name || fileInfo.clientName || 'Client sans nom',
    email: clientData.email || null,
    phone: clientData.phone || clientData.telephone || null,
    address: clientData.address || clientData.adresse || null,
    company: clientData.company || clientData.societe || null,
    position: clientData.position || clientData.poste || null,
    status: clientData.status || 'new',
    tags: Array.isArray(clientData.tags) ? clientData.tags : [],
    notes: clientData.notes || '',
    metadata: {
      importDate: new Date().toISOString(),
      sourceFile: fileInfo.fileName,
      ...(clientData.metadata || {})
    },
    // Conserver les données brutes pour référence
    _raw: clientData
  };
}

export default router;
