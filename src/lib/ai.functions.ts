import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

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
    const gateway = createLovableAiGatewayProvider(key);
    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: SYMPTOM_SYSTEM,
      prompt: `Symptoms reported: ${data.symptoms}${data.age ? `\nAge: ${data.age}` : ""}${data.contextNotes ? `\nContext: ${data.contextNotes}` : ""}\n\nReturn structured analysis.`,
      output: Output.object({ schema: symptomSchema }),
    });
    return output;
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
    const gateway = createLovableAiGatewayProvider(key);
    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: JOURNAL_SYSTEM,
      prompt: `Mood: ${data.mood ?? "unspecified"}\n\nEntry:\n${data.content}`,
      output: Output.object({ schema: journalSchema }),
    });
    return output;
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
    const gateway = createLovableAiGatewayProvider(key);
    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: RESEARCH_SYSTEM,
      prompt: `Topic: ${data.topic}. Produce a beginner-friendly research brief.`,
      output: Output.object({ schema: researchSchema }),
    });
    return output;
  });