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
    const { content, contentType, sourceUrl } = await req.json();
    
    if (!content && !sourceUrl) {
      throw new Error('Content or source URL is required');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log('Scanning prospect with GPT-4o:', contentType || 'url');

    const messages: any[] = [
      {
        role: 'system',
        content: `Tu es un expert en extraction de données commerciales. Tu analyses tout type de contenu (PDF, site web, image, LinkedIn, catalogue) pour extraire des informations de prospection.
        
        Extrais TOUTES les informations pertinentes pour un commercial B2B.
        
        Réponds UNIQUEMENT avec un objet JSON :
        {
          "extractedData": {
            "contacts": [
              {
                "name": "Nom complet",
                "role": "Fonction",
                "email": "email@domain.com",
                "phone": "+33...",
                "linkedin": "URL LinkedIn",
                "isDecisionMaker": true
              }
            ],
            "company": {
              "name": "Nom de l'entreprise",
              "sector": "Secteur",
              "size": "TPE/PME/ETI/GE",
              "employeeCount": 50,
              "address": "Adresse complète",
              "website": "URL",
              "description": "Description de l'activité"
            },
            "businessIntelligence": {
              "needs": ["Besoin identifié 1", "Besoin identifié 2"],
              "painPoints": ["Point de douleur 1"],
              "currentSolutions": ["Solution actuelle"],
              "budget": "Estimation budget",
              "timeline": "Urgence/Timeline"
            },
            "salesKeywords": ["Mot-clé vente 1", "Mot-clé vente 2"],
            "competitiveContext": {
              "currentProviders": ["Fournisseur actuel"],
              "satisfactionLevel": "satisfait/insatisfait/neutre",
              "switchingBarriers": ["Barrière 1"]
            },
            "scoring": {
              "qualityScore": 85,
              "conversionProbability": 72,
              "priorityLevel": "high/medium/low",
              "confidence": 90
            },
            "suggestedApproach": {
              "channel": "Email/Phone/LinkedIn",
              "pitch": "Accroche personnalisée",
              "timing": "Meilleur moment pour contacter"
            }
          },
          "sourceAnalysis": {
            "type": "Type de source analysée",
            "language": "fr/en",
            "dataCompleteness": 85,
            "missingFields": ["Champ manquant"]
          }
        }`
      }
    ];

    if (contentType === 'image' && content) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: 'Analyse cette image et extrais toutes les informations de prospection :' },
          { type: 'image_url', image_url: { url: content } }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: `Analyse ce contenu et extrais les informations de prospection :\n\nSource: ${sourceUrl || 'Document fourni'}\nType: ${contentType || 'text'}\n\nContenu:\n${content}`
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const responseContent = data.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error('No response from AI');
    }

    let scannedData;
    try {
      const jsonMatch = responseContent.match(/```json\n([\s\S]*?)\n```/) || responseContent.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseContent;
      scannedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }

    return new Response(
      JSON.stringify({ scannedData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in scan-prospect:', error);
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