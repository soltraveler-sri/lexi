import { NextResponse } from "next/server";

import {
  badRequest,
  getApiUser,
  isRendererMode,
  readBoolean,
  readJsonObject,
  readNumber,
  unauthorized,
} from "@/lib/api";
import * as settingsRepo from "@/lib/db/repos/settings";
import type { SettingsUpdate } from "@/lib/db/repos/settings";

export async function GET() {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const settings = await settingsRepo.ensureForUser(user.id);
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const body = await readJsonObject(request);

  if (!body) {
    return badRequest("invalid_json");
  }

  const values: SettingsUpdate = {};

  if ("rendererMode" in body && isRendererMode(body.rendererMode)) {
    values.rendererMode = body.rendererMode;
  }

  if ("spotlightIntensity" in body) {
    values.spotlightIntensity = readNumber(body, "spotlightIntensity", 75);
  }

  if ("alwaysSendFullVoiceProfile" in body) {
    values.alwaysSendFullVoiceProfile = readBoolean(
      body,
      "alwaysSendFullVoiceProfile",
      false,
    );
  }

  if ("editTagToastEnabled" in body) {
    values.editTagToastEnabled = readBoolean(body, "editTagToastEnabled", true);
  }

  const settings = await settingsRepo.update(user.id, values);
  return NextResponse.json({ settings });
}
