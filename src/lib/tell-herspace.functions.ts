import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fallbackChatMentalWellness } from "./ai-fallback";

const MODEL = "openai/gpt-6-astra";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";

const input = z.object({
  message: z.string().trim().min(1).max(4000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(6000) }))
    .max(12)
    .optional(),
  country: z.string().trim().max(80).optional(),
});

export const SUPPORT_AREAS = [
  "safety", "health", "mental_wellbeing", "legal", "workplace_or_education",
  "financial", "relationships", "reproductive", "housing", "other",
] as const;

const outputSchema = z.object({
  reply: z.string(),
  theme: z.string(),
  urgency: z.enum(["emergency", "urgent", "soon", "routine"]),
  dangerCheck: z.string().nullable(),
  supportAreas: z.array(z.enum(SUPPORT_AREAS)),
  followUpQuestions: z.array(z.string()),
  nextSteps: z.array(z.object({ title: z.string(), detail: z.string() })),
  resources: z.array(z.object({ name: z.string(), what: z.string(), how: z.string() })),
  documentsToPrepare: z.array(z.string()),
});
export type TellHerSpaceResult = z.infer<typeof outputSchema>;

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "theme", "urgency", "dangerCheck", "supportAreas", "followUpQuestions", "nextSteps", "resources", "documentsToPrepare"],
  properties: {
    reply: { type: "string" },
    theme: { type: "string" },
    urgency: { type: "string", enum: ["emergency", "urgent", "soon", "routine"] },
    dangerCheck: { type: ["string", "null"] },
    supportAreas: { type: "array", items: { type: "string", enum: [...SUPPORT_AREAS] } },
    followUpQuestions: { type: "array", items: { type: "string" } },
    nextSteps: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["title", "detail"], properties: { title: { type: "string" }, detail: { type: "string" } } },
    },
    resources: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["name", "what", "how"], properties: { name: { type: "string" }, what: { type: "string" }, how: { type: "string" } } },
    },
    documentsToPrepare: { type: "array", items: { type: "string" } },
  },
};

const SYSTEM = `You are "Tell HerSpace", a navigation layer between a woman's problem and the right help.
She describes what is happening in her own words; she does NOT need to know what category it is. Your job:
1. UNDERSTAND the actual situation she described. Respond specifically to her words and details — never a generic or canned reply, never steer to an unrelated topic.
2. CHECK URGENCY. urgency = "emergency" if she may be in immediate physical danger, suicidal, or has a medical emergency (heavy bleeding, severe pain with fever, stroke signs, etc.). "urgent" = needs action within a day or two. "soon" = should act in the coming weeks. "routine" otherwise.
   If danger is possible but unclear (threats, abuse, stalking, self-harm hints), set dangerCheck to one short direct question like "Are you safe right now, or is he nearby?" Otherwise null.
   For emergency: the first line of reply must tell her to contact local emergency services now, and nextSteps must start with that.
3. IDENTIFY SUPPORT AREAS (can be several: e.g. safety + legal + mental_wellbeing).
4. GUIDE HER: reply = 2-4 short warm paragraphs in plain language explaining what is going on and her options. nextSteps = 3-5 concrete, ordered, practical steps (title + one-sentence detail).
   documentsToPrepare = things to write down / gather (chronological incident log, evidence, symptom diary, questions for the doctor) when relevant, else [].
5. CONNECT TO REAL HELP: resources = 2-5 types of verified help (helplines, public clinics, legal aid, university grievance/ICC, women's commissions, shelters). Only name real, well-known services; if her country is known prefer that country's services (e.g. India: 112 emergency, 181 Women Helpline, 1930 cyber crime, NCW, Tele-MANAS 14416; US: 911, 988, National DV Hotline 1-800-799-7233). If unsure of country, describe the type of service and how to find it. Never invent phone numbers.
6. followUpQuestions = 0-3 short questions that would help you guide her better (written as things she could answer).
Rules: never diagnose, never replace a doctor/lawyer/counsellor/emergency service, never blame her, never moralize. theme = 2-5 word label of her situation.`;

async function callModel(apiKey: string, data: z.infer<typeof input>): Promise<TellHerSpaceResult> {
  const msgs = [
    ...(data.history ?? []).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: `${data.country ? `(Her country: ${data.country})\n` : ""}${data.message}` },
  ];
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: MODEL,
      instructions: SYSTEM,
      input: msgs,
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      text: { format: { type: "json_schema", name: "tell_herspace", strict: true, schema: jsonSchema } },
    }),
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    const err = new Error(`AI request failed [${res.status}]: ${body.slice(0, 300)}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  // Consume SSE stream, collecting output text
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const ev = JSON.parse(payload);
        if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") text += ev.delta;
        if (ev.type === "response.failed" || ev.type === "error") throw new Error(ev.error?.message ?? "AI response failed");
      } catch (e) {
        if (e instanceof Error && e.message.includes("failed")) throw e;
      }
    }
  }
  if (!text.trim()) throw new Error("AI returned no answer");
  return outputSchema.parse(JSON.parse(text));
}

function fallback(data: z.infer<typeof input>): TellHerSpaceResult {
  const f = fallbackChatMentalWellness(data);
  const t = data.message.toLowerCase();
  const danger = /(threat|hit|beat|scared|stalk|follow|abuse|kill|die|suicid|hurt)/.test(t);
  return {
    reply: f.reply,
    theme: f.theme,
    urgency: /(kill myself|suicid|want to die|bleeding heavily)/.test(t) ? "emergency" : danger ? "urgent" : "routine",
    dangerCheck: danger ? "Are you safe right now? If not, please call your local emergency number." : null,
    supportAreas: danger ? ["safety"] : ["mental_wellbeing"],
    followUpQuestions: [],
    nextSteps: f.suggestedActions.map((a) => ({ title: a, detail: "" })),
    resources: [],
    documentsToPrepare: [],
  };
}

export const tellHerSpace = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data }): Promise<TellHerSpaceResult & { offline?: boolean }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { ...fallback(data), offline: true };
    try {
      return await callModel(key, data);
    } catch (err) {
      const status = (err as { status?: number }).status;
      console.error("Tell HerSpace AI error:", err);
      if (status === 402) throw new Error("HerSpace AI is out of credits right now. Please try again later.");
      if (status === 429) throw new Error("HerSpace is busy right now. Please wait a moment and try again.");
      return { ...fallback(data), offline: true };
    }
  });
