import { and, desc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  documentSnapshots,
  documents,
  type DocumentInsert,
  type DocumentSnapshotInsert,
} from "@/lib/db/schema";

export type DocumentUpdate = Partial<
  Omit<DocumentInsert, "id" | "userId" | "createdAt">
>;

export async function listForUser(userId: string) {
  return getDb()
    .select()
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.updatedAt));
}

export async function listUnsorted(userId: string) {
  return getDb()
    .select()
    .from(documents)
    .where(and(eq(documents.userId, userId), isNull(documents.projectId)))
    .orderBy(desc(documents.updatedAt));
}

export async function getById(userId: string, id: string) {
  const [document] = await getDb()
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .limit(1);

  return document ?? null;
}

export async function create(values: DocumentInsert) {
  const [document] = await getDb().insert(documents).values(values).returning();
  return document;
}

export async function update(userId: string, id: string, values: DocumentUpdate) {
  const [document] = await getDb()
    .update(documents)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .returning();

  return document ?? null;
}

export async function remove(userId: string, id: string) {
  const [document] = await getDb()
    .delete(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .returning();

  return document ?? null;
}

export async function createSnapshot(values: DocumentSnapshotInsert) {
  const [snapshot] = await getDb().insert(documentSnapshots).values(values).returning();

  return snapshot;
}

export async function listSnapshots(userId: string, documentId: string) {
  return getDb()
    .select()
    .from(documentSnapshots)
    .where(
      and(
        eq(documentSnapshots.userId, userId),
        eq(documentSnapshots.documentId, documentId),
      ),
    )
    .orderBy(desc(documentSnapshots.capturedAt));
}

export async function listIncludedForStyleProfile(userId: string) {
  return getDb()
    .select()
    .from(documents)
    .where(and(eq(documents.userId, userId), eq(documents.includeInStyleProfile, true)))
    .orderBy(desc(documents.updatedAt));
}
