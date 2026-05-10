import { ExemplarList } from "@/components/style/ExemplarList";
import * as exemplarsRepo from "@/lib/db/repos/exemplars";
import { requireUser } from "@/lib/auth/getUser";

export const dynamic = "force-dynamic";

export default async function JournalContextPage() {
  const user = await requireUser();
  const exemplars = await exemplarsRepo.listForUser(user.id);

  return (
    <div className="space-y-8">
      <section>
        <header className="mb-3">
          <h2 className="font-display text-2xl font-semibold">Exemplars</h2>
          <p className="mt-1 text-sm text-text-muted">
            Passages of your own writing you&apos;ve marked as voice-defining.
            Compiled into the heavy voice profile when you ask the model for
            anything substantial.
          </p>
        </header>
        <ExemplarList
          exemplars={exemplars.map((exemplar) => ({
            id: exemplar.id,
            documentId: exemplar.documentId,
            textSnapshot: exemplar.textSnapshot,
            tags: exemplar.tags,
            note: exemplar.note,
          }))}
        />
      </section>

      <section>
        <header className="mb-3">
          <h2 className="font-display text-2xl font-semibold">Sources</h2>
          <p className="mt-1 text-sm text-text-muted">
            Coming in v1.5+: a place to drop reference material — files, URLs,
            PDFs — that lexi can ground transforms and agents in. For now,
            insert sources via the bubble menu&apos;s research command or the
            doc chrome&apos;s ad-hoc research entry.
          </p>
        </header>
        <div className="rounded-md border border-dashed border-border bg-surface-sunken/40 p-6 text-center text-sm text-text-faint">
          Sources are coming soon. We didn&apos;t want to fake an empty state.
        </div>
      </section>
    </div>
  );
}
