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
    const { restaurantName, location, socialMediaData, visualAnalysis } = await req.json();
    
    if (!restaurantName) {
      throw new Error('Restaurant name is required');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log('Generating smart pitch with GPT-4o for:', restaurantName);

    const contextInfo = `
Restaurant: ${restaurantName}
Localisation: ${location || 'Non spécifiée'}
Analyse visuelle: ${visualAnalysis ? JSON.stringify(visualAnalysis) : 'Non disponible'}
Données social media: ${socialMediaData ? JSON.stringify(socialMediaData) : 'Non disponible'}
`;

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
            content: `Tu es un expert commercial spécialisé dans le secteur de la restauration. 
            Tu dois créer un pitch de vente personnalisé ultra-convaincant pour BeWide AI, une agence de marketing digital.
            
            BeWide AI propose :
            - Gestion de réseaux sociaux (Instagram, Facebook, TikTok)
            - Création de contenu photo/vidéo professionnel
            - Stratégie marketing digitale sur-mesure
            - Publicités ciblées et campagnes performantes
            - Community management et engagement client
            
            Réponds UNIQUEMENT avec un objet JSON structuré :
            {
              "hook": "Phrase d'accroche percutante et personnalisée (1 phrase)",
              "painPoints": [
                {
                  "problem": "Point de douleur identifié",
                  "solution": "Comment BeWide AI résout ce problème"
                }
              ],
              "uniqueSellingPoints": [
                "3-5 arguments uniques basés sur l'analyse du restaurant"
              ],
              "socialProof": "Exemple de résultat chiffré ou cas similaire",
              "callToAction": "CTA personnalisé et urgent",
              "estimatedROI": "Projection de ROI crédible",
              "conversationStarters": [
                "3 questions ouvertes pour engager la conversation"
              ],
              "objectionHandling": {
                "price": "Réponse à l'objection prix",
                "timing": "Réponse à l'objection temps",
                "current_agency": "Réponse si déjà une agence"
              },
              "personalizedOffer": "Offre spéciale personnalisée",
              "confidence": <nombre de 1 à 10>
            }`
          },
          {
            role: 'user',
            content: `Crée un pitch commercial ultra-personnalisé basé sur ces informations :\n\n${contextInfo}`
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

    console.log('Raw pitch response:', content);

    let pitch;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      pitch = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }

    return new Response(
      JSON.stringify({ pitch }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in generate-smart-pitch:', error);
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