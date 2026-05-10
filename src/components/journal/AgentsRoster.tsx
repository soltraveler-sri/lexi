"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, UserRoundCog } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface AgentListItem {
  id: string;
  name: string;
  role: string;
  outputKind: "rewrite" | "response";
  usesVoiceProfile: boolean;
  description?: string | null;
}

export function AgentsRoster({
  initialAgents,
}: {
  initialAgents: AgentListItem[];
}) {
  const router = useRouter();
  const [agents] = useState<AgentListItem[]>(initialAgents);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <div className="rounded-md border border-border bg-surface p-3">
        {agents.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-text-faint">
            No agents yet. Pick a starter, run a walkthrough, or write your own.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {agents.map((agent) => (
              <li className="flex items-center justify-between px-3 py-3" key={agent.id}>
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <UserRoundCog className="h-4 w-4 text-accent-hover" />
                    {agent.name}
                    <span className="rounded-sm bg-surface-sunken px-1.5 py-0.5 text-xs text-text-faint">
                      {agent.outputKind}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-faint">
                    {agent.role}
                    {agent.usesVoiceProfile ? " · uses your voice" : " · own voice"}
                    {agent.description ? ` · ${agent.description}` : ""}
                  </p>
                </div>
                <Button
                  asChild
                  size="sm"
                  variant="secondary"
                >
                  <Link href={`/journal/style-guide/agents/${agent.id}`}>Manage</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex justify-end">
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="h-3.5 w-3.5" />
            Create agent
          </Button>
        </div>
      </div>

      <Dialog onOpenChange={setCreateOpen} open={createOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new agent</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-muted">
            Pick how you want to create your agent. You can always edit
            everything afterward.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              onClick={() => {
                setCreateOpen(false);
                router.push("/journal/style-guide/agents/new?mode=brief");
              }}
              variant="secondary"
            >
              Brief walkthrough
            </Button>
            <Button
              onClick={() => {
                setCreateOpen(false);
                router.push("/journal/style-guide/agents/new?mode=deep");
              }}
              variant="secondary"
            >
              Deep walkthrough
            </Button>
            <Button
              onClick={() => {
                setCreateOpen(false);
                router.push("/journal/style-guide/agents/new?mode=starter");
              }}
              variant="secondary"
            >
              Pick from a starter
            </Button>
            <Button
              onClick={() => {
                setCreateOpen(false);
                router.push("/journal/style-guide/agents/new?mode=manual");
              }}
              variant="secondary"
            >
              Write my own
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
