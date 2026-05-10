import { NextResponse } from "next/server";

import { getApiUser, unauthorized } from "@/lib/api";
import { isAiConfiguredViaEnv } from "@/lib/ai/resolver";
import { isWebSearchAvailableForUser } from "@/lib/ai/tools/websearch";
import * as credentialsRepo from "@/lib/db/repos/credentials";
import { isEmailAllowlisted } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function GET() {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const credentials = await credentialsRepo.listForUser(user.id);
  const hasUserCredential = credentials.length > 0;
  const envFallback = isAiConfiguredViaEnv();
  const allowlisted = isEmailAllowlisted(user.email);
  const webSearch = await isWebSearchAvailableForUser(user.id);

  return NextResponse.json({
    available: hasUserCredential || envFallback,
    source: hasUserCredential ? "user" : envFallback ? "app" : null,
    allowlisted,
    webSearch,
  });
}
