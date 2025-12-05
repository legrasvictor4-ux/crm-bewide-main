import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { prospectionData } = await req.json();
    
    if (!prospectionData) {
      throw new Error('Prospection data is required');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log('Predicting success score with GPT-4o...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en prédiction de conversion commerciale dans le secteur B2B restauration.
            Analyse les données de prospection et calcule un score de probabilité de conversion.
            
            Facteurs clés à considérer :
            - Qualité de l'interaction
            - Présence digitale actuelle
            - Budget estimé
            - Niveau d'intérêt
            - Timing
            - Concurrence actuelle
            - Points de douleur identifiés
            
            Réponds UNIQUEMENT avec un objet JSON :
            {
              "conversionProbability": <pourcentage de 0 à 100>,
              "confidenceLevel": <score de 1 à 10>,
              "grade": "A+|A|B|C|D|F",
              "keyFactors": {
                "positive": [
                  {
                    "factor": "Nom du facteur",
                    "impact": <score de 1 à 10>,
                    "description": "Explication"
                  }
                ],
                "negative": [
                  {
                    "factor": "Nom du facteur",
                    "impact": <score de 1 à 10>,
                    "description": "Explication"
                  }
                ],
                "neutral": [
                  {
                    "factor": "Nom du facteur",
                    "impact": <score de 1 à 10>,
                    "description": "Explication"
                  }
                ]
              },
              "timeline": {
                "estimatedClosingDays": <nombre de jours>,
                "bestContactMoment": "Description du meilleur moment pour closer"
              },
              "recommendations": [
                {
                  "priority": "high|medium|low",
                  "action": "Action recommandée",
                  "expectedImpact": "Description de l'impact attendu",
                  "implementation": "Comment mettre en oeuvre"
                }
              ],
              "risks": [
                {
                  "risk": "Description du risque",
                  "probability": "high|medium|low",
                  "mitigation": "Comment mitiger ce risque"
                }
              ],
              "competitivePosition": {
                "strength": <score de 1 à 10>,
                "uniqueAdvantages": ["Avantages compétitifs"],
                "weaknesses": ["Points faibles à adresser"]
              },
              "dealValue": {
                "estimated": "Valeur estimée du contrat",
                "tier": "small|medium|large|enterprise"
              },
              "nextBestAction": {
                "action": "Action précise à faire maintenant",
                "script": "Script/message recommandé",
                "timing": "Quand exécuter cette action"
              },
              "summary": "Résumé en 2-3 phrases de l'évaluation"
            }`
          },
          {
            role: 'user',
            content: `Analyse ces données de prospection et calcule un score de probabilité de conversion :\n\n${JSON.stringify(prospectionData, null, 2)}`
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('Raw prediction response:', content);

    let prediction;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      prediction = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }

    return new Response(
      JSON.stringify({ prediction }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in predict-success-score:', error);
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