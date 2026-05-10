import { AgentCreator } from "@/components/journal/AgentCreator";
import { AGENT_STARTERS } from "@/lib/agents/starters";
import { requireUser } from "@/lib/auth/getUser";

export const dynamic = "force-dynamic";

export default async function NewAgentPage({
  searchParams,
}: {
  searchParams: { mode?: string };
}) {
  await requireUser();
  const mode =
    searchParams.mode === "brief" ||
    searchParams.mode === "deep" ||
    searchParams.mode === "starter" ||
    searchParams.mode === "manual"
      ? searchParams.mode
      : "manual";

  return <AgentCreator mode={mode} starters={AGENT_STARTERS} />;
}
