import { NextResponse, type NextRequest } from "next/server";

import { badRequest, getApiUser, isVoiceContext, unauthorized } from "@/lib/api";
import { compileVoiceProfile } from "@/lib/style/voiceProfile";
import type { CallTier } from "@/types";

function isCallTier(value: string | null): value is CallTier {
  return value === "light" || value === "heavy";
}

export async function GET(request: NextRequest) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const scopeParam = request.nextUrl.searchParams.get("scope") ?? "universal";
  const tierParam = request.nextUrl.searchParams.get("tier") ?? "light";

  if (!isVoiceContext(scopeParam) || !isCallTier(tierParam)) {
    return badRequest("invalid_scope_or_tier");
  }

  const profile = await compileVoiceProfile(user.id, scopeParam, tierParam, false);
  return NextResponse.json({ profile });
}
