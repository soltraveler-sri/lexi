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
import * as agentsRepo from "@/lib/db/repos/agents";
import { compileVoiceProfile } from "@/lib/style/voiceProfile";
import { getStarter } from "@/lib/agents/starters";
import type { DocumentType, VoiceContext } from "@/types";

export const runtime = "nodejs";

const MAX_INPUT_LENGTH = 30000;

interface AgentLike {
  id: string;
  name: string;
  personaPrompt: string;
  outputKind: "rewrite" | "response";
  usesVoiceProfile: boolean;
  defaultTemperature: string | null;
}

function isScope(value: unknown): value is "selection" | "document" {
  return value === "selection" || value === "document";
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getApiUser();
  if (!user) {
    return unauthorized();
  }

  const body = await readJsonObject(request);
  if (!body) {
    return badRequest("invalid_json");
  }

  let agent: AgentLike | null = null;

  if (params.id === "test") {
    // Walkthrough "test before save" path: run an inline persona definition
    // without persisting an agents row. The body must include the persona.
    const personaPrompt = readString(body, "personaPrompt");
    if (!personaPrompt.trim()) {
      return badRequest("persona_prompt_required");
    }
    agent = {
      id: "test",
      name: readString(body, "name", "Draft agent"),
      personaPrompt,
      outputKind:
        body.outputKind === "response" ? "response" : "rewrite",
      usesVoiceProfile: body.usesVoiceProfile === true,
      defaultTemperature: null,
    };
  } else if (params.id.startsWith("starter:")) {
    const starter = getStarter(params.id.slice("starter:".length));
    if (!starter) {
      return notFound();
    }
    agent = {
      id: params.id,
      name: starter.name,
      personaPrompt: starter.personaPrompt,
      outputKind: starter.outputKind,
      usesVoiceProfile: starter.usesVoiceProfile,
      defaultTemperature: null,
    };
  } else {
    const persisted = await agentsRepo.getById(user.id, params.id);
    if (!persisted) {
      return notFound();
    }
    agent = {
      id: persisted.id,
      name: persisted.name,
      personaPrompt: persisted.personaPrompt,
      outputKind: persisted.outputKind,
      usesVoiceProfile: persisted.usesVoiceProfile,
      defaultTemperature: persisted.defaultTemperature,
    };
  }

  const scope = isScope(body.scope) ? body.scope : "selection";
  const documentType: DocumentType = isDocumentType(body.documentType)
    ? body.documentType
    : "blog_post";
  const voiceContext: VoiceContext = isVoiceContext(body.voiceContext)
    ? body.voiceContext
    : "universal";
  const documentId = readOptionalString(body, "documentId");
  const text = readString(body, "text").slice(0, MAX_INPUT_LENGTH);

  if (!text.trim()) {
    return badRequest("text_required");
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

  const profile = agent.usesVoiceProfile
    ? await compileVoiceProfile(user.id, voiceContext, "heavy", false)
    : null;

  // Per the architecture notes, agent persona + voice profile are both wrapped
  // as cached system blocks. The persona is the cheaper-to-cache half (rarely
  // changes); the voice profile changes occasionally but still amortizes well.
  const cachedSystemBlocks: string[] = [agent.personaPrompt];
  if (profile) {
    cachedSystemBlocks.push(profile.compiledSystemPrompt);
  }

  const promptLines = [
    `Agent: ${agent.name}`,
    `Output kind: ${agent.outputKind}`,
    `Scope: ${scope}`,
    `Document type: ${documentType.replace("_", " ")}`,
    `Voice context: ${voiceContext.replace("_", " ")}`,
    "",
    scope === "document" ? "Document text:" : "Selected text:",
    text,
    "",
    agent.outputKind === "rewrite"
      ? "Output: only the rewritten text, in the writer's voice. No preamble, no commentary."
      : "Output: a structured markdown response. Lead with specifics; quote the source where useful; end without a self-summary.",
  ];

  // For whole-doc runs, cap the response length more aggressively.
  const maxTokens = scope === "document" ? 2400 : 800;
  const temperature = agent.defaultTemperature
    ? Number(agent.defaultTemperature)
    : agent.outputKind === "rewrite"
      ? 0.6
      : 0.7;

  const stream = resolved.provider.stream({
    tier: "heavy",
    cachedSystemBlocks,
    prompt: promptLines.join("\n"),
    maxTokens,
    temperature: Number.isFinite(temperature) ? temperature : 0.6,
    documentId: documentId ?? undefined,
    transformId: `agent:${agent.id}`,
  });

  return streamingResponse(stream, {
    provider: resolved.provider.id,
    ownership: resolved.ownership,
    transformId: `agent:${agent.id}`,
  });
}
