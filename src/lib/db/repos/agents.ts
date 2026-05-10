import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { agents, type AgentInsert } from "@/lib/db/schema";

export type AgentUpdate = Partial<
  Omit<AgentInsert, "id" | "userId" | "createdAt">
>;

export async function listForUser(userId: string) {
  return getDb()
    .select()
    .from(agents)
    .where(eq(agents.userId, userId))
    .orderBy(desc(agents.updatedAt));
}

export async function getById(userId: string, id: string) {
  const [agent] = await getDb()
    .select()
    .from(agents)
    .where(and(eq(agents.id, id), eq(agents.userId, userId)))
    .limit(1);

  return agent ?? null;
}

export async function create(values: AgentInsert) {
  const [agent] = await getDb().insert(agents).values(values).returning();
  return agent;
}

export async function update(userId: string, id: string, values: AgentUpdate) {
  const [agent] = await getDb()
    .update(agents)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(agents.id, id), eq(agents.userId, userId)))
    .returning();
  return agent ?? null;
}

export async function remove(userId: string, id: string) {
  const [agent] = await getDb()
    .delete(agents)
    .where(and(eq(agents.id, id), eq(agents.userId, userId)))
    .returning();
  return agent ?? null;
}
