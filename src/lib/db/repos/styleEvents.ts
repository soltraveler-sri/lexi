import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { styleEvents, type StyleEventInsert } from "@/lib/db/schema";

export type StyleEventUpdate = Partial<
  Omit<StyleEventInsert, "id" | "userId" | "createdAt">
>;

export async function listForUser(userId: string, limit = 50) {
  return getDb()
    .select()
    .from(styleEvents)
    .where(eq(styleEvents.userId, userId))
    .orderBy(desc(styleEvents.createdAt))
    .limit(limit);
}

export async function getById(userId: string, id: string) {
  const [event] = await getDb()
    .select()
    .from(styleEvents)
    .where(and(eq(styleEvents.id, id), eq(styleEvents.userId, userId)))
    .limit(1);

  return event ?? null;
}

export async function create(values: StyleEventInsert) {
  const [event] = await getDb().insert(styleEvents).values(values).returning();

  return event;
}

export async function update(userId: string, id: string, values: StyleEventUpdate) {
  const [event] = await getDb()
    .update(styleEvents)
    .set(values)
    .where(and(eq(styleEvents.id, id), eq(styleEvents.userId, userId)))
    .returning();

  return event ?? null;
}

export async function remove(userId: string, id: string) {
  const [event] = await getDb()
    .delete(styleEvents)
    .where(and(eq(styleEvents.id, id), eq(styleEvents.userId, userId)))
    .returning();

  return event ?? null;
}
