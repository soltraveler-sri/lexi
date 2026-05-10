"use client";

// Placeholder until #20 lands. The Agents Level 1 PR ships the schema, run
// endpoint, and management UI; the brief/deep walkthroughs that drive the
// "Create new agent → walkthrough" path are wired here in the next PR.

import Link from "next/link";

import { Button } from "@/components/ui/button";

export function AgentPersonaWalkthrough({ mode: _mode }: { mode: "brief" | "deep" }) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-3xl font-semibold">Walkthrough</h2>
      <p className="text-sm text-text-muted">
        The model-led agent persona walkthrough lands in the very next PR. For
        now, you can clone a starter or write your own — both produce a fully
        editable agent you can test before relying on it.
      </p>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/journal/style-guide/agents/new?mode=starter">
            Pick from a starter
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/journal/style-guide/agents/new?mode=manual">
            Write my own
          </Link>
        </Button>
      </div>
    </div>
  );
}
