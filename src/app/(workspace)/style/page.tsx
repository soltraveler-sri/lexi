import { Download } from "lucide-react";

import { EditPairList } from "@/components/style/EditPairList";
import { ExemplarList } from "@/components/style/ExemplarList";
import { PreferencesPanel } from "@/components/style/PreferencesPanel";
import { VoiceProfilePreview } from "@/components/style/VoiceProfilePreview";
import { Button } from "@/components/ui/button";
import * as exemplarsRepo from "@/lib/db/repos/exemplars";
import * as preferencesRepo from "@/lib/db/repos/preferences";
import * as styleEventsRepo from "@/lib/db/repos/styleEvents";
import { requireUser } from "@/lib/auth/getUser";

export const dynamic = "force-dynamic";

export default async function StylePage() {
  const user = await requireUser();
  const [preferences, exemplars, events] = await Promise.all([
    preferencesRepo.getForUser(user.id),
    exemplarsRepo.listForUser(user.id),
    styleEventsRepo.listForUser(user.id, 50),
  ]);

  return (
    <main className="min-h-screen bg-bg px-12 py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-5xl font-semibold text-text">
              Style Profile
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">
              Preferences, exemplars, and rewrite pairs collected while you work.
            </p>
          </div>
          <Button asChild variant="secondary">
            <a href="/api/export">
              <Download className="h-4 w-4" />
              Export training data
            </a>
          </Button>
        </header>

        <div className="space-y-10">
          <section>
            <h2 className="mb-3 font-display text-2xl font-semibold">Preferences</h2>
            <PreferencesPanel initialContent={preferences?.content ?? ""} />
          </section>
          <section>
            <h2 className="mb-3 font-display text-2xl font-semibold">Exemplars</h2>
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
            <h2 className="mb-3 font-display text-2xl font-semibold">Recent edits</h2>
            <EditPairList
              events={events.map((event) => ({
                id: event.id,
                beforeText: event.beforeText,
                afterText: event.afterText,
                surroundingBefore: event.surroundingBefore,
                surroundingAfter: event.surroundingAfter,
                editTags: event.editTags,
                createdAt: event.createdAt.toISOString(),
              }))}
            />
          </section>
          <VoiceProfilePreview />
        </div>
      </div>
    </main>
  );
}
