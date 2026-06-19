import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getGeminiApiKey = () =>
  Deno.env.get('GOOGLE_GENAI_API_KEY') ?? Deno.env.get('GEMINI_API_KEY');

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

const getGeminiText = (data: GeminiResponse) => {
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini API returned an empty response or unexpected structure.');
  }
  return text;
};

const callGemini = async (apiKey: string, prompt: string) => {
  let lastResponse: Response | undefined;

  for (let attempt = 1; attempt <= 3; attempt++) {
    lastResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }),
      }
    );

    if (lastResponse.status !== 503) {
      break;
    }

    console.log(`Google Gemini is busy (503). Retrying attempt ${attempt} of 3...`);
    await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
  }

  return lastResponse;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = getGeminiApiKey();
    if (!GEMINI_API_KEY) {
      throw new Error('GOOGLE_GENAI_API_KEY or GEMINI_API_KEY is not configured');
    }

    const systemPrompt = `You are an English-to-Japanese translator for a Japanese dictionary search.
Given an English word or short phrase, return the single most common Japanese equivalent suitable for dictionary lookup.
- Prefer the standard Japanese word (kanji or kana as appropriate).
- For a single English word, return one word. For a short phrase, return the most natural Japanese equivalent.
- Output ONLY the Japanese term. No romaji, no English, no quotes, no punctuation, no explanation.`;

    const prompt = `${systemPrompt}\n\nTranslate: ${text}`;

    const response = await callGemini(GEMINI_API_KEY, prompt);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error('Gemini API error');
    }

    const data = await response.json() as GeminiResponse;
    const translation = getGeminiText(data).trim().replace(/^["'`]|["'`]$/g, '');

    return new Response(
      JSON.stringify({ translation }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in translate-en-ja:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
