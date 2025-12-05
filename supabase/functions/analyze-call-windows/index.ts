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
    const { prospects, userTimezone, callHistory } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Analyzing optimal call windows...');

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
            content: `Tu es un expert en optimisation des appels commerciaux B2B.
            Analyse les données pour calculer les meilleurs créneaux d'appel.
            
            Considère :
            - Fuseaux horaires des prospects
            - Historique des appels (taux de réponse par heure)
            - Type de décideur (CEO = tôt/tard, Manager = milieu journée)
            - Secteur d'activité (restauration = éviter rush)
            - Jours de la semaine
            - Législation (pas d'appels après 20h en France)
            
            Réponds UNIQUEMENT avec un objet JSON :
            {
              "analysis": {
                "totalProspects": 10,
                "analyzedPeriod": "7 prochains jours"
              },
              "optimalWindows": [
                {
                  "day": "Lundi",
                  "date": "2024-01-15",
                  "slots": [
                    {
                      "start": "09:00",
                      "end": "10:30",
                      "score": 95,
                      "expectedResponseRate": 45,
                      "prospectsToCall": [
                        {
                          "id": "prospect_id",
                          "name": "Nom",
                          "reason": "Pourquoi ce créneau",
                          "priority": 1
                        }
                      ],
                      "recommendation": "Meilleur créneau de la semaine"
                    }
                  ]
                }
              ],
              "weeklySchedule": {
                "monday": { "best": "09:00-10:30", "avoid": "12:00-14:00" },
                "tuesday": { "best": "10:00-11:30", "avoid": "12:00-14:00" },
                "wednesday": { "best": "09:00-10:30", "avoid": "12:00-14:00" },
                "thursday": { "best": "14:00-16:00", "avoid": "12:00-14:00" },
                "friday": { "best": "09:00-11:00", "avoid": "après 16:00" }
              },
              "insights": {
                "bestDay": "Mardi",
                "bestTimeSlot": "09:00-10:30",
                "worstDay": "Vendredi après-midi",
                "averageResponseRate": 32,
                "tips": ["Conseil 1", "Conseil 2"]
              },
              "automatedSchedule": [
                {
                  "datetime": "2024-01-15T09:00:00",
                  "prospect": "Nom du prospect",
                  "duration": 15,
                  "type": "Appel découverte",
                  "autoConfirm": false
                }
              ]
            }`
          },
          {
            role: 'user',
            content: `Analyse ces données et propose les créneaux optimaux :
            
Timezone utilisateur : ${userTimezone || 'Europe/Paris'}

Prospects :
${JSON.stringify(prospects || [], null, 2)}

Historique appels :
${JSON.stringify(callHistory || [], null, 2)}`
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

    let windowsData;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      windowsData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }

    return new Response(
      JSON.stringify({ windowsData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in analyze-call-windows:', error);
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
