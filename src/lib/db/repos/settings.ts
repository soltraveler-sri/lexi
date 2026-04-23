import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { userSettings, type UserSettingInsert } from "@/lib/db/schema";

export type SettingsUpdate = Partial<
  Omit<UserSettingInsert, "id" | "userId" | "createdAt">
>;

export async function listForUser(userId: string) {
  const settings = await getForUser(userId);
  return settings ? [settings] : [];
}

export async function getForUser(userId: string) {
  const [settings] = await getDb()
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return settings ?? null;
}

export async function getById(userId: string, id: string) {
  const settings = await getForUser(userId);
  return settings?.id === id ? settings : null;
}

export async function create(values: UserSettingInsert) {
  const [settings] = await getDb()
    .insert(userSettings)
    .values(values)
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { updatedAt: new Date() },
    })
    .returning();

  return settings;
}

export async function ensureForUser(userId: string) {
  const [settings] = await getDb()
    .insert(userSettings)
    .values({ userId })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { updatedAt: new Date() },
    })
    .returning();

  return settings;
}

export async function update(userId: string, values: SettingsUpdate) {
  const [settings] = await getDb()
    .insert(userSettings)
    .values({ userId, ...values, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { ...values, updatedAt: new Date() },
    })
    .returning();

  return settings;
}

export async function remove(userId: string) {
  const [settings] = await getDb()
    .delete(userSettings)
    .where(eq(userSettings.userId, userId))
    .returning();

  return settings ?? null;
}
