import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { notes, type NoteInsert } from "@/lib/db/schema";

export async function getForUser(userId: string) {
  const [note] = await getDb()
    .select()
    .from(notes)
    .where(eq(notes.userId, userId))
    .limit(1);

  return note ?? null;
}

export async function upsertForUser(userId: string, content: string) {
  const db = getDb();
  const existing = await getForUser(userId);

  if (existing) {
    const [row] = await db
      .update(notes)
      .set({ content, updatedAt: new Date() })
      .where(eq(notes.userId, userId))
      .returning();
    return row;
  }

  const [row] = await db
    .insert(notes)
    .values({ userId, content } satisfies NoteInsert)
    .returning();
  return row;
}
