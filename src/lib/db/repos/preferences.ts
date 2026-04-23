import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { stylePreferences } from "@/lib/db/schema";

export async function getForUser(userId: string) {
  const [preference] = await getDb()
    .select()
    .from(stylePreferences)
    .where(eq(stylePreferences.userId, userId))
    .limit(1);

  return preference ?? null;
}

export async function listForUser(userId: string) {
  const preference = await getForUser(userId);
  return preference ? [preference] : [];
}

export async function getById(userId: string, id: string) {
  const preference = await getForUser(userId);
  return preference?.id === id ? preference : null;
}

export async function create(values: { userId: string; content?: string }) {
  const [preference] = await getDb()
    .insert(stylePreferences)
    .values({ userId: values.userId, content: values.content ?? "" })
    .onConflictDoUpdate({
      target: stylePreferences.userId,
      set: { content: values.content ?? "", updatedAt: new Date() },
    })
    .returning();

  return preference;
}

export async function update(userId: string, content: string) {
  const [preference] = await getDb()
    .insert(stylePreferences)
    .values({ userId, content, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: stylePreferences.userId,
      set: { content, updatedAt: new Date() },
    })
    .returning();

  return preference;
}

export async function remove(userId: string) {
  const [preference] = await getDb()
    .delete(stylePreferences)
    .where(eq(stylePreferences.userId, userId))
    .returning();

  return preference ?? null;
}
