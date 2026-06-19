import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CAMB_TTS_URL = "https://client.camb.ai/apis/tts-stream";
const DEFAULT_CAMB_VOICE_ID = 171047;
const DEFAULT_CAMB_LANGUAGE_ID = 88;
const DEFAULT_CAMB_SPEECH_MODEL = "mars-flash";

type TtsRequest = {
  text?: unknown;
  voice?: unknown;
  speakingRate?: unknown;
  speaking_rate?: unknown;
};

const jsonResponse = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getCambApiKey = () => {
  const apiKey = Deno.env.get("CAMB_API_KEY");
  if (!apiKey) {
    throw new Error("CAMB_API_KEY is not configured");
  }
  return apiKey;
};

const getVoiceId = (voice: unknown) => {
  if (typeof voice === "number" && Number.isFinite(voice)) {
    return voice;
  }

  if (typeof voice === "string" && voice.trim()) {
    const parsed = Number(voice);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const envVoiceId = Number(Deno.env.get("CAMB_VOICE_ID"));
  return Number.isFinite(envVoiceId) ? envVoiceId : DEFAULT_CAMB_VOICE_ID;
};

const getSpeakingRate = (speakingRate: unknown) => {
  if (typeof speakingRate === "number" && Number.isFinite(speakingRate)) {
    return speakingRate;
  }

  if (typeof speakingRate === "string" && speakingRate.trim()) {
    const parsed = Number(speakingRate);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const getCambErrorMessage = (status: number) => {
  if (status === 401 || status === 403) {
    return "CAMB.AI API key is invalid or not authorized.";
  }

  if (status === 402) {
    return "CAMB.AI credits are exhausted. Please check your billing settings.";
  }

  if (status === 429) {
    return "Too many TTS requests. Please try again later.";
  }

  return "CAMB.AI text-to-speech request failed.";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice, speakingRate, speaking_rate } = (await req.json()) as TtsRequest;

    if (typeof text !== "string" || !text.trim()) {
      return jsonResponse({ error: "Text is required" }, 400);
    }

    const inputText = text.trim();
    const ttsText = inputText.length < 3 ? `${inputText}..` : inputText;
    const rate = getSpeakingRate(speakingRate ?? speaking_rate);

    const response = await fetch(CAMB_TTS_URL, {
      method: "POST",
      headers: {
        "x-api-key": getCambApiKey(),
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: ttsText,
        voice_id: getVoiceId(voice),
        language: DEFAULT_CAMB_LANGUAGE_ID,
        speech_model: DEFAULT_CAMB_SPEECH_MODEL,
        ...(rate === undefined ? {} : { speaking_rate: rate }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("CAMB.AI TTS error:", response.status, errorText);

      return jsonResponse(
        { error: getCambErrorMessage(response.status) },
        response.status,
      );
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        // supabase-js v2 only deserializes function responses as Blob for a
        // small set of binary content types. Keep this generic so MP3 bytes are
        // not decoded as text on the client.
        "Content-Type": "application/octet-stream",
        "X-Audio-Content-Type": response.headers.get("Content-Type") ?? "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      500,
    );
  }
});
