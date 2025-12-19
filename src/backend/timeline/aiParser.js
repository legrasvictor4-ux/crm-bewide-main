const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export function buildEventPrompt(rawInputText) {
  return [
    'You are an assistant that structures noisy voice transcription into CRM timeline events.',
    'Rules:',
    '- Do not invent data. If a field is missing or uncertain, return null.',
    '- Keep the original wording in raw_input_text untouched.',
    '- Only use the allowed event_type values: visit, call, whatsapp, email, demo, deal, note.',
    '- Return a single valid JSON object and nothing else.',
    'Required JSON shape:',
    JSON.stringify(
      {
        event_type: 'visit | call | whatsapp | email | demo | deal | note',
        contact_name: 'string | null',
        contact_role: 'string | null',
        interest_level: 'high | medium | low | null',
        budget_estimate: 'number | null',
        next_action: {
          type: 'visit | call | whatsapp | email | demo | deal | note | null',
          date_suggestion: 'YYYY-MM-DD or null',
        },
        signals: ['list of short tags'],
        blocking_points: ['list of blockers'],
        confidence_score: '0-1 number expressing extraction confidence',
      },
      null,
      2
    ),
    'Voice transcription:',
    rawInputText,
  ].join('\n');
}

async function callOpenAI({ apiKey, model, prompt }) {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required to parse events');
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a precise CRM event parser. Output only valid JSON. Never hallucinate missing facts; set them to null.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} - ${errorPayload}`);
  }
  const json = await response.json();
  return json.choices?.[0]?.message?.content;
}

function cleanEventType(eventType) {
  const allowed = new Set(['visit', 'call', 'whatsapp', 'email', 'demo', 'deal', 'note']);
  const normalized = typeof eventType === 'string' ? eventType.toLowerCase() : null;
  return allowed.has(normalized) ? normalized : 'note';
}

export function sanitizeStructuredPayload(payload = {}) {
  const structured = { ...payload };
  structured.event_type = cleanEventType(structured.event_type || structured.type);
  structured.interest_level =
    typeof structured.interest_level === 'string' ? structured.interest_level.toLowerCase() : null;

  if (structured.next_action) {
    structured.next_action = {
      type: cleanEventType(structured.next_action.type),
      date_suggestion: structured.next_action.date_suggestion || null,
    };
  }

  structured.confidence_score = Number.isFinite(structured.confidence_score)
    ? structured.confidence_score
    : null;

  return structured;
}

export async function parseEventFromTranscription(rawInputText, options = {}) {
  const { apiKey = process.env.OPENAI_API_KEY, model = DEFAULT_MODEL, callModel = callOpenAI } = options;
  if (!rawInputText || typeof rawInputText !== 'string') {
    throw new Error('rawInputText is required');
  }

  const prompt = buildEventPrompt(rawInputText);
  const content = await callModel({ apiKey, model, prompt });

  let parsed;
  try {
    const jsonText = typeof content === 'string' ? content.trim() : '';
    const cleaned = jsonText.startsWith('```') ? jsonText.replace(/```[a-zA-Z]*\n?/, '').replace(/```$/, '') : jsonText;
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error('Failed to parse AI response as JSON');
  }

  const structured_data = sanitizeStructuredPayload(parsed);
  const event_type = structured_data.event_type || 'note';

  return {
    event_type,
    raw_input_text: rawInputText,
    structured_data,
  };
}
