import { NextResponse } from "next/server";

import {
  badRequest,
  getApiUser,
  isVoiceContext,
  readJsonObject,
  readString,
  unauthorized,
} from "@/lib/api";
import { compileVoiceProfile } from "@/lib/style/voiceProfile";
import type { CallTier } from "@/types";

function isCallTier(value: string): value is CallTier {
  return value === "light" || value === "heavy";
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

  const scope = readString(body, "scope", "universal");
  const tier = readString(body, "tier", "light");

  if (!isVoiceContext(scope) || !isCallTier(tier)) {
    return badRequest("invalid_scope_or_tier");
  }

  const profile = await compileVoiceProfile(user.id, scope, tier, true);
  return NextResponse.json({ profile });
}
