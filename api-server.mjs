// Safe dotenv loader for ESM; wrapped to avoid hard crashes if missing in production
if (!process.env.DISABLE_DOTENV) {
  try {
    const dotenv = await import('dotenv');
    dotenv.config();
  } catch (err) {
    console.warn('[WARN] dotenv not installed or failed to load. Proceeding with process env only.');
  }
}
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import folderUploadRouter from './src/backend/batchImportRoute.js';
import { computeLeadScore } from './server/leadScoreService.js';
import { validateContact } from './src/backend/validation/contactSchema.js';
import { extractFieldsFromTranscript, findMatchByCompanyOrContact, buildProspectFromTranscript } from './src/backend/voiceUtils.js';
import { createVoiceRouter } from './src/backend/voiceController.js';
import { appointmentRequestSchema, detectConflicts } from './src/backend/scheduling.js';
import { planRequestSchema, planDay } from './src/backend/planning.js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[WARNING] Supabase credentials not found. Database operations will use in-memory fallback if enabled.');
}
if (supabaseKey && !process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[WARNING] Using a non-service Supabase key; write operations may fail if RLS is enabled.');
}
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Lightweight in-memory store used when Supabase credentials are not provided (useful for tests)
let useMemoryStore = process.env.TEST_MODE === 'memory' || (!supabase && process.env.ALLOW_MEMORY_DB !== 'false');

if (!supabase && useMemoryStore) {
  console.warn('[WARNING] Running with in-memory database. Data will not persist. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable persistence.');
}
const memoryClients = [];

const memoryDb = {
  insertClient: (client) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newClient = {
      id,
      date_created: now,
      date_updated: now,
      ...client,
    };
    memoryClients.unshift(newClient);
    return newClient;
  },
  insertClients: (clients = []) => clients.map(memoryDb.insertClient),
  listClients: ({ status, limit, offset }) => {
    let data = [...memoryClients];
    if (status && status !== 'all') {
      data = data.filter(c => c.status === status);
    }
    return data.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  },
  getClient: (id) => memoryClients.find(c => c.id === id) || null,
  leadScores: ({ limit, minScore }) => {
    return [...memoryClients]
      .filter(c => (c.lead_score ?? 0) >= minScore)
      .sort((a, b) => (b.lead_score ?? 0) - (a.lead_score ?? 0))
      .slice(0, limit);
  }
};

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Mount folder upload routes (uses disk storage for nested folder imports)
app.use('/api/upload', folderUploadRouter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Setup database endpoint - Vérifie si la table existe et affiche le SQL si nécessaire
app.get('/api/setup/database', async (req, res, next) => {
  try {
    if (!supabase && !useMemoryStore) {
      console.warn('[WARN] Supabase not configured; enabling in-memory fallback for import.');
      useMemoryStore = true;
    }

    // Vérifier si la table existe
    const { data: existingTable, error: checkError } = await supabase
      .from('clients')
      .select('id')
      .limit(1);

    if (!checkError) {
      return res.status(200).json({
        success: true,
        message: 'Table clients already exists',
        tableExists: true
      });
    }

    // Si la table n'existe pas, afficher le SQL à exécuter
    const sql = `
-- Créer la table clients
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  arrondissement TEXT,
  contact TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'success', 'pending', 'lost', 'to_recontact')),
  notes TEXT,
  next_action TEXT,
  date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  imported_at TIMESTAMP WITH TIME ZONE,
  source_file TEXT,
  enrichment_data JSONB,
  business_description TEXT,
  segmentation TEXT,
  lead_score INTEGER,
  enriched_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_company ON public.clients(company) WHERE company IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_date_created ON public.clients(date_created DESC);

-- Trigger pour date_updated
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_updated = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

    res.status(200).json({
      success: false,
      message: 'Table does not exist. Please execute the SQL below in Supabase SQL Editor.',
      tableExists: false,
      sql: sql,
      instructions: [
        '1. Copy the SQL above',
        '2. Go to your Supabase project',
        '3. Open SQL Editor',
        '4. Paste and execute the SQL',
        '5. Or run: npm run setup:db to see the SQL'
      ]
    });
  } catch (error) {
    next(error);
  }
});

// Excel import endpoint
app.get('/api/import/excel', (_req, res) => {
  // Helpful hint instead of 404 when the endpoint is visited via GET
  return res.status(200).json({
    success: false,
    error: 'Use POST multipart/form-data with field "file" to import Excel/CSV.',
    expectedField: 'file',
    note: 'Endpoint ready',
  });
});
app.post('/api/import/excel', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    if (!supabase && !useMemoryStore) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
      });
    }

    const { enrich = false } = req.body; // Option to enrich with OpenAI

    // Parse Excel file
    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        error: 'Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.'
      });
    }

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Build header-aware data even if the first visible row is blank/styled
    const headerRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
    let headerIndex = -1;
    let bestCount = 0;
    headerRows.forEach((row, idx) => {
      const count = (row || []).reduce((acc, cell) => acc + (String(cell ?? '').trim() === '' ? 0 : 1), 0);
      if (count > bestCount) {
        bestCount = count;
        headerIndex = idx;
      }
    });
    const rawHeaderRow = headerIndex >= 0 ? headerRows[headerIndex] : [];
    const headerRow = (rawHeaderRow || []).map((cell, idx) => {
      const val = String(cell ?? '').trim();
      return val === '' ? `col_${idx + 1}` : val;
    });
    const data = XLSX.utils.sheet_to_json(worksheet, {
      header: headerRow,
      raw: false,
      range: headerIndex + 1 // start after header row
    });

    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Excel file is empty or has no data rows'
      });
    }

    // Expected headers (case-insensitive mapping)
    const headerMap = {
      'first_name': ['first_name', 'prénom', 'prenom', 'firstname', 'nom'],
      'last_name': ['last_name', 'nom', 'name', 'lastname', 'nom de famille'],
      'email': ['email', 'e-mail', 'mail', 'courriel'],
      'phone': ['phone', 'téléphone', 'telephone', 'tel', 'mobile'],
      'company': ['company', 'entreprise', 'société', 'societe', 'compagnie'],
      'address': ['address', 'adresse', 'street', 'rue'],
      'postal_code': ['postal_code', 'code postal', 'codepostal', 'zip', 'zipcode'],
      'city': ['city', 'ville'],
      'arrondissement': ['arrondissement', 'arr', 'arrond'],
      'contact': ['contact', 'contact person', 'personne contact'],
      'notes': ['notes', 'note', 'commentaires', 'commentaire', 'remarques']
    };

    // Find column indices
    const firstRow = data[0];
    const columnMap = {};
    Object.keys(headerMap).forEach(key => {
      const possibleHeaders = headerMap[key];
      for (const header of possibleHeaders) {
        const found = Object.keys(firstRow).find(col => 
          col.toLowerCase().trim() === header.toLowerCase().trim()
        );
        if (found) {
          columnMap[key] = found;
          break;
        }
      }
    });

    const normalizeHeader = (value) =>
      (value || '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove diacritics
        .replace(/[^a-z0-9]/g, ''); // strip spaces, punctuation, quotes

    const enhancedHeaderMap = {
      first_name: ['first_name', 'prenom', 'firstname'],
      last_name: [
        'last_name',
        'nom',
        'name',
        'lastname',
        'nom de famille',
        'nom de',
        'enseigne',
        'nom entreprise',
        'nom de l entreprise',
        "nom de l'entreprise",
        'nomdelentreprise',
        'nomentreprise',
        'entreprise'
      ],
      email: ['email', 'e-mail', 'mail', 'courriel'],
      phone: ['phone', 'telephone', 'tel', 'mobile'],
      company: ['company', 'entreprise', 'societe', 'compagnie', 'enseigne'],
      address: ['address', 'adresse', 'street', 'rue'],
      postal_code: ['postal_code', 'code postal', 'codepostal', 'zip', 'zipcode', 'cp'],
      city: ['city', 'ville'],
      arrondissement: ['arrondissement', 'arr', 'arrond'],
      contact: ['contact', 'contact person', 'personne contact'],
      notes: ['notes', 'note', 'commentaires', 'commentaire', 'remarques', 'synthese'],
      status: ['status', 'statut', 'statut opportunite', 'statut opportunité'],
      activity: ['activite', 'secteur'],
      role: ['fonction', 'fonctions', 'role'],
      instagram_account: ['instagram compte', 'compte instagram', 'instagram', 'compte'],
      instagram_followers: ['nb de', 'followers', 'abonnes'],
      r1_date: ['r1 date', 'r1'],
      r1_note: ['r1 synthese'],
      r2_date: ['r2 date', 'r2'],
      r2_note: ['r2 synthese'],
      r3_date: ['r3 date', 'r3'],
      r3_note: ['r3 synthese']
    };

    Object.keys(enhancedHeaderMap).forEach(key => {
      const possibleHeaders = enhancedHeaderMap[key];
      for (const header of possibleHeaders) {
        const found = Object.keys(firstRow).find(col => 
          normalizeHeader(col) === normalizeHeader(header)
        );
        if (found) {
          columnMap[key] = found;
          break;
        }
      }
    });

    // Validate required fields
    const requiredFields = ['last_name'];
    const missingFields = requiredFields.filter(field => !columnMap[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required columns: ${missingFields.join(', ')}. Found columns: ${Object.keys(firstRow).join(', ')}`
      });
    }

    // Process and validate rows
    const errors = [];
    const validClients = [];

    data.forEach((row, index) => {
      const rowErrors = [];
      const isBlankRow = Object.values(row || {}).every(val => String(val ?? '').trim() === '');
      if (isBlankRow) {
        return;
      }

      const client = {
        last_name: String(row[columnMap.last_name] || '').trim()
      };

      if (!client.last_name && columnMap.company) {
        client.last_name = String(row[columnMap.company] || '').trim();
      }

      if (!client.last_name && columnMap.contact) {
        client.last_name = String(row[columnMap.contact] || '').trim();
      }

      // Required field validation
      if (!client.last_name) {
        rowErrors.push('last_name is required');
      }

      const metadata = {};

      // Optional fields
      if (columnMap.first_name) {
        client.first_name = String(row[columnMap.first_name] || '').trim() || null;
      }
      if (columnMap.email) {
        const email = String(row[columnMap.email] || '').trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          rowErrors.push(`Invalid email format: ${email}`);
        } else {
          client.email = email || null;
        }
      }
      if (columnMap.phone) {
        client.phone = String(row[columnMap.phone] || '').trim() || null;
      }
      if (columnMap.company) {
        client.company = String(row[columnMap.company] || '').trim() || null;
      }
      if (!client.company && client.last_name) {
        client.company = client.last_name;
      }
      if (columnMap.address) {
        client.address = String(row[columnMap.address] || '').trim() || null;
      }
      if (columnMap.postal_code) {
        client.postal_code = String(row[columnMap.postal_code] || '').trim() || null;
      }
      if (columnMap.city) {
        client.city = String(row[columnMap.city] || '').trim() || null;
      }
      if (columnMap.arrondissement) {
        client.arrondissement = String(row[columnMap.arrondissement] || '').trim() || null;
      }
      if (columnMap.contact) {
        client.contact = String(row[columnMap.contact] || '').trim() || null;
      }
      if (columnMap.notes) {
        client.notes = String(row[columnMap.notes] || '').trim() || null;
      }
      if (columnMap.activity) {
        const activity = String(row[columnMap.activity] || '').trim();
        if (activity) {
          client.segmentation = activity;
          metadata.activity = activity;
        }
      }

      if (columnMap.role) {
        const role = String(row[columnMap.role] || '').trim();
        if (role) {
          metadata.role = role;
        }
      }

      if (columnMap.instagram_account) {
        const insta = String(row[columnMap.instagram_account] || '').trim();
        if (insta) {
          metadata.instagram_account = insta;
        }
      }

      if (columnMap.instagram_followers) {
        const followersRaw = String(row[columnMap.instagram_followers] || '').replace(/\s/g, '').trim();
        if (followersRaw) {
          const followersNum = parseInt(followersRaw, 10);
          metadata.instagram_followers = Number.isNaN(followersNum) ? followersRaw : followersNum;
        }
      }

      const followups = {};
      const r1Note = columnMap.r1_note ? String(row[columnMap.r1_note] || '').trim() : '';
      const r1Date = columnMap.r1_date ? String(row[columnMap.r1_date] || '').trim() : '';
      const r2Note = columnMap.r2_note ? String(row[columnMap.r2_note] || '').trim() : '';
      const r2Date = columnMap.r2_date ? String(row[columnMap.r2_date] || '').trim() : '';
      const r3Note = columnMap.r3_note ? String(row[columnMap.r3_note] || '').trim() : '';
      const r3Date = columnMap.r3_date ? String(row[columnMap.r3_date] || '').trim() : '';

      if (r1Note || r1Date) {
        followups.r1 = { date: r1Date || null, note: r1Note || null };
      }
      if (r2Note || r2Date) {
        followups.r2 = { date: r2Date || null, note: r2Note || null };
      }
      if (r3Note || r3Date) {
        followups.r3 = { date: r3Date || null, note: r3Note || null };
      }

      if (Object.keys(followups).length > 0) {
        metadata.followups = followups;
        const followupText = Object.entries(followups)
          .map(([key, val]) => `${key.toUpperCase()}: ${val.date || 'n/a'} - ${val.note || ''}`.trim())
          .filter(Boolean)
          .join(' | ');
        client.notes = [client.notes, followupText].filter(Boolean).join(' | ');
      }

      const statusMap = {
        prospect: 'new',
        active: 'new',
        activee: 'new',
        activees: 'new',
        hot: 'pending',
        pending: 'pending',
        chaud: 'pending',
        gagnee: 'success',
        gagne: 'success',
        win: 'success',
        success: 'success',
        perdue: 'lost',
        perdu: 'lost',
        lost: 'lost'
      };

      const rawStatus = columnMap.status ? String(row[columnMap.status] || '').trim() : '';
      let resolvedStatus = 'new';
      if (rawStatus) {
        const normStatus = normalizeHeader(rawStatus);
        resolvedStatus = statusMap[normStatus] || resolvedStatus;
      }

      // Set defaults
      client.status = resolvedStatus;
      client.imported_at = new Date().toISOString();
      client.source_file = req.file.originalname;
      client.metadata = {
        ...metadata,
        row_number: index + 2, // +2 because index is 0-based and Excel rows start at 1 (header is row 1)
        import_date: new Date().toISOString()
      };
      client.lead_score = computeLeadScore(client);

      if (rowErrors.length > 0) {
        errors.push({
          row: index + 2, // Excel row number (1-based, +1 for header)
          client: client.last_name || `Row ${index + 2}`,
          errors: rowErrors
        });
      } else {
        validClients.push(client);
      }
    });

    if (errors.length > 0 && validClients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'All rows failed validation',
        validationErrors: errors
      });
    }

    // Insert into database
    let insertedClients = [];
    if (validClients.length > 0) {
      try {
        if (useMemoryStore) {
          insertedClients = memoryDb.insertClients(validClients);
        } else {
          const { data: inserted, error: insertError } = await supabase
            .from('clients')
            .insert(validClients)
            .select();

          if (insertError) {
            console.error('[ERROR] Database insert failed in /api/import/excel:', insertError);
            return res.status(500).json({
              success: false,
              error: 'Database insertion failed',
              details: insertError.message
            });
          }

          insertedClients = inserted || [];

          // Enrich with OpenAI if requested
          if (enrich === 'true' || enrich === true) {
            const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
            if (OPENAI_API_KEY) {
              // Enrich in background (don't wait)
              enrichClientsWithOpenAI(insertedClients, OPENAI_API_KEY, supabase).catch(err => {
                console.error('[ERROR] Failed to enrich clients:', err);
              });
            } else {
              console.warn('[WARNING] OpenAI API key not found. Skipping enrichment.');
            }
          }
        }
      } catch (dbError) {
        console.error('[ERROR] Unexpected failure in /api/import/excel:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Database insertion failed',
          details: dbError.message
        });
      }
    }

    const response = {
      success: true,
      message: `Successfully imported ${insertedClients.length} client(s)`,
      count: insertedClients.length,
      totalRows: data.length,
      validRows: validClients.length,
      invalidRows: errors.length,
      clients: insertedClients,
      ...(errors.length > 0 && { validationErrors: errors })
    };

    console.log(`[${new Date().toISOString()}] Imported ${insertedClients.length} clients from ${req.file.originalname}`);

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// Helper function to enrich clients with OpenAI
async function enrichClientsWithOpenAI(clients, apiKey, supabaseClient) {
  for (const client of clients) {
    try {
      const companyName = client.company || client.last_name;
      if (!companyName) continue;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Tu es un expert en intelligence commerciale. Génère un enrichissement concis pour un prospect.
Réponds UNIQUEMENT avec un JSON:
{
  "business_description": "Description courte de l'entreprise",
  "segmentation": "Segment marché",
  "lead_score": 50
}`
            },
            {
              role: 'user',
              content: `Enrichis les données pour: ${companyName}${client.city ? ` (${client.city})` : ''}`
            }
          ],
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        console.error(`[ERROR] OpenAI API error for client ${client.id}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      if (!content) continue;

      let enrichment;
      try {
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : content;
        enrichment = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error(`[ERROR] Failed to parse OpenAI response for client ${client.id}:`, parseError);
        continue;
      }

      // Update client in database
      await supabaseClient
        .from('clients')
        .update({
          enrichment_data: enrichment,
          business_description: enrichment.business_description || null,
          segmentation: enrichment.segmentation || null,
          lead_score: enrichment.lead_score || null,
          enriched_at: new Date().toISOString()
        })
        .eq('id', client.id);

      console.log(`[INFO] Enriched client ${client.id} (${companyName})`);
    } catch (error) {
      console.error(`[ERROR] Failed to enrich client ${client.id}:`, error);
      // Continue with next client
    }
  }
}

// Legacy import prospection endpoint (kept for backward compatibility, now saves to DB)
app.post('/api/import/prospection', async (req, res, next) => {
  try {
    const { prospects } = req.body;

    if (!prospects) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: prospects'
      });
    }

    if (!Array.isArray(prospects)) {
      return res.status(400).json({
        success: false,
        error: 'prospects must be an array'
      });
    }

    if (prospects.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'prospects array cannot be empty'
      });
    }

    if (!supabase && !useMemoryStore) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    // Transform prospects to client format
    const clients = prospects.map(prospect => {
      const client = {
        last_name: prospect.name || prospect.last_name || 'Client',
        first_name: prospect.first_name || null,
        email: prospect.email || null,
        phone: prospect.phone || null,
        company: prospect.company || null,
        address: prospect.address || null,
        postal_code: prospect.postal_code || null,
        city: prospect.city || null,
        arrondissement: prospect.arrondissement || null,
        contact: prospect.contact || null,
        status: prospect.status || 'new',
        notes: prospect.notes || null,
        next_action: prospect.nextAction || null,
        imported_at: new Date().toISOString(),
        metadata: {
          import_method: 'api_import_prospection',
          original_data: prospect
        }
      };
      client.lead_score = computeLeadScore(client);
      return client;
    });

    // Validate
    const errors = [];
    const validClients = [];

    clients.forEach((client, index) => {
      if (!client.last_name || client.last_name.trim().length === 0) {
        errors.push({
          index,
          prospect: `prospect at index ${index}`,
          errors: ['last_name is required']
        });
      } else {
        validClients.push(client);
      }
    });

    if (errors.length > 0 && validClients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        validationErrors: errors
      });
    }

    // Insert into database
    let inserted = [];
    if (useMemoryStore) {
      inserted = memoryDb.insertClients(validClients);
    } else {
      const result = await supabase
        .from('clients')
        .insert(validClients)
        .select();

      if (result.error) {
        console.error('[ERROR] Database insertion failed for /api/import/prospection:', result.error);
        return res.status(500).json({
          success: false,
          error: 'Database insertion failed',
          details: result.error.message
        });
      }
      inserted = result.data || [];
    }

    console.log(`[${new Date().toISOString()}] Imported ${inserted.length} prospects via API`);

    res.status(200).json({
      success: true,
      message: `Successfully imported ${inserted.length} prospect(s)`,
      count: inserted.length,
      prospects: inserted,
      ...(errors.length > 0 && { validationErrors: errors })
    });
  } catch (error) {
    next(error);
  }
});

// Get clients endpoint
app.get('/api/clients', async (req, res, next) => {
  try {
    const { status, limit = 100, offset = 0 } = req.query;

    if (useMemoryStore) {
      const data = memoryDb.listClients({ status, limit, offset });
      return res.status(200).json({
        success: true,
        count: data.length,
        clients: data
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    let query = supabase
      .from('clients')
      .select('*')
      .order('date_created', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ERROR] Failed to fetch clients:', error);
      throw error;
    }

    res.status(200).json({
      success: true,
      count: data.length,
      clients: data
    });
  } catch (error) {
    next(error);
  }
});

// Lead score endpoint
app.get('/api/clients/lead-score', async (req, res, next) => {
  try {
    const { minScore = 0, limit = 100 } = req.query;
    const min = parseInt(minScore);
    const lim = parseInt(limit);

    if (useMemoryStore) {
      const clients = memoryDb.leadScores({ limit: lim, minScore: min });
      return res.status(200).json({
        success: true,
        count: clients.length,
        clients
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('lead_score', { ascending: false })
      .range(0, lim - 1);

    if (error) {
      console.error('[ERROR] Failed to fetch lead scores:', error);
      throw error;
    }

    const filtered = (data || []).filter(c => (c.lead_score ?? 0) >= min);

    res.status(200).json({
      success: true,
      count: filtered.length,
      clients: filtered
    });
  } catch (error) {
    next(error);
  }
});

// Simple auth endpoints (token issuance placeholder)
app.post('/api/auth/login', async (req, res) => {
  const { email, password, provider } = req.body || {};
  if (provider && (provider === 'google' || provider === 'apple')) {
    const token = crypto.randomBytes(24).toString('hex');
    return res.status(200).json({ success: true, token, email: email || `${provider}@example.com` });
  }
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  return res.status(200).json({ success: true, token, email });
});

app.post('/api/auth/logout', async (_req, res) => {
  return res.status(200).json({ success: true });
});

// Create client endpoint
app.post('/api/clients', async (req, res, next) => {
  try {
    const payload = validateContact(req.body);

    const clientData = {
      company: payload.company,
      address: payload.address,
      postal_code: payload.postalCode,
      city: payload.city,
      status: payload.status,
      client_since: payload.clientSince || null,
      opportunity_score: payload.opportunityScore || null,
      primary_contact: payload.primaryContact,
      secondary_contact: payload.secondaryContact || null,
      additional_contacts: payload.additionalContacts || [],
      social: payload.social || {},
      appointment: payload.appointment || null,
      additional_appointments: payload.additionalAppointments || [],
    };

    const leadScoreInput = {
      first_name: payload.primaryContact?.name,
      last_name: payload.company,
      phone: payload.primaryContact?.phone,
      email: payload.primaryContact?.email,
      status: payload.status,
    };
    clientData.lead_score = computeLeadScore(leadScoreInput);

    // Insert into database
    if (useMemoryStore) {
      const created = memoryDb.insertClient(clientData);
      console.log(`[${new Date().toISOString()}] Created client (memory): ${created.id} (${payload.company})`);
      return res.status(201).json({
        success: true,
        message: 'Client created successfully',
        client: created
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const { data, error } = await supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single();

    if (error) {
      console.error(`[${new Date().toISOString()}] Database insert error:`, error);
      throw error;
    }

    console.log(`[${new Date().toISOString()}] Created client: ${data.id} (${payload.company})`);

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      client: data
    });
  } catch (error) {
    if (error.validationErrors) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        validationErrors: error.validationErrors
      });
    }
    next(error);
  }
});

// Get single client endpoint
app.get('/api/clients/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (useMemoryStore) {
      const client = memoryDb.getClient(id);
      if (!client) {
        return res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      }
      return res.status(200).json({
        success: true,
        client
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      client: data
    });
  } catch (error) {
    next(error);
  }
});

// Appointment conflict detection
app.post('/api/appointments/validate', (req, res) => {
  const parsed = appointmentRequestSchema.safeParse(req.body.appointment);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_APPOINTMENT',
        message: parsed.error.issues.map((i) => i.message).join(', '),
      },
    });
  }
  const existing = Array.isArray(req.body.existingAppointments) ? req.body.existingAppointments : [];
  const conflicts = detectConflicts(parsed.data, existing);
  return res.json({
    success: true,
    conflicts,
    travelCheck: conflicts.filter((c) => c.code === 'TRAVEL_TOO_TIGHT').length,
  });
});

// Daily planning (priority + proximity, deterministic & explainable)
app.post('/api/appointments/plan', (req, res) => {
  const parsed = planRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PLAN_REQUEST',
        message: parsed.error.issues.map((i) => i.message).join(', '),
      },
    });
  }
  const result = planDay(parsed.data.appointments, {
    date: parsed.data.date,
    startLocation: parsed.data.startLocation,
  });
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }
  return res.json(result);
});

// Chat API endpoint (kept for compatibility)
app.post('/api/chat', (req, res) => {
  const mockResponses = [
    "Je suis votre assistant commercial. Comment puis-je vous aider aujourd'hui ?",
    "Je peux vous aider à générer des messages de prospection ou répondre à vos questions.",
    "Avez-vous besoin d'aide pour rédiger un email de suivi ?",
    "Je peux vous aider à analyser vos leads et à prioriser vos actions.",
    "N'hésitez pas à me poser des questions sur vos clients ou vos ventes."
  ];
  
  const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
  
  setTimeout(() => {
    res.json({
      reply: randomResponse
    });
  }, 500);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

// Error handling middleware (must be after all routes)
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] API server running on http://localhost:${PORT}`);
  console.log(`[${new Date().toISOString()}] Health check available at http://localhost:${PORT}/api/health`);
  console.log(`[${new Date().toISOString()}] Database setup check available at http://localhost:${PORT}/api/setup/database`);
});

// Voice routes
app.use('/api/voice', createVoiceRouter({ memoryDb, supabase, useMemoryStore }));
