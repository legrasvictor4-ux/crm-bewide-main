import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { whitelistClientRecord, sanitizeClientPayload } from './dbUtils.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'temp_uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const relativePath = file.originalname.replace(/\\/g, '/');
    cb(null, `${crypto.randomUUID()}_${path.basename(relativePath)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
});

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

    for (const file of req.files) {
      try {
        const fileInfo = extractFileInfo(file.originalname);
        const content = fs.readFileSync(file.path, 'utf-8');
        const clientData = processClientFile(content, fileInfo);

        results.clients.push({
          id: clientData.id || crypto.randomUUID(),
          last_name: clientData.last_name || 'Client sans nom',
          status: clientData.status || 'prospect',
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
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          console.error(`Erreur lors de la suppression du fichier temporaire ${file.path}:`, e);
        }
      }
    }

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

function extractFileInfo(filePath) {
  const pathParts = filePath.split(/[\\/]/);
  const fileName = path.basename(filePath);
  const clientName = pathParts.length > 1 ? pathParts[pathParts.length - 2] : null;
  return {
    fileName,
    clientName,
    extension: path.extname(filePath).toLowerCase(),
    directory: path.dirname(filePath)
  };
}

function processClientFile(content, fileInfo) {
  let raw = {};
  try {
    raw = JSON.parse(content);
  } catch (e) {
    raw = {
      name: fileInfo.clientName,
      notes: content,
      sourceFile: fileInfo.fileName
    };
  }

  const mapped = {
    last_name: raw.name || raw.last_name || fileInfo.clientName || 'Client sans nom',
    email: raw.email || null,
    phone: raw.phone || raw.telephone || null,
    address: raw.address || raw.adresse || null,
    company: raw.company || raw.societe || null,
    status: raw.status || 'prospect',
    notes: raw.notes || '',
    source_file: raw.sourceFile || fileInfo.fileName || null,
    imported_at: new Date().toISOString(),
    metadata: { importDate: new Date().toISOString(), sourceFile: fileInfo.fileName },
  };

  const clean = sanitizeClientPayload(mapped);
  clean.id = raw.id || crypto.randomUUID();

  return clean;
}

export default router;
