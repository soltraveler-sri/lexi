"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Wand2 } from "lucide-react";

import { EditPairList, type EditPairListItem } from "@/components/style/EditPairList";
import { ExemplarList, type ExemplarListItem } from "@/components/style/ExemplarList";
import { PreferencesPanel } from "@/components/style/PreferencesPanel";
import { VoiceProfilePreview } from "@/components/style/VoiceProfilePreview";
import { AgentsRoster, type AgentListItem } from "@/components/journal/AgentsRoster";
import { AnalyzeEditsButton } from "@/components/journal/AnalyzeEditsButton";

export function StyleGuidePanel({
  preferencesContent,
  exemplars,
  events,
  agents,
}: {
  preferencesContent: string;
  exemplars: ExemplarListItem[];
  events: EditPairListItem[];
  agents: AgentListItem[];
}) {
  return (
    <div className="space-y-10">
      <section className="rounded-md border border-border bg-surface p-5">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-semibold">Voice profile</h2>
          <Link
            className="flex items-center gap-1 rounded-sm bg-accent-soft px-2 py-1 text-xs text-accent-hover hover:bg-accent-soft/80"
            href="/journal/style-guide/walkthrough"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Set up my voice profile
            <ArrowRight className="h-3 w-3" />
          </Link>
        </header>
        <p className="mb-3 text-sm text-text-muted">
          Durable guidance about how you write. The walkthrough turns a short
          conversation into a well-shaped prompt; you can always edit it
          directly.
        </p>
        <PreferencesPanel initialContent={preferencesContent} />
      </section>

      <section>
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-semibold">Agents</h2>
        </header>
        <p className="mb-3 text-sm text-text-muted">
          Named collaborators with consistent personalities. Each runs as a
          rewrite (committed through the strip) or as a response in a side
          panel — never silently.
        </p>
        <AgentsRoster initialAgents={agents} />
      </section>

      <section>
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-semibold">Exemplars</h2>
          <span className="text-xs text-text-faint">{exemplars.length} marked</span>
        </header>
        <ExemplarList exemplars={exemplars} />
      </section>

      <section>
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-semibold">Recent edits</h2>
          <AnalyzeEditsButton corpusSize={events.length} />
        </header>
        <p className="mb-3 text-sm text-text-muted">
          Before/after pairs from your accepted AI suggestions and manual
          rewrites. <span className="text-text-faint">Analyze my edits</span>{" "}
          proposes new preference bullets from this corpus.
        </p>
        <EditPairList events={events} />
      </section>

      <section>
        <header className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent-hover" />
          <h2 className="font-display text-2xl font-semibold">Compiled preview</h2>
        </header>
        <VoiceProfilePreview />
      </section>
    </div>
  );
}
