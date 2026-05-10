import { NextResponse } from "next/server";

import {
  badRequest,
  getApiUser,
  readJsonObject,
  readString,
  unauthorized,
} from "@/lib/api";
import { resolveProviderForUser } from "@/lib/ai/resolver";
import { checkAiRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const BRIEF_MAX = 8;
const DEEP_MAX = 25;

interface QnA {
  question: string;
  answer: string;
}

const SYSTEM_PROMPT_BASE = `You are interviewing a writer to compile a voice profile prompt.
Your job is to ask one specific, well-crafted question at a time.
Each question must:
- Sound warm but efficient. The writer's time is the gating constraint.
- Justify itself in a single clause if helpful (e.g. "Some writers love long, layered sentences; others swear by short ones — which feels more like you?").
- Avoid asking for sensitive info, credentials, or anything personally identifying beyond their writing taste.
Reply with the next question and *only* the next question. No preamble. No restating prior answers.`;

const BRIEF_SCRIPT = [
  "What kinds of writing do you do most often, and who reads it?",
  "What does sentence rhythm look like for you — short and punchy, layered and flowing, or somewhere in between?",
  "What kinds of openings do you prefer or avoid? (For example: hedges like \"I think\" or \"Maybe,\" or definitive ones like \"The truth is.\")",
  "Are there words, phrases, or moves that feel like *you*, that you'd want preserved?",
  "Are there words, phrases, or moves you actively want lexi to avoid in your name?",
  "How formal or casual do you want lexi to default to when in doubt?",
  "When the writing gets long, do you prefer to compress or to lean in and let it breathe?",
];

const DEEP_BRANCH_HINTS = [
  "Push for specifics about taste in fiction vs. nonfiction.",
  "Ask about pet peeves in others' writing.",
  "Ask about who their writing voice borrows from.",
  "Probe their relationship with hedging, certainty, and conviction.",
  "Ask how they handle the question of taste vs. accessibility.",
  "Ask about their default audience and how it changes per surface.",
  "Ask what would make them stop reading their own draft.",
  "Ask what 'good' sounds like to them in a single paragraph.",
];

function isMode(value: unknown): value is "brief" | "deep" {
  return value === "brief" || value === "deep";
}

function readQnAHistory(value: unknown): QnA[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: QnA[] = [];
  for (const entry of value) {
    if (
      entry &&
      typeof entry === "object" &&
      typeof (entry as Record<string, unknown>).question === "string" &&
      typeof (entry as Record<string, unknown>).answer === "string"
    ) {
      const item = entry as { question: string; answer: string };
      out.push({ question: item.question, answer: item.answer });
    }
  }
  return out;
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return unauthorized();
  }

  const body = await readJsonObject(request);
  if (!body) {
    return badRequest("invalid_json");
  }

  const mode = isMode(body.mode) ? body.mode : "brief";
  const history = readQnAHistory(body.history);
  const limit = mode === "brief" ? BRIEF_MAX : DEEP_MAX;

  if (history.length >= limit) {
    return NextResponse.json({ done: true, question: null });
  }

  // Brief mode follows a fixed script: deterministic, predictable, fast.
  if (mode === "brief") {
    const next = BRIEF_SCRIPT[history.length] ?? null;
    return NextResponse.json({
      done: !next,
      question: next,
    });
  }

  const resolved = await resolveProviderForUser(user.id);
  if (resolved.provider.id === "stub") {
    return NextResponse.json(
      {
        error: "ai_not_configured",
        message:
          "Add a provider key in Settings, or set ANTHROPIC_API_KEY / OPENAI_API_KEY on the server.",
      },
      { status: 503 },
    );
  }

  const rateLimit = await checkAiRateLimit({
    userId: user.id,
    email: user.email ?? null,
    ownership: resolved.ownership,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const transcript = history
    .map((entry, index) => `Q${index + 1}: ${entry.question}\nA${index + 1}: ${entry.answer}`)
    .join("\n\n");

  const promptIntro = readString(body, "promptIntro");
  const branchHint =
    DEEP_BRANCH_HINTS[history.length % DEEP_BRANCH_HINTS.length] ?? "";

  const prompt = [
    "Conversation so far:",
    transcript || "(none yet)",
    "",
    promptIntro
      ? `The writer's stated goal: ${promptIntro}`
      : "The writer didn't add a stated goal.",
    "",
    `Hint for this question: ${branchHint}`,
    "",
    "Reply with the next question only.",
  ].join("\n");

  const response = await resolved.provider.complete({
    tier: "light",
    system: SYSTEM_PROMPT_BASE,
    prompt,
    maxTokens: 200,
    temperature: 0.7,
    transformId: "walkthrough:voice_profile_question",
  });

  return NextResponse.json({
    done: false,
    question: response.text.trim(),
  });
}
