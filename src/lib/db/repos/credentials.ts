import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { userCredentials, type UserCredentialInsert } from "@/lib/db/schema";

export type CredentialUpdate = Partial<
  Omit<UserCredentialInsert, "id" | "userId" | "createdAt">
>;

export async function listForUser(userId: string) {
  return getDb()
    .select()
    .from(userCredentials)
    .where(eq(userCredentials.userId, userId))
    .orderBy(desc(userCredentials.isDefault), desc(userCredentials.createdAt));
}

export async function getById(userId: string, id: string) {
  const [credential] = await getDb()
    .select()
    .from(userCredentials)
    .where(and(eq(userCredentials.id, id), eq(userCredentials.userId, userId)))
    .limit(1);

  return credential ?? null;
}

export async function getDefaultForUser(userId: string, preferredProvider?: string) {
  const credentials = await listForUser(userId);
  const providerScoped = preferredProvider
    ? credentials.filter((credential) => credential.provider === preferredProvider)
    : credentials;

  return (
    providerScoped.find((credential) => credential.isDefault) ??
    providerScoped[0] ??
    null
  );
}

export async function create(values: UserCredentialInsert) {
  const db = getDb();

  if (values.isDefault) {
    await db
      .update(userCredentials)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(userCredentials.userId, values.userId));
  }

  const [credential] = await db.insert(userCredentials).values(values).returning();
  return credential;
}

export async function update(userId: string, id: string, values: CredentialUpdate) {
  const db = getDb();

  if (values.isDefault) {
    await db
      .update(userCredentials)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(userCredentials.userId, userId));
  }

  const [credential] = await db
    .update(userCredentials)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(userCredentials.id, id), eq(userCredentials.userId, userId)))
    .returning();

  return credential ?? null;
}

export async function remove(userId: string, id: string) {
  const [credential] = await getDb()
    .delete(userCredentials)
    .where(and(eq(userCredentials.id, id), eq(userCredentials.userId, userId)))
    .returning();

  return credential ?? null;
}
