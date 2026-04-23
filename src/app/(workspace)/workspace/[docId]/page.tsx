import { notFound } from "next/navigation";

import { Editor } from "@/components/editor/Editor";
import * as documentsRepo from "@/lib/db/repos/documents";
import * as settingsRepo from "@/lib/db/repos/settings";
import { requireUser } from "@/lib/auth/getUser";

export const dynamic = "force-dynamic";

export default async function DocumentPage({ params }: { params: { docId: string } }) {
  const user = await requireUser();
  const [document, settings] = await Promise.all([
    documentsRepo.getById(user.id, params.docId),
    settingsRepo.ensureForUser(user.id),
  ]);

  if (!document) {
    notFound();
  }

  return (
    <Editor
      document={{
        id: document.id,
        title: document.title,
        content: document.content,
        type: document.type,
        voiceContext: document.voiceContext,
      }}
      settings={{
        rendererMode: settings.rendererMode,
        spotlightIntensity: settings.spotlightIntensity,
        editTagToastEnabled: settings.editTagToastEnabled,
      }}
    />
  );
}
