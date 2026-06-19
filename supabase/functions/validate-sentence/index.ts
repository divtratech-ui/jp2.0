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

const parseJsonResponse = (content: string) => {
  const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
  return JSON.parse(jsonMatch ? jsonMatch[1] : content);
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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sentence, word } = await req.json();
    
    if (!sentence) {
      return new Response(
        JSON.stringify({ error: 'Sentence is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Validating sentence:', sentence);

    // Look for the environment secret variable you configured
    const GEMINI_API_KEY = getGeminiApiKey();
    if (!GEMINI_API_KEY) {
      throw new Error('GOOGLE_GENAI_API_KEY or GEMINI_API_KEY is not configured');
    }

    const prompt = `You are a Japanese language expert. The user is practicing Japanese by writing sentences${word ? ` using the word "${word}"` : ''}.

Analyze this Japanese sentence: "${sentence}"

Provide your assessment exactly in this JSON format:
{
  "isCorrect": true/false,
  "explanation": "detailed explanation here",
  "correctedSentence": "corrected sentence if incorrect, otherwise null",
  "suggestions": "helpful suggestions for improvement"
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
    console.log('Gemini response received successfully');
    
    const content = getGeminiText(data);
    const parsedContent = parseJsonResponse(content);

    return new Response(
      JSON.stringify(parsedContent),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in validate-sentence function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
