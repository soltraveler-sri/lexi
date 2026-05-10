import * as preferencesRepo from "@/lib/db/repos/preferences";
import { requireUser } from "@/lib/auth/getUser";
import { VoiceProfileWalkthrough } from "@/components/journal/VoiceProfileWalkthrough";

export const dynamic = "force-dynamic";

export default async function VoiceProfileWalkthroughPage() {
  const user = await requireUser();
  const existing = await preferencesRepo.getForUser(user.id);
  return (
    <VoiceProfileWalkthrough existingPreferences={existing?.content ?? ""} />
  );
}
