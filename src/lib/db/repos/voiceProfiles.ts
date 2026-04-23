import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { voiceProfiles, type VoiceProfileInsert } from "@/lib/db/schema";
import type { VoiceContext } from "@/types";

export type VoiceProfileUpdate = Partial<Omit<VoiceProfileInsert, "id" | "userId">>;

export async function listForUser(userId: string) {
  return getDb().select().from(voiceProfiles).where(eq(voiceProfiles.userId, userId));
}

export async function getById(userId: string, id: string) {
  const [profile] = await getDb()
    .select()
    .from(voiceProfiles)
    .where(and(eq(voiceProfiles.id, id), eq(voiceProfiles.userId, userId)))
    .limit(1);

  return profile ?? null;
}

export async function getByScope(userId: string, scope: VoiceContext) {
  const [profile] = await getDb()
    .select()
    .from(voiceProfiles)
    .where(and(eq(voiceProfiles.userId, userId), eq(voiceProfiles.scope, scope)))
    .limit(1);

  return profile ?? null;
}

export async function create(values: VoiceProfileInsert) {
  const [profile] = await getDb()
    .insert(voiceProfiles)
    .values(values)
    .onConflictDoUpdate({
      target: [voiceProfiles.userId, voiceProfiles.scope],
      set: {
        compiledSystemPrompt: values.compiledSystemPrompt,
        includedExemplarIds: values.includedExemplarIds ?? [],
        includedEventIds: values.includedEventIds ?? [],
        compiledAt: new Date(),
      },
    })
    .returning();

  return profile;
}

export async function update(userId: string, id: string, values: VoiceProfileUpdate) {
  const [profile] = await getDb()
    .update(voiceProfiles)
    .set(values)
    .where(and(eq(voiceProfiles.id, id), eq(voiceProfiles.userId, userId)))
    .returning();

  return profile ?? null;
}

export async function remove(userId: string, id: string) {
  const [profile] = await getDb()
    .delete(voiceProfiles)
    .where(and(eq(voiceProfiles.id, id), eq(voiceProfiles.userId, userId)))
    .returning();

  return profile ?? null;
}
