import { NextResponse } from "next/server";

import {
  badRequest,
  getApiUser,
  readJsonObject,
  readNumber,
  readString,
  unauthorized,
} from "@/lib/api";
import { webSearch } from "@/lib/ai/tools/websearch";
import { checkAiRateLimit } from "@/lib/ratelimit";
import { resolveProviderForUser } from "@/lib/ai/resolver";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const body = await readJsonObject(request);

  if (!body) {
    return badRequest("invalid_json");
  }

  const query = readString(body, "query").trim();

  if (!query) {
    return badRequest("query_required");
  }

  const maxResults = readNumber(body, "maxResults", 6);

  // Web search rides the same per-account rate-limit budget as completions.
  const resolvedAi = await resolveProviderForUser(user.id);
  const rateLimit = await checkAiRateLimit({
    userId: user.id,
    email: user.email ?? null,
    ownership: resolvedAi.ownership,
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

  try {
    const response = await webSearch({
      userId: user.id,
      query,
      options: { maxResults: Math.min(Math.max(maxResults, 1), 12) },
    });
    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "web_search_failed";

    if (message === "ai_not_configured") {
      return NextResponse.json(
        {
          error: "ai_not_configured",
          message:
            "Add a provider key in Settings, or set ANTHROPIC_API_KEY / OPENAI_API_KEY on the server.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "web_search_failed", message },
      { status: 502 },
    );
  }
}
