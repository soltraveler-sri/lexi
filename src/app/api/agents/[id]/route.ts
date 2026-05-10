import { NextResponse } from "next/server";

import {
  badRequest,
  getApiUser,
  isVoiceContext,
  notFound,
  readBoolean,
  readJsonObject,
  readNumber,
  readOptionalString,
  readString,
  unauthorized,
} from "@/lib/api";
import * as agentsRepo from "@/lib/db/repos/agents";

function isOutputKind(value: unknown): value is "rewrite" | "response" {
  return value === "rewrite" || value === "response";
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) {
    return unauthorized();
  }
  const agent = await agentsRepo.getById(user.id, params.id);
  if (!agent) {
    return notFound();
  }
  return NextResponse.json({ agent });
}

export async function PATCH(
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

  const update: Parameters<typeof agentsRepo.update>[2] = {};

  if (typeof body.name === "string") {
    update.name = body.name;
  }
  if (typeof body.role === "string") {
    update.role = body.role;
  }
  if (typeof body.personaPrompt === "string") {
    update.personaPrompt = body.personaPrompt;
  }
  if (typeof body.description === "string" || body.description === null) {
    update.description = readOptionalString(body, "description");
  }
  if (typeof body.usesVoiceProfile === "boolean") {
    update.usesVoiceProfile = readBoolean(body, "usesVoiceProfile", true);
  }
  if (isVoiceContext(body.voiceProfileScope) || body.voiceProfileScope === null) {
    update.voiceProfileScope = isVoiceContext(body.voiceProfileScope)
      ? body.voiceProfileScope
      : null;
  }
  if (isOutputKind(body.outputKind)) {
    update.outputKind = body.outputKind;
  }
  if (typeof body.defaultModel === "string" || body.defaultModel === null) {
    update.defaultModel = readOptionalString(body, "defaultModel");
  }
  if (
    typeof body.defaultTemperature === "number" ||
    body.defaultTemperature === null
  ) {
    const temperatureNumber = readNumber(body, "defaultTemperature", Number.NaN);
    update.defaultTemperature = Number.isFinite(temperatureNumber)
      ? temperatureNumber.toFixed(2)
      : null;
  }

  // touch readString to silence unused import warnings
  void readString;

  const agent = await agentsRepo.update(user.id, params.id, update);
  if (!agent) {
    return notFound();
  }
  return NextResponse.json({ agent });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getApiUser();
  if (!user) {
    return unauthorized();
  }
  const agent = await agentsRepo.remove(user.id, params.id);
  if (!agent) {
    return notFound();
  }
  return NextResponse.json({ agent });
}
