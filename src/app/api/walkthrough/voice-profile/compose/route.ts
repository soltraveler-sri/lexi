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

interface QnA {
  question: string;
  answer: string;
}

const COMPOSE_SYSTEM = `You are writing a voice-profile prompt for a writer based on their answers in a short interview.

Your output is a clean, well-organized markdown block the writer can paste into a "preferences" field. The audience for this prompt is an LLM that will rewrite text on the writer's behalf.

Rules:
- Group related guidance under short headings (e.g. "Cadence", "Openings", "Diction", "Things to preserve", "Things to avoid").
- Keep each bullet under one line where possible.
- Use the writer's own framing where their answers gave you specific preferences. Don't invent new constraints they didn't imply.
- Don't pretend to know writing samples you haven't seen. Phrase preferences as instructions, not as observations about their corpus.
- Output only the markdown block. No preamble, no commentary, no quoting back the questions.`;

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

  const history = readQnAHistory(body.history);
  if (history.length === 0) {
    return badRequest("history_required");
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
    .map(
      (entry, index) =>
        `Q${index + 1}: ${entry.question}\nA${index + 1}: ${entry.answer.trim()}`,
    )
    .join("\n\n");

  const response = await resolved.provider.complete({
    tier: "heavy",
    system: COMPOSE_SYSTEM,
    prompt: transcript,
    maxTokens: 1500,
    temperature: 0.4,
    transformId: "walkthrough:voice_profile_compose",
  });

  return NextResponse.json({ profile: response.text.trim() });
}
