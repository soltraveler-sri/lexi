import { NextResponse } from "next/server";

import {
  badRequest,
  getApiUser,
  isVoiceContext,
  readBoolean,
  readJsonObject,
  readNumber,
  readOptionalString,
  readString,
  unauthorized,
} from "@/lib/api";
import * as agentsRepo from "@/lib/db/repos/agents";
import { getStarter } from "@/lib/agents/starters";

function isOutputKind(value: unknown): value is "rewrite" | "response" {
  return value === "rewrite" || value === "response";
}

export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return unauthorized();
  }
  const agents = await agentsRepo.listForUser(user.id);
  return NextResponse.json({ agents });
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

  // Two creation paths: clone a starter (provide `starter`) or define manually.
  const starterSlug = readOptionalString(body, "starter");
  type VoiceScope =
    | "blog_post"
    | "work_doc"
    | "fiction"
    | "communication"
    | "universal"
    | null;
  let payload: {
    name: string;
    role: string;
    description: string | null;
    personaPrompt: string;
    usesVoiceProfile: boolean;
    voiceProfileScope: VoiceScope;
    outputKind: "rewrite" | "response";
    defaultModel: string | null;
    defaultTemperature: string | null;
  };

  if (starterSlug) {
    const starter = getStarter(starterSlug);
    if (!starter) {
      return badRequest("unknown_starter");
    }
    payload = {
      name: readString(body, "name", starter.name),
      role: starter.role,
      description: starter.description,
      personaPrompt: starter.personaPrompt,
      usesVoiceProfile: starter.usesVoiceProfile,
      voiceProfileScope: null,
      outputKind: starter.outputKind,
      defaultModel: null,
      defaultTemperature: null,
    };
  } else {
    const personaPrompt = readString(body, "personaPrompt");
    const name = readString(body, "name", "New agent");
    if (!personaPrompt.trim()) {
      return badRequest("persona_prompt_required");
    }
    const temperatureNumber = readNumber(body, "defaultTemperature", Number.NaN);
    payload = {
      name,
      role: readString(body, "role", "editor"),
      description: readOptionalString(body, "description"),
      personaPrompt,
      usesVoiceProfile: readBoolean(body, "usesVoiceProfile", true),
      voiceProfileScope: isVoiceContext(body.voiceProfileScope)
        ? body.voiceProfileScope
        : null,
      outputKind: isOutputKind(body.outputKind) ? body.outputKind : "rewrite",
      defaultModel: readOptionalString(body, "defaultModel"),
      defaultTemperature: Number.isFinite(temperatureNumber)
        ? temperatureNumber.toFixed(2)
        : null,
    };
  }

  const agent = await agentsRepo.create({
    userId: user.id,
    ...payload,
  });

  return NextResponse.json({ agent }, { status: 201 });
}
