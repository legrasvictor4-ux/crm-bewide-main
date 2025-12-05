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
    const { companyName, companyUrl } = await req.json();
    
    if (!companyName) {
      throw new Error('Company name is required');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log('Enriching prospect with GPT-4o:', companyName);

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
            content: `Tu es un expert en intelligence commerciale B2B. Tu dois enrichir les données d'un prospect à partir de son nom d'entreprise.
            
            Génère des données réalistes et cohérentes basées sur le nom de l'entreprise.
            Pour un restaurant, génère des données typiques du secteur restauration.
            
            Réponds UNIQUEMENT avec un objet JSON valide :
            {
              "companyInfo": {
                "name": "Nom officiel",
                "sector": "Secteur d'activité",
                "subSector": "Sous-secteur",
                "yearFounded": 2020,
                "legalForm": "SARL/SAS/etc",
                "siret": "XXX XXX XXX XXXXX"
              },
              "financials": {
                "estimatedRevenue": "500K - 1M €",
                "revenueGrowth": "+15%",
                "employeeCount": 12,
                "employeeGrowthRate": "+20%"
              },
              "contacts": [
                {
                  "role": "Directeur/Gérant",
                  "name": "Prénom Nom",
                  "email": "email@domain.com",
                  "phone": "+33 6 XX XX XX XX",
                  "linkedin": "linkedin.com/in/xxx",
                  "decisionMaker": true
                }
              ],
              "digitalPresence": {
                "website": "www.example.com",
                "instagram": "@handle",
                "facebook": "facebook.com/page",
                "googleRating": 4.2,
                "reviewCount": 156,
                "hasOnlineOrdering": true,
                "hasDelivery": true
              },
              "techStack": {
                "pos": "Système de caisse utilisé",
                "reservation": "Système de réservation",
                "delivery": ["UberEats", "Deliveroo"],
                "marketing": "Outils marketing",
                "crm": "CRM actuel ou aucun"
              },
              "recentNews": [
                {
                  "date": "2024-01",
                  "title": "Titre de l'actualité",
                  "summary": "Résumé court",
                  "sentiment": "positive/neutral/negative",
                  "salesOpportunity": "Opportunité de vente liée"
                }
              ],
              "competitorAnalysis": {
                "mainCompetitors": ["Concurrent 1", "Concurrent 2"],
                "marketPosition": "Position sur le marché",
                "uniqueSellingPoints": ["USP 1", "USP 2"],
                "weaknesses": ["Point faible 1"]
              },
              "salesIntelligence": {
                "buyingSignals": ["Signal 1", "Signal 2"],
                "painPoints": ["Pain point 1", "Pain point 2"],
                "budgetIndicator": "medium/high/low",
                "decisionTimeline": "court/moyen/long terme",
                "bestApproach": "Meilleure approche commerciale"
              },
              "score": {
                "qualityScore": 85,
                "conversionProbability": 72,
                "priorityLevel": "high/medium/low"
              }
            }`
          },
          {
            role: 'user',
            content: `Enrichis les données pour cette entreprise : "${companyName}"${companyUrl ? ` (URL: ${companyUrl})` : ''}`
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

    console.log('Raw enrichment response:', content);

    let enrichedData;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      enrichedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }

    return new Response(
      JSON.stringify({ enrichedData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in enrich-prospect:', error);
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