import { NotesPanel } from "@/components/journal/NotesPanel";
import * as notesRepo from "@/lib/db/repos/notes";
import { requireUser } from "@/lib/auth/getUser";

export const dynamic = "force-dynamic";

export default async function JournalNotesPage() {
  const user = await requireUser();
  const note = await notesRepo.getForUser(user.id);
  return <NotesPanel initialContent={note?.content ?? ""} />;
}
