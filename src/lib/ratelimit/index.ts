import { and, eq, gte, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { usageEvents } from "@/lib/db/schema";
import type { CredentialOwnership } from "@/types";

// MVP rate limits. These are intentionally conservative because the live site
// is unmonetized and these env-fallback API keys are paid for out of pocket.
// When we add paid plans, replace these with per-plan quotas.
const APP_LIMIT_PER_HOUR = 15;
const APP_LIMIT_PER_DAY = 60;

// BYOK users pay their provider directly, so the only reason to limit is to
// prevent runaway loops. Set well above any realistic interactive workload.
const BYOK_LIMIT_PER_HOUR = 500;
const BYOK_LIMIT_PER_DAY = 4000;

// Allowlisted accounts (operator's own emails, set via env). Effectively unlimited
// for normal use, but we still cap at an absurd number as an edge-case guard.
const ALLOWLIST_LIMIT_PER_HOUR = 100_000;
const ALLOWLIST_LIMIT_PER_DAY = 1_000_000;

export interface RateLimitDecision {
  allowed: boolean;
  reason?: "hour" | "day";
  retryAfterSeconds?: number;
  limitPerHour: number;
  limitPerDay: number;
  usedLastHour: number;
  usedLastDay: number;
  bypassReason?: "allowlist" | "byok";
}

function parseAllowlist(): Set<string> {
  const raw =
    process.env.LEXI_RATE_LIMIT_ALLOWLIST_EMAILS ??
    process.env.LEXI_RATE_LIMIT_ALLOWLIST ??
    "";

  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isEmailAllowlisted(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  return parseAllowlist().has(email.trim().toLowerCase());
}

async function countAppUsage(userId: string, since: Date): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.ownership, "app"),
        gte(usageEvents.createdAt, since),
      ),
    );

  return row?.count ?? 0;
}

async function countAllUsage(userId: string, since: Date): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usageEvents)
    .where(and(eq(usageEvents.userId, userId), gte(usageEvents.createdAt, since)));

  return row?.count ?? 0;
}

export async function checkAiRateLimit(params: {
  userId: string;
  email: string | null | undefined;
  ownership: CredentialOwnership;
}): Promise<RateLimitDecision> {
  const { userId, email, ownership } = params;
  const allowlisted = isEmailAllowlisted(email);

  let limitPerHour: number;
  let limitPerDay: number;
  let bypassReason: RateLimitDecision["bypassReason"];

  if (allowlisted) {
    limitPerHour = ALLOWLIST_LIMIT_PER_HOUR;
    limitPerDay = ALLOWLIST_LIMIT_PER_DAY;
    bypassReason = "allowlist";
  } else if (ownership === "user") {
    limitPerHour = BYOK_LIMIT_PER_HOUR;
    limitPerDay = BYOK_LIMIT_PER_DAY;
    bypassReason = "byok";
  } else {
    limitPerHour = APP_LIMIT_PER_HOUR;
    limitPerDay = APP_LIMIT_PER_DAY;
  }

  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000);
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);

  // Only app-owned calls count against quota; BYOK calls are the user's own spend.
  const counter = ownership === "app" && !allowlisted ? countAppUsage : countAllUsage;
  const [usedLastHour, usedLastDay] = await Promise.all([
    counter(userId, hourAgo),
    counter(userId, dayAgo),
  ]);

  if (usedLastHour >= limitPerHour) {
    return {
      allowed: false,
      reason: "hour",
      retryAfterSeconds: 60 * 60,
      limitPerHour,
      limitPerDay,
      usedLastHour,
      usedLastDay,
      bypassReason,
    };
  }

  if (usedLastDay >= limitPerDay) {
    return {
      allowed: false,
      reason: "day",
      retryAfterSeconds: 60 * 60,
      limitPerHour,
      limitPerDay,
      usedLastHour,
      usedLastDay,
      bypassReason,
    };
  }

  return {
    allowed: true,
    limitPerHour,
    limitPerDay,
    usedLastHour,
    usedLastDay,
    bypassReason,
  };
}
