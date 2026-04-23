import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { exemplars, type ExemplarInsert } from "@/lib/db/schema";

export type ExemplarUpdate = Partial<
  Omit<ExemplarInsert, "id" | "userId" | "createdAt">
>;

export async function listForUser(userId: string) {
  return getDb()
    .select()
    .from(exemplars)
    .where(eq(exemplars.userId, userId))
    .orderBy(desc(exemplars.createdAt));
}

export async function getById(userId: string, id: string) {
  const [exemplar] = await getDb()
    .select()
    .from(exemplars)
    .where(and(eq(exemplars.id, id), eq(exemplars.userId, userId)))
    .limit(1);

  return exemplar ?? null;
}

export async function create(values: ExemplarInsert) {
  const [exemplar] = await getDb().insert(exemplars).values(values).returning();
  return exemplar;
}

export async function update(userId: string, id: string, values: ExemplarUpdate) {
  const [exemplar] = await getDb()
    .update(exemplars)
    .set(values)
    .where(and(eq(exemplars.id, id), eq(exemplars.userId, userId)))
    .returning();

  return exemplar ?? null;
}

export async function remove(userId: string, id: string) {
  const [exemplar] = await getDb()
    .delete(exemplars)
    .where(and(eq(exemplars.id, id), eq(exemplars.userId, userId)))
    .returning();

  return exemplar ?? null;
}
