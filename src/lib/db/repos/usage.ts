import { and, desc, eq, gte } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { usageEvents, type UsageEventInsert } from "@/lib/db/schema";

export type UsageUpdate = Partial<
  Omit<UsageEventInsert, "id" | "userId" | "createdAt">
>;

export async function listForUser(userId: string) {
  return getDb()
    .select()
    .from(usageEvents)
    .where(eq(usageEvents.userId, userId))
    .orderBy(desc(usageEvents.createdAt));
}

export async function listCurrentMonthForUser(userId: string) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  return getDb()
    .select()
    .from(usageEvents)
    .where(and(eq(usageEvents.userId, userId), gte(usageEvents.createdAt, monthStart)))
    .orderBy(desc(usageEvents.createdAt));
}

export async function getById(userId: string, id: string) {
  const [event] = await getDb()
    .select()
    .from(usageEvents)
    .where(and(eq(usageEvents.id, id), eq(usageEvents.userId, userId)))
    .limit(1);

  return event ?? null;
}

export async function create(values: UsageEventInsert) {
  const [event] = await getDb().insert(usageEvents).values(values).returning();
  return event;
}

export async function update(userId: string, id: string, values: UsageUpdate) {
  const [event] = await getDb()
    .update(usageEvents)
    .set(values)
    .where(and(eq(usageEvents.id, id), eq(usageEvents.userId, userId)))
    .returning();

  return event ?? null;
}

export async function remove(userId: string, id: string) {
  const [event] = await getDb()
    .delete(usageEvents)
    .where(and(eq(usageEvents.id, id), eq(usageEvents.userId, userId)))
    .returning();

  return event ?? null;
}
