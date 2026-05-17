import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcription } = await req.json();

    if (!transcription) {
      throw new Error('Transcription is required');
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        temperature: 0,
        system: `Tu es un expert en analyse de prospection commerciale BtoB dans le secteur de la restauration et des commerces de proximité.

Ta mission : extraire avec une précision maximale toutes les informations contenues dans une transcription vocale d'un commercial terrain.

RÈGLES ABSOLUES :
- Ne jamais inventer d'informations absentes de la transcription
- Si une information n'est pas mentionnée, mettre null (jamais deviner)
- Respecter exactement les noms propres tels qu'ils sont prononcés
- Pour les lieux : extraire arrondissement, ville, rue si mentionnés
- Pour les dates/heures : les convertir en format lisible (ex: "vendredi à 14h")
- Répondre UNIQUEMENT avec du JSON valide, sans markdown, sans texte avant ou après

Format JSON attendu :
{
  "restaurantName": "Nom exact du restaurant/commerce ou null",
  "contactPerson": {
    "name": "Prénom Nom si mentionné ou null",
    "role": "patron|gérant|chef|manager|directeur|autre ou null",
    "present": true|false
  },
  "location": {
    "full": "Adresse complète reconstituée ou null",
    "street": "Nom de rue si mentionné ou null",
    "district": "Arrondissement (ex: 3ème) ou null",
    "city": "Ville ou null",
    "landmark": "Repère géographique mentionné ou null"
  },
  "businessType": "restaurant|brasserie|pizzeria|sushi|burger|café|bar|boulangerie|épicerie|autre ou null",
  "interestLevel": "très_intéressé|intéressé|neutre|pas_intéressé|à_recontacter",
  "objections": ["liste des objections soulevées, vide si aucune"],
  "painPoints": ["problèmes ou besoins exprimés, vide si aucun"],
  "currentMarketing": {
    "hasAgency": true|false|null,
    "agencyName": "Nom de l'agence actuelle ou null",
    "satisfaction": "satisfait|insatisfait|neutre|unknown"
  },
  "socialMedia": {
    "instagram": true|false|null,
    "facebook": true|false|null,
    "tiktok": true|false|null,
    "hasWebsite": true|false|null
  },
  "nextAction": {
    "type": "rdv_confirmé|rappel|recontacter|perdu|envoi_devis|autre",
    "date": "Date lisible si mentionnée ou null",
    "time": "Heure si mentionnée ou null",
    "notes": "Instructions précises pour le suivi"
  },
  "budget": {
    "mentioned": true|false,
    "amount": "Montant exact si mentionné ou null",
    "range": "petit|moyen|important|premium|unknown"
  },
  "sentiment": {
    "overall": "positif|neutre|négatif",
    "openness": 1-10,
    "urgency": 1-10,
    "confidence": 1-10
  },
  "keyQuotes": ["2 à 4 citations textuelles importantes du prospect"],
  "suggestedFollowUp": {
    "approach": "Stratégie recommandée pour la relance",
    "timing": "Délai recommandé (immédiat|aujourd'hui|cette semaine|dans 2 semaines|dans 1 mois)",
    "arguments": ["Arguments clés à utiliser lors du prochain contact"]
  },
  "summary": "Résumé précis en 2-3 phrases de cette prospection",
  "extractionConfidence": 1-10
}`,
        messages: [
          {
            role: 'user',
            content: `Analyse cette transcription vocale de prospection et extrais toutes les informations avec une précision maximale :\n\n"${transcription}"`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      throw new Error('No response from Claude');
    }

    console.log('Claude raw response:', content);

    let extractedData;
    try {
      // Claude avec temperature=0 retourne du JSON pur, mais on nettoie par sécurité
      const cleaned = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      extractedData = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Raw content:', content);
      throw new Error('Failed to parse Claude response as JSON');
    }

    return new Response(
      JSON.stringify({ extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in analyze-voice-data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
