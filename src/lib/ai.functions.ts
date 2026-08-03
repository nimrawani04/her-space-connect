import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

function extractJson(raw: string): unknown {
  let s = raw.trim().replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = s.search(/[\{\[]/);
  if (start === -1) throw new Error("AI returned no JSON");
  const openChar = s[start];
  const closeChar = openChar === "[" ? "]" : "}";
  const end = s.lastIndexOf(closeChar);
  if (end === -1) throw new Error("AI returned malformed JSON");
  s = s.substring(start, end + 1);
  try {
    return JSON.parse(s);
  } catch {
    const cleaned = s
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, " ");
    return JSON.parse(cleaned);
  }
}

async function generateJson<T>(args: {
  key: string;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  schemaHint: string;
}): Promise<T> {
  const gateway = createLovableAiGatewayProvider(args.key);
  const { text } = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    system: `${args.system}\n\nYou MUST respond with valid JSON only, matching this shape exactly. No markdown, no commentary.\n${args.schemaHint}`,
    prompt: args.prompt,
  });
  const parsed = extractJson(text);
  return args.schema.parse(parsed);
}

const symptomInput = z.object({
  symptoms: z.string().trim().min(3).max(2000),
  age: z.number().int().min(10).max(110).optional(),
  contextNotes: z.string().trim().max(2000).optional(),
});

const symptomSchema = z.object({
  plainEnglishSummary: z.string(),
  urgency: z.enum(["self-care", "see-a-doctor-soon", "urgent", "emergency"]),
  possibleConditions: z.array(z.object({
    name: z.string(),
    confidence: z.enum(["low", "moderate", "high"]),
    why: z.string(),
  })).max(6),
  questionsForYourDoctor: z.array(z.string()).max(8),
  selfCareSuggestions: z.array(z.string()).max(6),
  redFlags: z.array(z.string()).max(6),
  disclaimer: z.string(),
});

const SYMPTOM_SYSTEM = `You are HerSpace Health AI, an educational assistant for women's health.
You DO NOT diagnose. You explain symptoms in clear, supportive, evidence-informed language and help women prepare to talk to a clinician.
Always include: a plain-English summary, urgency tier, possible conditions to discuss (with confidence), doctor questions, gentle self-care, red flags, and a clear disclaimer.
If symptoms suggest a medical emergency (severe chest pain, stroke signs, suicidal ideation, heavy hemorrhage, severe abdominal pain with fever), set urgency to "emergency" and prioritize the red flags section.
Tone: warm, calm, clinical. Never moralize. Never assume cause.`;

export const analyzeSymptoms = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => symptomInput.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured");
    return await generateJson({
      key,
      system: SYMPTOM_SYSTEM,
      prompt: `Symptoms reported: ${data.symptoms}${data.age ? `\nAge: ${data.age}` : ""}${data.contextNotes ? `\nContext: ${data.contextNotes}` : ""}\n\nReturn structured analysis.`,
      schema: symptomSchema,
      schemaHint: `{
  "plainEnglishSummary": string,
  "urgency": "self-care" | "see-a-doctor-soon" | "urgent" | "emergency",
  "possibleConditions": [{ "name": string, "confidence": "low" | "moderate" | "high", "why": string }] (max 6),
  "questionsForYourDoctor": string[] (max 8),
  "selfCareSuggestions": string[] (max 6),
  "redFlags": string[] (max 6),
  "disclaimer": string
}`,
    });
  });

const journalInput = z.object({
  content: z.string().trim().min(10).max(8000),
  mood: z.string().trim().max(40).optional(),
});

const journalSchema = z.object({
  reflection: z.string(),
  emotionalThemes: z.array(z.string()).max(5),
  gentlePrompt: z.string(),
  copingSuggestions: z.array(z.string()).max(4),
  escalation: z.object({
    suggested: z.boolean(),
    reason: z.string().optional(),
  }),
});

const JOURNAL_SYSTEM = `You are HerSpace Wellness AI, an empathetic journaling companion for women.
You read a private entry and respond with: a brief warm reflection that mirrors what the writer shared, 1-5 emotional themes, one gentle reflection prompt, 1-4 grounded coping suggestions, and an escalation flag if the entry suggests crisis (suicidal ideation, abuse, self-harm). When escalation.suggested = true, name supportive professional resources in coping suggestions.
Never diagnose. Never minimize. Never lecture. Be human, brief, and respectful of agency.`;

export const analyzeJournal = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => journalInput.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured");
    return await generateJson({
      key,
      system: JOURNAL_SYSTEM,
      prompt: `Mood: ${data.mood ?? "unspecified"}\n\nEntry:\n${data.content}`,
      schema: journalSchema,
      schemaHint: `{
  "reflection": string,
  "emotionalThemes": string[] (max 5),
  "gentlePrompt": string,
  "copingSuggestions": string[] (max 4),
  "escalation": { "suggested": boolean, "reason": string (optional) }
}`,
    });
  });

const researchInput = z.object({
  topic: z.string().trim().min(2).max(200),
});

const researchSchema = z.object({
  beginnerExplanation: z.string(),
  keyFindings: z.array(z.string()).max(6),
  practicalTakeaways: z.array(z.string()).max(6),
  mythVsFact: z.array(z.object({ myth: z.string(), fact: z.string() })).max(5),
  faqs: z.array(z.object({ q: z.string(), a: z.string() })).max(6),
  suggestedSearches: z.array(z.string()).max(4),
});

const RESEARCH_SYSTEM = `You are HerSpace Research Simplifier. Summarize the current scientific consensus on women's health topics (PCOS, endometriosis, menopause, fertility, breast health, nutrition, mental health, fitness, etc.) in plain language.
Cite the type of evidence (RCT, meta-analysis, observational) when relevant, but do NOT fabricate paper titles or DOIs. Suggest searches readers can run on PubMed/NIH/WHO.
Never give individualized medical advice.`;

export const simplifyResearch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => researchInput.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured");
    return await generateJson({
      key,
      system: RESEARCH_SYSTEM,
      prompt: `Topic: ${data.topic}. Produce a beginner-friendly research brief.`,
      schema: researchSchema,
      schemaHint: `{
  "beginnerExplanation": string,
  "keyFindings": string[] (max 6),
  "practicalTakeaways": string[] (max 6),
  "mythVsFact": [{ "myth": string, "fact": string }] (max 5),
  "faqs": [{ "q": string, "a": string }] (max 6),
  "suggestedSearches": string[] (max 4)
}`,
    });
  });

// ---------------- Cycle prediction ----------------

const predictInput = z.object({
  recentStarts: z.array(z.string()).max(24),
  avgCycleLength: z.number().nullable(),
  avgPeriodLength: z.number().nullable(),
  regularityLabel: z.string().nullable(),
  today: z.string(),
  avgCramp: z.number().nullable().optional(),
  peakCramp: z.number().nullable().optional(),
  severeCrampCycles: z.number().nullable().optional(),
});

const predictSchema = z.object({
  nextPeriodLow: z.string(),
  nextPeriodHigh: z.string(),
  nextPeriodEnd: z.string(),
  fertileWindowLow: z.string(),
  fertileWindowHigh: z.string(),
  ovulationDay: z.string(),
  pmsStart: z.string(),
  confidence: z.number().min(0).max(100),
  isLate: z.boolean(),
  summary: z.string(),
  crampSeverityNote: z.string().optional(),
  urgencyLevel: z.enum(["routine", "monitor", "discuss-with-clinician"]).optional(),
});

const PREDICT_SYSTEM = `You are HerSpace Cycle Prediction AI.
Given a woman's recent period start dates and averages, estimate her next cycle phases.
Use the median cycle length and variance to compute a date range for the next period (low/high), the fertile window (typically days 11-16 from last period start when cycle is 28d), ovulation (~14 days before next period), PMS phase (~5 days before next period), and an expected end date (start + avg period length).
If today is past the predicted high date, set isLate=true.
Confidence: 50% with 2 cycles, +8% per additional cycle up to 95%; subtract 15% if regularity is "Irregular"; subtract another 5% if avgCramp is 7+ (cramps that severe often signal underlying variability worth flagging).
Cramp scoring (0–10 scale, logged per period):
  - avgCramp 0–3 → urgencyLevel "routine"; no crampSeverityNote needed unless peakCramp ≥ 7.
  - avgCramp 4–6 OR peakCramp 7–8 → urgencyLevel "monitor"; crampSeverityNote should acknowledge moderate cramps and suggest tracking triggers (sleep, stress, NSAID timing).
  - avgCramp ≥ 7, peakCramp ≥ 9, OR severeCrampCycles ≥ 2 → urgencyLevel "discuss-with-clinician"; crampSeverityNote must be specific (e.g. mention endometriosis, adenomyosis, or fibroid screening worth discussing) and reference the numeric trend, while still avoiding diagnosis.
The summary stays one sentence about the date prediction. Put cramp guidance ONLY in crampSeverityNote.
Return ISO date strings (YYYY-MM-DD).`;

export const predictCycle = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => predictInput.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured");
    return await generateJson({
      key,
      system: PREDICT_SYSTEM,
      prompt: `Today: ${data.today}
Recent period start dates (newest first): ${data.recentStarts.join(", ") || "none"}
Avg cycle length: ${data.avgCycleLength ?? "unknown"}
Avg period length: ${data.avgPeriodLength ?? "unknown"}
Regularity: ${data.regularityLabel ?? "unknown"}
Avg cramp (0–10): ${data.avgCramp ?? "unknown"}
Peak cramp (0–10): ${data.peakCramp ?? "unknown"}
Cycles with severe cramps (≥7): ${data.severeCrampCycles ?? 0}

Return structured prediction; factor cramp severity into confidence and crampSeverityNote per the rules.`,
      schema: predictSchema,
      schemaHint: `{
  "nextPeriodLow": "YYYY-MM-DD",
  "nextPeriodHigh": "YYYY-MM-DD",
  "nextPeriodEnd": "YYYY-MM-DD",
  "fertileWindowLow": "YYYY-MM-DD",
  "fertileWindowHigh": "YYYY-MM-DD",
  "ovulationDay": "YYYY-MM-DD",
  "pmsStart": "YYYY-MM-DD",
  "confidence": number (0-100),
  "isLate": boolean,
  "summary": string,
  "crampSeverityNote": string (optional, omit only when avgCramp and peakCramp are both low),
  "urgencyLevel": "routine" | "monitor" | "discuss-with-clinician"
}`,
    });
  });

// ---------------- Health insights ----------------

const insightsInput = z.object({
  cycleHistory: z.string().max(8000),
  wellnessHistory: z.string().max(8000),
});

const insightsSchema = z.object({
  insights: z.array(z.object({
    title: z.string(),
    detail: z.string(),
    category: z.enum(["cycle", "mood", "energy", "sleep", "symptoms", "lifestyle"]),
    confidence: z.enum(["low", "moderate", "high"]),
  })).max(8),
  doctorQuestions: z.array(z.string()).max(6),
  watchOuts: z.array(z.string()).max(4),
});

const INSIGHTS_SYSTEM = `You are HerSpace Pattern Detection AI.
Read a user's recent cycle entries and daily wellness logs, then surface 5–8 plain-language patterns: cycle-symptom links, mood/energy by phase, sleep and lifestyle correlations.
Examples of the tone we want: "Your acne appears most frequently around ovulation." "You report higher energy during the follicular phase." "Heavy bleeding has been recorded in three consecutive cycles." "Your sleep quality decreases two days before your period."
Be concrete, evidence-based, never diagnostic. Cite the time range you analyzed. Surface watchOuts only when something looks clinically notable (heavy bleeding cycle-after-cycle, growing irregularity, etc.).`;

export const generateHealthInsights = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => insightsInput.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured");
    return await generateJson({
      key,
      system: INSIGHTS_SYSTEM,
      prompt: `CYCLE HISTORY (newest first):\n${data.cycleHistory}\n\nWELLNESS LOGS (newest first):\n${data.wellnessHistory}\n\nReturn structured insights.`,
      schema: insightsSchema,
      schemaHint: `{
  "insights": [{ "title": string, "detail": string, "category": "cycle"|"mood"|"energy"|"sleep"|"symptoms"|"lifestyle", "confidence": "low"|"moderate"|"high" }] (max 8),
  "doctorQuestions": string[] (max 6),
  "watchOuts": string[] (max 4)
}`,
    });
  });
// ---------------- Pregnancy companion ----------------

const companionInput = z.object({
  week: z.number().int().min(1).max(42),
  trimester: z.number().int().min(1).max(3),
  dueDate: z.string().max(20).optional(),
  recentLogs: z.string().max(4000).optional(),
  question: z.string().trim().max(1000).optional(),
});

const companionSchema = z.object({
  greeting: z.string(),
  babyUpdate: z.string(),
  bodyUpdate: z.string(),
  todaysTip: z.string(),
  nutritionFocus: z.array(z.string()).max(4),
  watchFor: z.array(z.string()).max(4),
  answer: z.string().optional(),
  askYourClinician: z.array(z.string()).max(4),
  disclaimer: z.string(),
});

const COMPANION_SYSTEM = `You are the HerSpace Pregnancy Companion: a warm, calm, evidence-based prenatal guide.
Speak directly to the pregnant person in second person, like a knowledgeable friend who is also a midwife.
Ground every message in the given gestational week. Example tone: "You're 18 weeks pregnant. Your baby can now hear sounds. Today, try talking or reading aloud - it can be a lovely bonding activity."
Never diagnose, never prescribe doses, never contradict a clinician. If a question touches bleeding, reduced movements, severe pain, vision changes or high blood pressure, tell the user to contact their maternity unit now.
If a question is provided, answer it plainly in "answer" (2-4 sentences, practical, culturally neutral).
Always end with an educational-not-medical-advice disclaimer.`;

export const pregnancyCompanion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => companionInput.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured");
    return await generateJson({
      key,
      system: COMPANION_SYSTEM,
      prompt: `Gestational week: ${data.week} (trimester ${data.trimester}).
Estimated due date: ${data.dueDate ?? "unknown"}.
Recent self-logged data: ${data.recentLogs ?? "none logged yet"}.
${data.question ? `Her question: "${data.question}"` : "No specific question — give this week's companion update."}
Return the structured companion update.`,
      schema: companionSchema,
      schemaHint: `{
  "greeting": string,
  "babyUpdate": string,
  "bodyUpdate": string,
  "todaysTip": string,
  "nutritionFocus": string[] (max 4),
  "watchFor": string[] (max 4),
  "answer": string (only when a question was asked),
  "askYourClinician": string[] (max 4),
  "disclaimer": string
}`,
    });
  });
