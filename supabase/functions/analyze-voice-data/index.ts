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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Analyzing voice transcription...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Tu es un assistant IA expert en analyse de prospection commerciale dans le secteur de la restauration.
            Analyse la transcription vocale d'une prospection et extrais toutes les informations structurées possibles.
            
            Réponds UNIQUEMENT avec un objet JSON :
            {
              "restaurantName": "Nom du restaurant ou null",
              "location": "Arrondissement/adresse ou null",
              "contactPerson": {
                "present": boolean,
                "name": "Nom si mentionné ou null",
                "role": "Rôle (patron, gérant, etc) ou null"
              },
              "businessHours": "Horaires si mentionnés ou null",
              "socialMedia": {
                "instagram": boolean,
                "facebook": boolean,
                "tiktok": boolean,
                "hasWebsite": boolean
              },
              "currentMarketing": {
                "hasAgency": boolean,
                "agencyName": "Nom si mentionné ou null",
                "satisfaction": "satisfait|insatisfait|neutre|unknown"
              },
              "interestLevel": "très_intéressé|intéressé|neutre|pas_intéressé|à_recontacter",
              "nextAction": {
                "type": "rdv_confirmé|à_rappeler|à_recontacter_plus_tard|perdu",
                "date": "Date si mentionnée ou null",
                "time": "Heure si mentionnée ou null",
                "notes": "Notes sur la prochaine action"
              },
              "painPoints": [
                "Liste des problèmes/besoins évoqués"
              ],
              "objections": [
                "Liste des objections mentionnées"
              ],
              "budget": {
                "mentioned": boolean,
                "range": "petit|moyen|important|premium|unknown"
              },
              "sentiment": {
                "overall": "positif|neutre|négatif",
                "openness": <score de 1 à 10>,
                "urgency": <score de 1 à 10>
              },
              "competitorsMentioned": [
                "Liste des concurrents mentionnés"
              ],
              "keyQuotes": [
                "2-3 citations importantes du prospect"
              ],
              "suggestedFollowUp": {
                "approach": "Description de l'approche recommandée pour le follow-up",
                "timing": "Quand relancer (immédiat, 1 semaine, 1 mois, etc)",
                "arguments": ["Arguments clés à utiliser au prochain contact"]
              },
              "confidence": <score de 1 à 10 sur la qualité de l'extraction>,
              "summary": "Résumé en 2-3 phrases de la prospection"
            }`
          },
          {
            role: 'user',
            content: `Analyse cette transcription de prospection et extrais toutes les informations pertinentes :\n\n${transcription}`
          }
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('Raw analysis response:', content);

    let extractedData;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      extractedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }

    return new Response(
      JSON.stringify({ extractedData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in analyze-voice-data:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
