import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export interface AiModelConfig {
  provider: ReturnType<typeof createOpenAICompatible>;
  modelName: string;
}

export function getAiModelConfig(): AiModelConfig | null {
  const env = process.env;

  if (env.LOVABLE_API_KEY) {
    const provider = createOpenAICompatible({
      name: "lovable-ai-gateway",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: { "Lovable-API-Key": env.LOVABLE_API_KEY },
    });
    return {
      provider,
      modelName: "google/gemini-2.5-flash",
    };
  }

  const geminiKey = env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY || env.GOOGLE_API_KEY;
  if (geminiKey) {
    const provider = createOpenAICompatible({
      name: "google-gemini",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey: geminiKey,
    });
    return {
      provider,
      modelName: "gemini-2.5-flash",
    };
  }

  if (env.OPENAI_API_KEY) {
    const provider = createOpenAICompatible({
      name: "openai",
      baseURL: "https://api.openai.com/v1",
      apiKey: env.OPENAI_API_KEY,
    });
    return {
      provider,
      modelName: "gpt-4o-mini",
    };
  }

  if (env.GROQ_API_KEY) {
    const provider = createOpenAICompatible({
      name: "groq",
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: env.GROQ_API_KEY,
    });
    return {
      provider,
      modelName: "llama-3.3-70b-versatile",
    };
  }

  return null;
}

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}