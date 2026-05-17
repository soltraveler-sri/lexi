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

  const streaming = session.status === "loading" || session.status === "streaming";

  return (
    <aside className="fixed right-0 top-0 z-40 flex h-screen w-[420px] flex-col border-l border-border bg-surface shadow-lg">
      <header className="flex items-start justify-between border-b border-border px-6 pb-5 pt-6">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-2">
            Agent
          </p>
          <h3 className="mt-1.5 truncate font-display text-[22px] font-normal leading-tight text-text">
            {session.agentName}
          </h3>
          <p className="mt-1 text-xs text-text-faint">
            on {session.scope === "selection" ? "the selection" : "the whole document"}
          </p>
        </div>
        <Button
          aria-label="Close agent panel"
          className="-mr-1 mt-0.5"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col px-6 py-5">
        {streaming ? (
          <p className="mb-3 inline-flex items-center gap-2 text-xs text-text-faint">
            <Loader2 className="h-3 w-3 animate-spin" />
            drafting
          </p>
        ) : null}
        {session.status === "error" ? (
          <p className="mb-3 text-sm text-danger">
            {session.error ?? "Run failed."}
          </p>
        ) : null}
        <div
          className={cn(
            "min-h-0 flex-1 overflow-auto whitespace-pre-wrap rounded-sm bg-bg p-4 font-display text-[15px] leading-relaxed text-text",
            session.status === "ready" ? "border border-border" : "",
          )}
        >
          {session.text || (session.status === "ready" ? "(empty response)" : "")}
        </div>
      </div>
      <footer className="border-t border-border px-6 py-4 text-[11px] leading-5 text-text-faint">
        Read-only in v1. Copy what you want into the document; agent comments,
        passes, and inline apply land in v1.5.
      </footer>
    </aside>
  );
}
