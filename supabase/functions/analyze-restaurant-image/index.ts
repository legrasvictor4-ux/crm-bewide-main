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
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      throw new Error('Image data is required');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log('Analyzing restaurant image with GPT-4o...');

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
            content: `Tu es un expert en analyse de restaurants et de commerces. Analyse l'image et fournis une évaluation complète et structurée en JSON.
            
            Retourne UNIQUEMENT un objet JSON avec cette structure exacte :
            {
              "standing": "luxe|moyen-haut|moyen|populaire|inconnu",
              "standingScore": <nombre de 1 à 10>,
              "cleanliness": "excellent|bon|moyen|préoccupant|inconnu",
              "cleanlinessScore": <nombre de 1 à 10>,
              "digitalPresence": {
                "visible": <boolean>,
                "elements": [liste des éléments visibles: "instagram", "facebook", "qr_code", "site_web", etc],
                "score": <nombre de 1 à 10>
              },
              "visualAppeal": {
                "score": <nombre de 1 à 10>,
                "strengths": [liste de points forts],
                "weaknesses": [liste de points faibles]
              },
              "targetAudience": "premium|famille|jeunes|touristes|affaires|mixte",
              "conversionPotential": <nombre de 1 à 10>,
              "suggestedApproach": {
                "tone": "formel|professionnel|amical|décontracté",
                "keyPoints": [liste de 3-5 arguments clés pour l'approche commerciale],
                "timing": "matin|midi|après-midi|soirée",
                "contactPerson": "propriétaire|gérant|chef|responsable_marketing"
              },
              "competitiveAdvantages": [liste des avantages visibles],
              "improvementOpportunities": [liste d'opportunités d'amélioration visibles],
              "estimatedBudget": "petit|moyen|important|premium",
              "urgencyScore": <nombre de 1 à 10>,
              "confidence": <nombre de 1 à 10 sur la confiance de l'analyse>,
              "quickSummary": "Résumé en 1-2 phrases de l'analyse complète"
            }`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyse cette photo de restaurant/commerce et fournis une évaluation commerciale complète.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
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

    console.log('Raw AI response:', content);

    let analysis;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Content:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    return new Response(
      JSON.stringify({ analysis }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in analyze-restaurant-image:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});