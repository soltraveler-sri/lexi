import { NextResponse } from "next/server";

import { getApiUser, unauthorized } from "@/lib/api";
import { resolveProviderForUser } from "@/lib/ai/resolver";
import { checkAiRateLimit } from "@/lib/ratelimit";
import * as preferencesRepo from "@/lib/db/repos/preferences";
import * as styleEventsRepo from "@/lib/db/repos/styleEvents";

export const runtime = "nodejs";

const MIN_CORPUS_SIZE = 5;
const MAX_PAIRS = 50;
const TARGET_CANDIDATES = 7;

const SYSTEM_PROMPT = `You are studying a writer's recent rewrites to find *patterns* in how they edit their own prose. The writer wants you to propose new bullets to add to their declarative voice profile.

Rules:
- Only propose patterns you can support with at least 2 distinct example pairs from the corpus.
- Don't propose one-off edits.
- Don't propose patterns that contradict the writer's existing preferences (provided below).
- Don't propose duplicates of existing preferences.
- Phrase each proposal respectfully and instructionally — "Avoid hedging openers" not "stop being so wishy-washy".

Output strict JSON:
{
  "candidates": [
    {
      "id": string (a short slug),
      "statement": string (one-line preference, instruction-shaped),
      "rationale": string (one-line justification grounded in the corpus),
      "examples": [{ "before": string, "after": string }, ...] (1–2 entries)
    },
    ...
  ]
}

Cap at ${TARGET_CANDIDATES} entries. Reply with valid JSON only — no markdown fence, no commentary.`;

interface Candidate {
  id: string;
  statement: string;
  rationale: string;
  examples: Array<{ before: string; after: string }>;
}

function tryParse(text: string): Candidate[] | null {
  try {
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as { candidates?: unknown };
    if (!Array.isArray(parsed.candidates)) {
      return null;
    }
    const out: Candidate[] = [];
    for (const entry of parsed.candidates) {
      if (
        entry &&
        typeof entry === "object" &&
        typeof (entry as Record<string, unknown>).statement === "string" &&
        typeof (entry as Record<string, unknown>).rationale === "string"
      ) {
        const examplesValue = (entry as Record<string, unknown>).examples;
        const examples: Array<{ before: string; after: string }> = [];
        if (Array.isArray(examplesValue)) {
          for (const ex of examplesValue) {
            if (
              ex &&
              typeof ex === "object" &&
              typeof (ex as Record<string, unknown>).before === "string" &&
              typeof (ex as Record<string, unknown>).after === "string"
            ) {
              examples.push({
                before: (ex as Record<string, unknown>).before as string,
                after: (ex as Record<string, unknown>).after as string,
              });
            }
          }
        }
        const idValue = (entry as Record<string, unknown>).id;
        out.push({
          id:
            typeof idValue === "string" && idValue.trim()
              ? idValue
              : `cand_${out.length + 1}`,
          statement: (entry as Record<string, unknown>).statement as string,
          rationale: (entry as Record<string, unknown>).rationale as string,
          examples,
        });
      }
    }
    return out;
  } catch {
    return null;
  }
}

export async function POST() {
  const user = await getApiUser();
  if (!user) {
    return unauthorized();
  }

  const events = await styleEventsRepo.listForUser(user.id, MAX_PAIRS);
  const usefulEvents = events.filter(
    (event) =>
      event.eventType === "rewrite" ||
      event.eventType === "ai_suggestion_accepted" ||
      event.eventType === "ai_suggestion_edited",
  );

  if (usefulEvents.length < MIN_CORPUS_SIZE) {
    return NextResponse.json({
      candidates: [],
      reason: "insufficient_corpus",
      have: usefulEvents.length,
      need: MIN_CORPUS_SIZE,
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

  const preferences = await preferencesRepo.getForUser(user.id);
  const existingPrefs = preferences?.content?.trim() || "(none yet)";

  const corpus = usefulEvents
    .slice(0, MAX_PAIRS)
    .map(
      (event, index) =>
        `Pair ${index + 1}:\nBefore: ${event.beforeText}\nAfter: ${event.afterText}`,
    )
    .join("\n\n");

  const prompt = [
    "Existing voice profile preferences (do not duplicate or contradict):",
    existingPrefs,
    "",
    "Recent edit pairs:",
    corpus,
    "",
    `Propose up to ${TARGET_CANDIDATES} pattern-level preferences with grounded examples.`,
  ].join("\n");

  const response = await resolved.provider.complete({
    tier: "heavy",
    system: SYSTEM_PROMPT,
    cachedSystemBlocks: [SYSTEM_PROMPT],
    prompt,
    maxTokens: 2400,
    temperature: 0.3,
    transformId: "analyze:edits",
  });

  const candidates = tryParse(response.text);
  if (!candidates) {
    return NextResponse.json(
      {
        error: "parse_failed",
        message:
          "The model didn't return clean JSON. Try again — analysis is best-effort.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    candidates: candidates.slice(0, TARGET_CANDIDATES),
    corpusSize: usefulEvents.length,
  });
}
