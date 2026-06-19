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
          generationConfig: {
            responseMimeType: "application/json"
          }
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
    const { word, reading, meanings } = await req.json();
    
    if (!word) {
      return new Response(
        JSON.stringify({ error: 'Word is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Explaining word:', word);

    const GEMINI_API_KEY = getGeminiApiKey();
    if (!GEMINI_API_KEY) {
      throw new Error('GOOGLE_GENAI_API_KEY or GEMINI_API_KEY is not configured');
    }

    // Ensure meanings is an array to prevent .join errors
    const meaningsText = Array.isArray(meanings) ? meanings.join(', ') : (meanings || '');

    const prompt = `You are a Japanese language expert. Explain the Japanese word "${word}"${reading ? ` (${reading})` : ''} which means: ${meaningsText}.

Provide:
1. A clear, concise explanation of the word's meaning and nuances
2. 3-4 practical example sentences in Japanese showing how to use this word naturally
3. Include the reading (furigana) for each example in parentheses
4. Provide English translations for each example

Format your response as JSON:
{
  "explanation": "your explanation here",
  "examples": [
    {
      "japanese": "japanese sentence",
      "reading": "reading with furigana",
      "english": "english translation"
    }
  ]
}`;

    const response = await callGemini(GEMINI_API_KEY, prompt);

    if (!response) {
      throw new Error('Failed to get response from Gemini API');
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 503) {
        return new Response(
          JSON.stringify({ error: 'Google Gemini is temporarily overloaded. Please try again in a moment.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Google Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');
    
    const content = getGeminiText(data);
    
    // Try to parse the JSON response
    let parsedContent;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[1]);
      } else {
        parsedContent = JSON.parse(content);
      }
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      // Fallback to text response
      parsedContent = {
        explanation: content,
        examples: []
      };
    }

    return new Response(
      JSON.stringify(parsedContent),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in explain-word function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
