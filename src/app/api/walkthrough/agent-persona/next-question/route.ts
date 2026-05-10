import { NextResponse } from "next/server";

import {
  badRequest,
  getApiUser,
  readJsonObject,
  unauthorized,
} from "@/lib/api";
import { resolveProviderForUser } from "@/lib/ai/resolver";
import { checkAiRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const BRIEF_MAX = 8;
const DEEP_MAX = 22;

const BRIEF_SCRIPT: string[] = [
  "What's a one-line description of this agent — what role do they play in your writing?",
  "What kind of feedback do you want them to give? (Pure copy-edit, structural critique, encouragement, sharp questions, something else?)",
  "How blunt should they be? Do you want them gentle, frank, or ruthless?",
  "Should they ever rewrite text, or only respond with comments and questions?",
  "Should they write in *your* voice, or bring their own perspective?",
  "What taste should they bring? (For example: \"editor at The Atlantic\", \"a no-bullshit founder\", \"a poet's eye for cadence\".)",
  "Are there things you definitely don't want them to do?",
];

const DEEP_BRANCH_HINTS = [
  "Probe their relationship with hedging vs. directness.",
  "Ask what literary or professional touchstones the agent should embody.",
  "Ask what 'too far' looks like for this agent.",
  "Ask whether they're better suited to first drafts or polish passes.",
  "Imagine they get a paragraph the writer secretly loves but suspects is overwrought — what should they say?",
  "Ask about the kinds of things this agent should refuse to do.",
  "Ask what success looks like in their ideal output.",
  "Ask how they should handle disagreement with the writer's framing.",
];

interface QnA {
  question: string;
  answer: string;
}

const SYSTEM_PROMPT = `You are interviewing a writer to help them define a custom AI agent persona for editing or writing.
Your job is to ask one specific, well-crafted question at a time. Each question should:
- Get at the agent's role, taste, tone, scope, or constraints.
- Sound warm and curious, not clinical.
- Avoid asking about technical capabilities the system doesn't support (web search, memory, multi-agent coordination, document-walking — none of those are available).

Reply with the next question only. No preamble.`;

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

  if (mode === "brief") {
    return NextResponse.json({
      done: history.length >= BRIEF_SCRIPT.length,
      question: BRIEF_SCRIPT[history.length] ?? null,
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

  const branchHint = DEEP_BRANCH_HINTS[history.length % DEEP_BRANCH_HINTS.length];

  const prompt = [
    "Conversation so far:",
    transcript || "(none yet)",
    "",
    `Hint for this question: ${branchHint}`,
    "",
    "Reply with the next question only.",
  ].join("\n");

  const response = await resolved.provider.complete({
    tier: "light",
    system: SYSTEM_PROMPT,
    prompt,
    maxTokens: 200,
    temperature: 0.7,
    transformId: "walkthrough:agent_persona_question",
  });

  return NextResponse.json({ done: false, question: response.text.trim() });
}
