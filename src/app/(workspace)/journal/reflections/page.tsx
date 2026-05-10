import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { documents, styleEvents } from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { requireUser } from "@/lib/auth/getUser";

export const dynamic = "force-dynamic";

async function gatherStats(userId: string) {
  const db = getDb();
  const monthStart = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
  );

  const [docCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documents)
    .where(eq(documents.userId, userId));

  const [eventCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(styleEvents)
    .where(eq(styleEvents.userId, userId));

  const [monthWords] = await db
    .select({ words: sql<number>`coalesce(sum(${documents.wordCount}), 0)::int` })
    .from(documents)
    .where(and(eq(documents.userId, userId), gte(documents.updatedAt, monthStart)));

  return {
    documents: docCount?.count ?? 0,
    styleEvents: eventCount?.count ?? 0,
    monthWords: monthWords?.words ?? 0,
  };
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface p-5 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-text-faint">{label}</div>
      <div className="mt-2 font-display text-3xl font-semibold">{value}</div>
    </div>
  );
}

export default async function JournalReflectionsPage() {
  const user = await requireUser();
  const stats = await gatherStats(user.id);

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-dashed border-accent/40 bg-accent-soft/30 p-5">
        <h2 className="font-display text-2xl font-semibold">Reflections</h2>
        <p className="mt-2 max-w-xl text-sm text-text-muted">
          Coming in v1.5: surfaced patterns from your edits, time-of-day cadence,
          recurring tags, drift coaches. For now, here's the corpus you've been
          building.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Documents" value={stats.documents.toLocaleString()} />
        <StatCard
          label="Words this month"
          value={stats.monthWords.toLocaleString()}
        />
        <StatCard
          label="Style events captured"
          value={stats.styleEvents.toLocaleString()}
        />
      </div>
    </div>
  );
}
