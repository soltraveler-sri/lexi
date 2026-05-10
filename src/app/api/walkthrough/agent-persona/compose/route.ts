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

const COMPOSE_SYSTEM = `You are turning a short interview into a custom AI agent persona definition.

Output strict JSON with these fields:
{
  "name": string (a short, memorable agent name, no quotes),
  "role": "editor" | "author" | "critic" | "other",
  "outputKind": "rewrite" | "response",
  "usesVoiceProfile": boolean,
  "description": string (one-line summary the roster shows),
  "personaPrompt": string (the system prompt the agent will use)
}

Rules for personaPrompt:
- Address the agent in second person ("You are the…").
- State the agent's role, scope, tone, and what they should refuse.
- Be specific. Don't reference capabilities the host system doesn't support (web search, memory, multi-agent coordination, document-walking).
- 2–6 short paragraphs.

Reply with valid JSON only — no markdown fence, no commentary.`;

interface QnA {
  question: string;
  answer: string;
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

interface DraftPersona {
  name: string;
  role: "editor" | "author" | "critic" | "other";
  outputKind: "rewrite" | "response";
  usesVoiceProfile: boolean;
  description: string;
  personaPrompt: string;
}

function isRole(value: unknown): value is DraftPersona["role"] {
  return (
    value === "editor" || value === "author" || value === "critic" || value === "other"
  );
}

function tryParse(text: string): DraftPersona | null {
  try {
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    if (
      typeof parsed.name === "string" &&
      isRole(parsed.role) &&
      (parsed.outputKind === "rewrite" || parsed.outputKind === "response") &&
      typeof parsed.usesVoiceProfile === "boolean" &&
      typeof parsed.description === "string" &&
      typeof parsed.personaPrompt === "string"
    ) {
      return parsed as unknown as DraftPersona;
    }
  } catch {
    return null;
  }
  return null;
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
    maxTokens: 1200,
    temperature: 0.4,
    transformId: "walkthrough:agent_persona_compose",
  });

  const parsed = tryParse(response.text);
  if (!parsed) {
    return NextResponse.json(
      {
        error: "compose_failed",
        message:
          "The model returned a draft we couldn't parse cleanly. Try re-running the walkthrough.",
        raw: response.text,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ persona: parsed });
}
