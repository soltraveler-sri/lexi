import { NextResponse } from "next/server";

import {
  badRequest,
  getApiUser,
  isDocumentType,
  isVoiceContext,
  notFound,
  readJsonObject,
  readOptionalString,
  readString,
  unauthorized,
} from "@/lib/api";
import { resolveProviderForUser } from "@/lib/ai/resolver";
import { streamingResponse } from "@/lib/ai/streaming";
import { checkAiRateLimit } from "@/lib/ratelimit";
import { compileVoiceProfile } from "@/lib/style/voiceProfile";
import { getTransform } from "@/lib/transforms/registry";
import "@/lib/transforms/inline";
import type { CallTier, DocumentType, VoiceContext } from "@/types";
import type { TransformPromptInput } from "@/lib/transforms/types";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 8000;
const MAX_OUTPUT_TOKENS = 800;

type Variant = "tighter" | "warmer" | "neutral";

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

function readParameterMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "string") {
      out[key] = raw;
    }
  }
  return out;
}

function applyParameterDefaults(
  transformParameters: { id: string; default?: string; options: { value: string }[] }[] | undefined,
  provided: Record<string, string>,
): Record<string, string> {
  if (!transformParameters?.length) {
    return provided;
  }
  const out = { ...provided };
  for (const param of transformParameters) {
    const value = out[param.id];
    const allowed = param.options.map((option) => option.value);
    if (!value || !allowed.includes(value)) {
      out[param.id] = param.default ?? allowed[0];
    }
  }
  return out;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getApiUser();
  if (!user) {
    return unauthorized();
  }

  const transform = getTransform(params.id);
  if (!transform) {
    return notFound();
  }

  const body = await readJsonObject(request);
  if (!body) {
    return badRequest("invalid_json");
  }

  const beforeText = readString(body, "beforeText").slice(0, MAX_TEXT_LENGTH);
  if (transform.requiresSelection && !beforeText.trim()) {
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
  const documentType: DocumentType = isDocumentType(body.documentType)
    ? body.documentType
    : "blog_post";
  const voiceContext: VoiceContext = isVoiceContext(body.voiceContext)
    ? body.voiceContext
    : "universal";
  const tier: CallTier = isCallTier(body.tier) ? body.tier : "heavy";
  const variant: Variant = isVariant(body.variant) ? body.variant : "neutral";
  const variantId = readOptionalString(body, "variantId");
  const parameters = applyParameterDefaults(
    transform.parameters,
    readParameterMap(body.parameters),
  );

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

  const promptInput: TransformPromptInput = {
    selection: beforeText,
    surroundingBefore,
    surroundingAfter,
    documentType,
    voiceContext,
    parameters,
    variantHint: transform.variantCount === 2 ? variant : undefined,
  };
  const built = transform.buildPrompt(promptInput);

  const stream = resolved.provider.stream({
    tier,
    system: profile.compiledSystemPrompt,
    cachedSystemBlocks: profile.cachedSystemBlocks,
    prompt: built.prompt,
    maxTokens: built.maxTokens ?? MAX_OUTPUT_TOKENS,
    temperature: built.temperature,
    documentId: documentId ?? undefined,
    transformId: transform.id,
  });

  return streamingResponse(stream, {
    provider: resolved.provider.id,
    ownership: resolved.ownership,
    transformId: transform.id,
    variantId: variantId ?? variant,
  });
}
