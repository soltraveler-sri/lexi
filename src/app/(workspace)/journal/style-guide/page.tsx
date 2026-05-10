import { StyleGuidePanel } from "@/components/journal/StyleGuidePanel";
import * as agentsRepo from "@/lib/db/repos/agents";
import * as exemplarsRepo from "@/lib/db/repos/exemplars";
import * as preferencesRepo from "@/lib/db/repos/preferences";
import * as styleEventsRepo from "@/lib/db/repos/styleEvents";
import { requireUser } from "@/lib/auth/getUser";

export const dynamic = "force-dynamic";

export default async function JournalStyleGuidePage() {
  const user = await requireUser();
  const [preferences, exemplars, events, agents] = await Promise.all([
    preferencesRepo.getForUser(user.id),
    exemplarsRepo.listForUser(user.id),
    styleEventsRepo.listForUser(user.id, 50),
    agentsRepo.listForUser(user.id),
  ]);

  return (
    <StyleGuidePanel
      agents={agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        outputKind: agent.outputKind,
        usesVoiceProfile: agent.usesVoiceProfile,
        description: agent.description,
      }))}
      events={events.map((event) => ({
        id: event.id,
        beforeText: event.beforeText,
        afterText: event.afterText,
        surroundingBefore: event.surroundingBefore,
        surroundingAfter: event.surroundingAfter,
        editTags: event.editTags,
        createdAt: event.createdAt.toISOString(),
      }))}
      exemplars={exemplars.map((exemplar) => ({
        id: exemplar.id,
        documentId: exemplar.documentId,
        textSnapshot: exemplar.textSnapshot,
        tags: exemplar.tags,
        note: exemplar.note,
      }))}
      preferencesContent={preferences?.content ?? ""}
    />
  );
}
