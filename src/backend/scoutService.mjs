/**
 * Scout Service — Intelligence terrain IA
 * Pipeline : Google Vision API → Google Places API → Claude API → Analyse commerciale
 */

import crypto from 'crypto';

// ── Auth Google (Service Account JWT) ────────────────────────────────────────
async function getGoogleToken(scope = 'https://www.googleapis.com/auth/cloud-vision') {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !rawKey) throw new Error('Clés Google Vision non configurées dans .env');

  const privateKey = rawKey.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
  const now = Math.floor(Date.now() / 1000);

  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: email, scope, aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  })).toString('base64url');

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(privateKey, 'base64url');

  const jwt = `${header}.${payload}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Google Auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

// ── Google Vision : OCR + Logo ────────────────────────────────────────────────
export async function visionAnalyze(imageBase64) {
  const token = await getGoogleToken();

  const res = await fetch('https://vision.googleapis.com/v1/images:annotate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        image: { content: imageBase64 },
        features: [
          { type: 'TEXT_DETECTION',  maxResults: 1 },
          { type: 'LOGO_DETECTION',  maxResults: 3 },
          { type: 'LABEL_DETECTION', maxResults: 5 },
        ],
      }],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`Vision API: ${data.error.message}`);

  const resp        = data.responses?.[0] ?? {};
  const fullText    = resp.fullTextAnnotation?.text ?? resp.textAnnotations?.[0]?.description ?? '';
  const logos       = (resp.logoAnnotations ?? []).map(l => l.description);
  const labels      = (resp.labelAnnotations ?? []).map(l => l.description);

  // Nom du business = premier logo OU première ligne de texte propre
  const firstLine   = fullText.split('\n').find(l => l.trim().length > 2) ?? '';
  const businessName = logos[0] ?? firstLine;

  return { fullText, businessName, logos, labels };
}

// ── Google Places : Matching business ────────────────────────────────────────
export async function findPlace(name, lat, lng) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY manquant dans .env');

  const params = new URLSearchParams({
    input:         name,
    inputtype:     'textquery',
    locationbias:  `circle:300@${lat},${lng}`,
    fields:        'name,rating,user_ratings_total,formatted_address,website,formatted_phone_number,types,place_id',
    key,
  });

  const res  = await fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${params}`);
  const data = await res.json();

  if (data.status !== 'OK') return null;
  return data.candidates?.[0] ?? null;
}

// ── Google Places : Concurrents locaux ───────────────────────────────────────
export async function findCompetitors(types, lat, lng) {
  const key      = process.env.GOOGLE_MAPS_API_KEY;
  const type     = types?.[0] ?? 'establishment';
  const params   = new URLSearchParams({ location: `${lat},${lng}`, radius: '500', type, key });
  const res      = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`);
  const data     = await res.json();
  return (data.results ?? []).slice(0, 3).map(p => ({
    name: p.name, rating: p.rating, reviews: p.user_ratings_total,
  }));
}

// ── Scrape liens sociaux depuis le site web ────────────────────────────────
export async function extractSocialLinks(website) {
  if (!website) return {};
  try {
    const res  = await fetch(website, { signal: AbortSignal.timeout(4000) });
    const html = await res.text();
    const find = (pattern) => html.match(pattern)?.[1] ?? null;
    return {
      instagram: find(/instagram\.com\/([A-Za-z0-9_.]+)/),
      facebook:  find(/facebook\.com\/([A-Za-z0-9_.]+)/),
      tiktok:    find(/tiktok\.com\/@([A-Za-z0-9_.]+)/),
    };
  } catch { return {}; }
}

// ── Claude : Génération intelligence commerciale ──────────────────────────────
export async function generateIntelligence({ business, ocr, social, competitors }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY manquant dans .env');

  const businessBlock = `
Business : ${business?.name ?? ocr.businessName}
Adresse : ${business?.formatted_address ?? 'inconnue'}
Note Google : ${business?.rating ?? '?'}★ (${business?.user_ratings_total ?? '?'} avis)
Site web : ${business?.website ?? 'absent'}
Téléphone : ${business?.formatted_phone_number ?? 'absent'}`;

  const socialBlock = `
Réseaux sociaux détectés :
- Instagram : ${social?.instagram ? `@${social.instagram}` : '❌ Absent ou introuvable'}
- Facebook  : ${social?.facebook  ? `@${social.facebook}`  : '❌ Absent ou introuvable'}
- TikTok    : ${social?.tiktok    ? `@${social.tiktok}`    : '❌ Absent ou introuvable'}
- Site web  : ${business?.website ? '✅ Présent' : '❌ Absent'}`;

  const competitorBlock = competitors?.length
    ? `\nConcurrents dans 500m :\n${competitors.map(c => `- ${c.name} : ${c.rating}★ (${c.reviews} avis)`).join('\n')}`
    : '';

  const prompt = `Tu es un expert en prospection commerciale pour une agence de communication digitale.

Un commercial vient de scanner ce business en marchant dans la rue :
${businessBlock}
${socialBlock}
${competitorBlock}

Génère une analyse commerciale complète en JSON avec cette structure exacte :
{
  "score": <nombre 0-100 représentant l'opportunité commerciale>,
  "verdict": "<phrase courte expliquant le score>",
  "opportunities": ["<opportunité 1>", "<opportunité 2>", "<opportunité 3>"],
  "weaknesses": ["<faiblesse détectée 1>", "<faiblesse détectée 2>"],
  "pitch": "<pitch terrain de 3 phrases max, percutant, ancré dans les données réelles>",
  "scripts": {
    "call": "<script appel 90 secondes, naturel, avec les vrais chiffres>",
    "dm": "<message DM Instagram 140 caractères max, accrocheur>",
    "email": {
      "subject": "<objet email>",
      "body": "<corps email court, 4 phrases max>"
    }
  },
  "objections": [
    { "objection": "<objection probable>", "reponse": "<réponse du commercial>" }
  ],
  "closingScore": <nombre 1-10>
}

Règles :
- Utilise les VRAIS chiffres (note, nombre d'avis, concurrents)
- Sois précis et percutant, pas générique
- Si le business a de bons avis Google mais peu de présence sociale = fort potentiel
- Réponds UNIQUEMENT en JSON valide, sans markdown`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         key,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`Claude: ${data.error.message}`);

  const raw = data.content?.[0]?.text ?? '{}';
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : { score: 0, verdict: 'Analyse indisponible', opportunities: [], pitch: raw };
  }
}

// ── Pipeline complet Scout ────────────────────────────────────────────────────
export async function scoutAnalyze({ imageBase64, lat, lng }) {
  // Étape 1 : Vision
  const ocr = await visionAnalyze(imageBase64);

  // Étapes 2-4 : Places + Social + Concurrents (en parallèle)
  const [business, competitors] = await Promise.all([
    findPlace(ocr.businessName, lat, lng).catch(() => null),
    findCompetitors(null, lat, lng).catch(() => []),
  ]);

  const social = await extractSocialLinks(business?.website).catch(() => ({}));

  // Étape 5 : Claude génère l'intelligence
  const intelligence = await generateIntelligence({ business, ocr, social, competitors });

  return {
    ocr:          { text: ocr.fullText, businessName: ocr.businessName },
    business:     business ?? { name: ocr.businessName },
    social,
    competitors,
    intelligence,
  };
}
