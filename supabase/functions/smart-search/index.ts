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
    const { query, prospectData } = await req.json();
    
    if (!query) {
      throw new Error('Search query is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Smart search query:', query);

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
            content: `Tu es un moteur de recherche intelligent pour un CRM commercial.
            L'utilisateur pose des questions en langage naturel comme :
            - "Les prospects intéressés par le prix mais sans démo"
            - "Ceux qui ont dit qu'ils rappelleraient"
            - "Les restaurants du 11ème avec plus de 50 employés"
            
            Tu dois analyser la requête et retourner :
            1. Les critères de recherche extraits
            2. Les résultats correspondants parmi les données fournies
            3. Des suggestions de recherches connexes
            
            Réponds UNIQUEMENT avec un objet JSON :
            {
              "interpretedQuery": {
                "original": "La requête originale",
                "interpreted": "Ce que tu as compris",
                "criteria": [
                  {
                    "field": "Champ concerné",
                    "operator": "contains/equals/greater/less",
                    "value": "Valeur recherchée"
                  }
                ]
              },
              "results": [
                {
                  "id": "prospect_id",
                  "name": "Nom du prospect",
                  "matchScore": 95,
                  "matchReasons": ["Raison 1", "Raison 2"],
                  "relevantData": {
                    "field": "Donnée pertinente trouvée"
                  },
                  "suggestedAction": "Action suggérée"
                }
              ],
              "suggestions": [
                {
                  "query": "Recherche suggérée",
                  "description": "Pourquoi cette recherche"
                }
              ],
              "insights": {
                "totalMatches": 5,
                "averageScore": 82,
                "commonPattern": "Pattern commun identifié"
              }
            }`
          },
          {
            role: 'user',
            content: `Recherche : "${query}"\n\nDonnées prospects disponibles :\n${JSON.stringify(prospectData || [], null, 2)}`
          }
        ],
        temperature: 0.3,
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

    let searchResults;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      searchResults = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }

    return new Response(
      JSON.stringify({ searchResults }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in smart-search:', error);
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
