import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, selectedSentence, messages } = await req.json();
    
    const GEMINI_API_KEY = getGeminiApiKey();
    if (!GEMINI_API_KEY) {
      throw new Error('GOOGLE_GENAI_API_KEY or GEMINI_API_KEY is not configured');
    }

    let systemPrompt = 'You are a helpful Japanese language tutor. Provide clear, concise explanations.';
    let userPrompt = '';

    if (messages && messages.length > 0) {
      // Chat mode
      const contextText = selectedSentence || text;
      systemPrompt = `You are a Japanese language tutor. The user is studying this Japanese text: "${contextText}". Help them understand grammar, vocabulary, and context. Answer their questions clearly and concisely.`;
      userPrompt = messages[messages.length - 1].content;
    } else {
      // Initial text analysis
      systemPrompt = 'You are a Japanese language tutor. Analyze the provided Japanese text and give insights about its content, difficulty level, and key themes.';
      userPrompt = `Please analyze this Japanese text:\n\n${text}`;
    }

    const prompt = `${systemPrompt}\n\n${userPrompt}`;
    const response = await callGemini(GEMINI_API_KEY, prompt);

    if (!response) {
      throw new Error('Failed to get response from Gemini API');
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
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
      
      throw new Error(`AI API returned ${response.status}`);
    }

    const data = await response.json();
    const analysis = getGeminiText(data);

    console.log('Text analysis completed');

    return new Response(
      JSON.stringify({ analysis }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in analyze-text function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
