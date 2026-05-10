"use client";

import Link from "next/link";
import { UserRoundCog } from "lucide-react";

import type { AgentListItem } from "@/components/journal/AgentsRoster";

export function AgentPickerMenu({
  agents,
  onPick,
  onClose,
  scopeLabel,
}: {
  agents: AgentListItem[];
  onPick: (agent: AgentListItem) => void;
  onClose: () => void;
  scopeLabel: string;
}) {
  return (
    <div className="rewrite-strip-active flex flex-col gap-1 rounded-md border border-border bg-surface p-2 font-ui shadow-md">
      <div className="px-2 py-1 text-xs uppercase tracking-wide text-text-faint">
        Run with — {scopeLabel}
      </div>
      {agents.length === 0 ? (
        <div className="px-2 py-3 text-sm text-text-muted">
          No agents yet.{" "}
          <Link
            className="text-accent-hover hover:underline"
            href="/journal/style-guide"
            onClick={onClose}
          >
            Create one
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col">
          {agents.map((agent) => (
            <li key={agent.id}>
              <button
                className="flex w-full items-center justify-between rounded-sm px-2 py-2 text-left text-sm hover:bg-surface-sunken"
                onClick={() => {
                  onPick(agent);
                  onClose();
                }}
                type="button"
              >
                <span className="flex items-center gap-2">
                  <UserRoundCog className="h-3.5 w-3.5 text-accent-hover" />
                  <span className="font-medium">{agent.name}</span>
                </span>
                <span className="text-xs text-text-faint">{agent.outputKind}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
