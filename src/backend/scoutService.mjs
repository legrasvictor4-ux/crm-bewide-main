/**
 * Scout Service — Intelligence terrain IA
 * Pipeline : Google Vision API → Google Places API → Claude API → Analyse commerciale
 */

import crypto from 'crypto';

// ── Cache token Google (valide 55 min) ───────────────────────────────────────
let _tokenCache = null;
async function getGoogleToken(scope = 'https://www.googleapis.com/auth/cloud-vision') {
  if (_tokenCache && _tokenCache.exp > Date.now()) return _tokenCache.token;

  const email  = process.env.GOOGLE_CLIENT_EMAIL;
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

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  `${header}.${payload}.${sig}`,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Google Auth failed: ${JSON.stringify(data)}`);

  _tokenCache = { token: data.access_token, exp: Date.now() + 55 * 60 * 1000 };
  return data.access_token;
}

// ── Chemins non-profil à filtrer (réseaux sociaux) ───────────────────────────
const SOCIAL_BLACKLIST = /^(p|reel|reels|explore|stories|tv|about|accounts|login|signup|share|direct|a|l|s|web|apps|ar|static|sharedfiles|hashtag|business|help|press|privacy|legal|legal-pages|ads|music|challenges|discover|embed|notifications|search|messages|campaigns|creator|collections|highlights|tagged|followers|following|saved|checkout|shop)$/i;

function extractHandle(html, pattern) {
  const matches = html.matchAll(pattern);
  for (const m of matches) {
    const handle = m[1]?.split('?')[0].split('/')[0];
    if (handle && handle.length > 1 && !SOCIAL_BLACKLIST.test(handle)) return handle;
  }
  return null;
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

  const resp = data.responses?.[0] ?? {};
  // Vérifier les erreurs par-réponse
  if (resp.error) throw new Error(`Vision API (réponse): ${resp.error.message}`);

  const fullText = resp.fullTextAnnotation?.text ?? resp.textAnnotations?.[0]?.description ?? '';
  const logos    = (resp.logoAnnotations ?? []).map(l => l.description);

  // Nom du business : premier logo détecté OU première ligne de texte propre (≥ 3 chars)
  const firstLine    = fullText.split('\n').find(l => l.trim().length >= 3) ?? '';
  const businessName = (logos[0] ?? firstLine).trim();

  if (!businessName) {
    throw new Error("Aucun texte lisible détecté. Rapprochez-vous de l'enseigne et réessayez.");
  }

  return { fullText, businessName, logos, labels: (resp.labelAnnotations ?? []).map(l => l.description) };
}

// ── Google Places : Matching business ────────────────────────────────────────
export async function findPlace(name, lat, lng) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY manquant dans .env');

  const params = new URLSearchParams({
    input:        name,
    inputtype:    'textquery',
    locationbias: `circle:300@${lat},${lng}`,
    fields:       'name,rating,user_ratings_total,formatted_address,website,formatted_phone_number,types,place_id',
    key,
  });

  const res  = await fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${params}`);
  const data = await res.json();
  if (data.status !== 'OK') return null;
  return data.candidates?.[0] ?? null;
}

// ── Google Places : Concurrents locaux ───────────────────────────────────────
export async function findCompetitors(types, lat, lng, excludeName) {
  const key  = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return [];

  // Utilise le vrai type du business ou fallback vers restaurant/establishment
  const type   = types?.find(t => !['point_of_interest', 'establishment', 'food'].includes(t)) ?? types?.[0] ?? 'establishment';
  const params = new URLSearchParams({ location: `${lat},${lng}`, radius: '500', type, key });

  const res  = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`);
  const data = await res.json();

  return (data.results ?? [])
    .filter(p => p.name?.toLowerCase() !== excludeName?.toLowerCase())  // exclure le business lui-même
    .slice(0, 3)
    .map(p => ({ name: p.name, rating: p.rating ?? 0, reviews: p.user_ratings_total ?? 0 }));
}

// ── Scrape liens sociaux depuis le site web ────────────────────────────────
export async function extractSocialLinks(website) {
  if (!website) return {};
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    const res  = await fetch(url, {
      signal:  AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; myclerk-scout/1.0)' },
    });
    const html = await res.text();
    return {
      instagram: extractHandle(html, /instagram\.com\/([A-Za-z0-9_.]{2,30})/g),
      facebook:  extractHandle(html, /facebook\.com\/([A-Za-z0-9_.]{3,80})/g),
      tiktok:    extractHandle(html, /tiktok\.com\/@([A-Za-z0-9_.]{2,30})/g),
    };
  } catch { return {}; }
}

// ── Claude : Génération intelligence commerciale ──────────────────────────────
export async function generateIntelligence({ business, ocr, social, competitors }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY manquant dans .env — ajoute ta clé Anthropic');

  const name    = business?.name ?? ocr.businessName;
  const rating  = business?.rating ?? null;
  const reviews = business?.user_ratings_total ?? null;
  const website = business?.website ?? null;

  const socialLines = [
    social?.instagram ? `Instagram @${social.instagram} détecté`     : 'Instagram : absent ou introuvable',
    social?.facebook  ? `Facebook @${social.facebook} détecté`       : 'Facebook  : absent ou introuvable',
    social?.tiktok    ? `TikTok @${social.tiktok} détecté`           : 'TikTok    : absent',
    website           ? `Site web : présent (${website})`            : 'Site web  : absent',
  ].join('\n');

  const competitorLines = competitors?.length
    ? competitors.map(c => `- ${c.name} : ${c.rating}★ (${c.reviews} avis)`).join('\n')
    : 'Aucun concurrent identifié dans 500m';

  const prompt = `Tu es un expert en prospection commerciale pour une agence de communication digitale.

BUSINESS SCANNÉ :
Nom : ${name}
Adresse : ${business?.formatted_address ?? 'inconnue'}
Note Google : ${rating ? `${rating}★ sur ${reviews?.toLocaleString()} avis` : 'non trouvée'}
Téléphone : ${business?.formatted_phone_number ?? 'absent'}

PRÉSENCE DIGITALE :
${socialLines}

CONCURRENTS DANS 500M :
${competitorLines}

Génère une analyse commerciale JSON (UNIQUEMENT du JSON valide, sans markdown) :
{
  "score": <0-100, opportunité commerciale — haut si bonne note Google + faible présence sociale>,
  "verdict": "<une phrase percutante avec les vrais chiffres>",
  "opportunities": ["<3 opportunités concrètes avec chiffres>"],
  "weaknesses": ["<2 faiblesses digitales précises>"],
  "pitch": "<3 phrases terrain, percutant, avec les vrais chiffres Google et réseaux>",
  "scripts": {
    "call": "<script appel 90s naturel mentionnant la note Google et les réseaux>",
    "dm": "<DM Instagram ≤140 chars, accrocheur, avec un chiffre réel>",
    "email": {
      "subject": "<objet accrocheur>",
      "body": "<4 phrases max, avec chiffres réels>"
    }
  },
  "objections": [
    { "objection": "<objection réelle>", "reponse": "<réponse commerciale>"},
    { "objection": "<objection réelle>", "reponse": "<réponse commerciale>"}
  ],
  "closingScore": <1-10>
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         key,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1800,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`Claude API: ${data.error.message}`);

  const raw = data.content?.[0]?.text ?? '{}';
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* continue */ }
    }
    return {
      score: 50, verdict: 'Analyse partielle disponible',
      opportunities: ['Présence digitale à améliorer'],
      weaknesses: ['Données insuffisantes'],
      pitch: raw.slice(0, 200),
      scripts: { call: '', dm: '', email: { subject: '', body: '' } },
      objections: [],
      closingScore: 5,
    };
  }
}

// ── Pipeline complet Scout ────────────────────────────────────────────────────
export async function scoutAnalyze({ imageBase64, lat, lng }) {
  // 1. OCR Vision
  const ocr = await visionAnalyze(imageBase64);

  // 2. Matching business (bloquant — on a besoin des types pour les concurrents)
  const business = await findPlace(ocr.businessName, lat, lng).catch(() => null);

  // 3. Concurrents + Social en parallèle (maintenant qu'on a le type du business)
  const [competitors, social] = await Promise.all([
    findCompetitors(business?.types ?? null, lat, lng, business?.name ?? ocr.businessName).catch(() => []),
    extractSocialLinks(business?.website).catch(() => ({})),
  ]);

  // 4. Intelligence Claude
  const intelligence = await generateIntelligence({ business, ocr, social, competitors });

  return {
    ocr:         { text: ocr.fullText, businessName: ocr.businessName },
    business:    business ?? { name: ocr.businessName },
    social,
    competitors,
    intelligence,
  };
}
