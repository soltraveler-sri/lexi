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
import { getDocTransform } from "@/lib/transforms/doc/registry";
import "@/lib/transforms/doc";
import type { DocumentType, VoiceContext } from "@/types";

export const runtime = "nodejs";

const MAX_INPUT_LENGTH = 30000;

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

function looksLikeRefusal(_text: string) {
  // Placeholder for downstream guardrails; SoC → Draft can produce short
  // outputs legitimately, so we don't block based on length alone here.
  return false;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getApiUser();
  if (!user) {
    return unauthorized();
  }

  const fullId = params.id.startsWith("doc:") ? params.id : `doc:${params.id}`;
  const transform = getDocTransform(fullId);
  if (!transform) {
    return notFound();
  }

  const body = await readJsonObject(request);
  if (!body) {
    return badRequest("invalid_json");
  }

  const fullDocumentText = readString(body, "fullDocumentText").slice(
    0,
    MAX_INPUT_LENGTH,
  );

  if (transform.requiresContent && !fullDocumentText.trim()) {
    return badRequest("document_content_required");
  }

  const documentId = readOptionalString(body, "documentId");
  const documentType: DocumentType = isDocumentType(body.documentType)
    ? body.documentType
    : "blog_post";
  const voiceContext: VoiceContext = isVoiceContext(body.voiceContext)
    ? body.voiceContext
    : "universal";
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
      { status: 429 },
    );
  }

  // Doc-level operations always run the heavy voice profile so prompt caching
  // pays off across repeated invocations.
  const profile = await compileVoiceProfile(user.id, voiceContext, "heavy", false);

  const built = transform.buildPrompt({
    fullDocumentText,
    documentType,
    voiceContext,
    parameters,
  });

  const stream = resolved.provider.stream({
    tier: "heavy",
    system: profile.compiledSystemPrompt,
    cachedSystemBlocks: [profile.compiledSystemPrompt],
    prompt: built.prompt,
    maxTokens: built.maxTokens,
    temperature: built.temperature,
    documentId: documentId ?? undefined,
    transformId: transform.id,
  });

  return streamingResponse(stream, {
    provider: resolved.provider.id,
    ownership: resolved.ownership,
    transformId: transform.id,
    finishReason: looksLikeRefusal("") ? "refusal" : undefined,
  });
}
