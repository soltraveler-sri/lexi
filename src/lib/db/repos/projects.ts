import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { projects, type ProjectInsert } from "@/lib/db/schema";

export type ProjectUpdate = Partial<Omit<ProjectInsert, "id" | "userId" | "createdAt">>;

export async function listForUser(userId: string) {
  return getDb()
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(asc(projects.sortOrder), asc(projects.name));
}

export async function getById(userId: string, id: string) {
  const [project] = await getDb()
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .limit(1);

  return project ?? null;
}

export async function create(values: ProjectInsert) {
  const [project] = await getDb().insert(projects).values(values).returning();
  return project;
}

export async function update(userId: string, id: string, values: ProjectUpdate) {
  const [project] = await getDb()
    .update(projects)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .returning();

  return project ?? null;
}

export async function remove(userId: string, id: string) {
  const [project] = await getDb()
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .returning();

  return project ?? null;
}
