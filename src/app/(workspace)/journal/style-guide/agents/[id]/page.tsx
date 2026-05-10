import { notFound } from "next/navigation";

import { AgentEditor } from "@/components/journal/AgentEditor";
import * as agentsRepo from "@/lib/db/repos/agents";
import { requireUser } from "@/lib/auth/getUser";

export const dynamic = "force-dynamic";

export default async function AgentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const agent = await agentsRepo.getById(user.id, params.id);
  if (!agent) {
    notFound();
  }

  return (
    <AgentEditor
      agent={{
        id: agent.id,
        name: agent.name,
        role: agent.role,
        description: agent.description,
        personaPrompt: agent.personaPrompt,
        usesVoiceProfile: agent.usesVoiceProfile,
        outputKind: agent.outputKind,
        defaultTemperature: agent.defaultTemperature,
      }}
    />
  );
}
