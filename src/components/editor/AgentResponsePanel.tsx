"use client";

import { Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AgentResponseSession {
  agentId: string;
  agentName: string;
  scope: "selection" | "document";
  status: "loading" | "streaming" | "ready" | "error";
  text: string;
  error: string | null;
}

export function AgentResponsePanel({
  session,
  onClose,
}: {
  session: AgentResponseSession | null;
  onClose: () => void;
}) {
  if (!session) {
    return null;
  }

  return (
    <aside className="fixed right-0 top-0 z-40 flex h-screen w-[420px] flex-col border-l border-border bg-surface p-5 shadow-lg">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-faint">Agent</p>
          <h3 className="font-display text-lg font-semibold">{session.agentName}</h3>
          <p className="text-xs text-text-faint">
            on {session.scope === "selection" ? "selection" : "whole document"}
          </p>
        </div>
        <Button onClick={onClose} size="icon" variant="ghost">
          <X className="h-4 w-4" />
        </Button>
      </header>
      {session.status === "loading" || session.status === "streaming" ? (
        <p className="mb-3 flex items-center gap-2 text-xs text-text-faint">
          <Loader2 className="h-3 w-3 animate-spin" /> drafting
        </p>
      ) : null}
      {session.status === "error" ? (
        <p className="mb-3 text-sm text-red-600">{session.error ?? "Run failed."}</p>
      ) : null}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-auto whitespace-pre-wrap rounded-sm bg-surface-sunken p-4 text-sm leading-6",
          session.status === "ready" ? "border border-border" : "",
        )}
      >
        {session.text || (session.status === "ready" ? "(empty response)" : "")}
      </div>
      <footer className="mt-3 text-xs text-text-faint">
        Read-only in v1. Copy what you want into the document; agent comments,
        passes, and inline apply land in v1.5.
      </footer>
    </aside>
  );
}
