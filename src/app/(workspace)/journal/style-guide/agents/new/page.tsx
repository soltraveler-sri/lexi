import { redirect } from "next/navigation";

// The agent creation flow lives here but the real implementation lands
// in #21 (Agents Level 1) + #20 (walkthroughs). Until then we redirect
// back to the Style Guide so links never 404.
export default function AgentCreationPlaceholder() {
  redirect("/journal/style-guide");
}
