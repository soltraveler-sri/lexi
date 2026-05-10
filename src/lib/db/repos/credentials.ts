import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { userCredentials, type UserCredentialInsert } from "@/lib/db/schema";
import {
  decryptCredential,
  encryptCredential,
  isEncryptedValue,
  isEncryptionConfigured,
} from "@/lib/security/credentialCipher";

export type CredentialUpdate = Partial<
  Omit<UserCredentialInsert, "id" | "userId" | "createdAt">
>;

function decryptRowIfNeeded<T extends { apiKey: string }>(row: T): T {
  if (!isEncryptedValue(row.apiKey)) {
    return row;
  }

  return { ...row, apiKey: decryptCredential(row.apiKey) };
}

function requireKeyForWrite() {
  if (!isEncryptionConfigured()) {
    throw new Error(
      "LEXI_CREDENTIALS_KEY is not set. Refusing to write a BYOK credential without an encryption key.",
    );
  }
}

export async function listForUser(userId: string) {
  const rows = await getDb()
    .select()
    .from(userCredentials)
    .where(eq(userCredentials.userId, userId))
    .orderBy(desc(userCredentials.isDefault), desc(userCredentials.createdAt));

  return rows.map(decryptRowIfNeeded);
}

export async function getById(userId: string, id: string) {
  const [credential] = await getDb()
    .select()
    .from(userCredentials)
    .where(and(eq(userCredentials.id, id), eq(userCredentials.userId, userId)))
    .limit(1);

  return credential ? decryptRowIfNeeded(credential) : null;
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
  requireKeyForWrite();
  const db = getDb();

  if (values.isDefault) {
    await db
      .update(userCredentials)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(userCredentials.userId, values.userId));
  }

  const [credential] = await db
    .insert(userCredentials)
    .values({ ...values, apiKey: encryptCredential(values.apiKey) })
    .returning();

  return decryptRowIfNeeded(credential);
}

export async function update(userId: string, id: string, values: CredentialUpdate) {
  if (values.apiKey) {
    requireKeyForWrite();
  }

  const db = getDb();

  if (values.isDefault) {
    await db
      .update(userCredentials)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(userCredentials.userId, userId));
  }

  const nextValues = values.apiKey
    ? { ...values, apiKey: encryptCredential(values.apiKey) }
    : values;

  const [credential] = await db
    .update(userCredentials)
    .set({ ...nextValues, updatedAt: new Date() })
    .where(and(eq(userCredentials.id, id), eq(userCredentials.userId, userId)))
    .returning();

  return credential ? decryptRowIfNeeded(credential) : null;
}

export async function remove(userId: string, id: string) {
  const [credential] = await getDb()
    .delete(userCredentials)
    .where(and(eq(userCredentials.id, id), eq(userCredentials.userId, userId)))
    .returning();

  return credential ? decryptRowIfNeeded(credential) : null;
}
