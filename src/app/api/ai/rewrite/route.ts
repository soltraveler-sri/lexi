import { NextResponse } from "next/server";

import {
  badRequest,
  getApiUser,
  isDocumentType,
  isVoiceContext,
  readJsonObject,
  readOptionalString,
  readString,
  unauthorized,
} from "@/lib/api";
import { resolveProviderForUser } from "@/lib/ai/resolver";
import { streamingResponse } from "@/lib/ai/streaming";
import { checkAiRateLimit } from "@/lib/ratelimit";
import { compileVoiceProfile } from "@/lib/style/voiceProfile";
import type { CallTier, DocumentType, VoiceContext } from "@/types";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 8000;
const MAX_OUTPUT_TOKENS = 800;

type Variant = "tighter" | "warmer" | "neutral";

const VARIANT_INSTRUCTION: Record<Variant, string> = {
  tighter:
    "Bias your rewrite toward a tighter, more direct cadence. Cut hedges, trim filler, prefer plain verbs.",
  warmer:
    "Bias your rewrite toward a warmer, more conversational cadence. Keep the meaning steady; let the writing breathe.",
  neutral: "",
};

const VARIANT_TEMPERATURE: Record<Variant, number> = {
  tighter: 0.5,
  warmer: 0.85,
  neutral: 0.7,
};

function isVariant(value: unknown): value is Variant {
  return value === "tighter" || value === "warmer" || value === "neutral";
}

function isCallTier(value: unknown): value is CallTier {
  return value === "light" || value === "heavy";
}

function truncate(text: string, length: number) {
  if (text.length <= length) {
    return text;
  }
  return text.slice(text.length - length);
}

function buildPrompt(input: {
  beforeText: string;
  surroundingBefore: string;
  surroundingAfter: string;
  documentType: DocumentType;
  voiceContext: VoiceContext;
  instruction: string | null;
  variant: Variant;
}) {
  const lines: string[] = [];

  lines.push(
    `Document type: ${input.documentType.replace("_", " ")}`,
    `Voice context: ${input.voiceContext.replace("_", " ")}`,
  );

  if (input.surroundingBefore.trim()) {
    lines.push("", "Preceding context:", input.surroundingBefore.trim());
  }

  lines.push("", "Passage to rewrite:", input.beforeText.trim());

  if (input.surroundingAfter.trim()) {
    lines.push("", "Following context:", input.surroundingAfter.trim());
  }

  lines.push(
    "",
    "Instructions:",
    input.instruction?.trim() ||
      "Rewrite the passage in the writer's voice while preserving meaning and continuity with surrounding context.",
  );

  if (VARIANT_INSTRUCTION[input.variant]) {
    lines.push(VARIANT_INSTRUCTION[input.variant]);
  }

  lines.push(
    "",
    "Return only the rewritten passage. Do not include quotes, labels, explanations, or commentary.",
  );

  return lines.join("\n");
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

  const beforeText = readString(body, "beforeText").slice(0, MAX_TEXT_LENGTH);

  if (!beforeText.trim()) {
    return badRequest("before_text_required");
  }

  const documentId = readOptionalString(body, "documentId");
  const surroundingBefore = truncate(
    readString(body, "surroundingBefore"),
    MAX_TEXT_LENGTH,
  );
  const surroundingAfter = readString(body, "surroundingAfter").slice(
    0,
    MAX_TEXT_LENGTH,
  );
  const instruction = readOptionalString(body, "instruction");
  const documentType: DocumentType = isDocumentType(body.documentType)
    ? body.documentType
    : "blog_post";
  const voiceContext: VoiceContext = isVoiceContext(body.voiceContext)
    ? body.voiceContext
    : "universal";
  const tier: CallTier = isCallTier(body.tier) ? body.tier : "heavy";
  const variant: Variant = isVariant(body.variant) ? body.variant : "neutral";
  const variantId = readOptionalString(body, "variantId");

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
    return NextResponse.json(
      {
        error: "rate_limited",
        message:
          rateLimit.reason === "hour"
            ? "AI request limit reached for the past hour. Try again later."
            : "Daily AI request limit reached. Try again tomorrow.",
        usedLastHour: rateLimit.usedLastHour,
        usedLastDay: rateLimit.usedLastDay,
        limitPerHour: rateLimit.limitPerHour,
        limitPerDay: rateLimit.limitPerDay,
      },
      {
        status: 429,
        headers: rateLimit.retryAfterSeconds
          ? { "Retry-After": String(rateLimit.retryAfterSeconds) }
          : undefined,
      },
    );
  }

  const profile = await compileVoiceProfile(user.id, voiceContext, tier, false);

  const prompt = buildPrompt({
    beforeText,
    surroundingBefore,
    surroundingAfter,
    documentType,
    voiceContext,
    instruction,
    variant,
  });

  const stream = resolved.provider.stream({
    tier,
    system: profile.compiledSystemPrompt,
    cachedSystemBlocks: profile.cachedSystemBlocks,
    prompt,
    maxTokens: MAX_OUTPUT_TOKENS,
    temperature: VARIANT_TEMPERATURE[variant],
    documentId: documentId ?? undefined,
    transformId: "rewrite",
  });

  return streamingResponse(stream, {
    provider: resolved.provider.id,
    ownership: resolved.ownership,
    transformId: "rewrite",
    variantId: variantId ?? variant,
  });
}
