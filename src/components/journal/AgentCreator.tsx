"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserRoundCog } from "lucide-react";

import { AgentPersonaWalkthrough } from "@/components/journal/AgentPersonaWalkthrough";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AgentStarter } from "@/lib/agents/starters";
import { cn } from "@/lib/utils";

type Mode = "brief" | "deep" | "starter" | "manual";

interface ManualDraft {
  name: string;
  role: string;
  description: string;
  personaPrompt: string;
  usesVoiceProfile: boolean;
  outputKind: "rewrite" | "response";
}

const initialDraft: ManualDraft = {
  name: "New agent",
  role: "editor",
  description: "",
  personaPrompt: "",
  usesVoiceProfile: true,
  outputKind: "rewrite",
};

export function AgentCreator({
  mode,
  starters,
}: {
  mode: Mode;
  starters: AgentStarter[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<ManualDraft>(initialDraft);
  const [saving, setSaving] = useState(false);

  if (mode === "brief" || mode === "deep") {
    return <AgentPersonaWalkthrough mode={mode} />;
  }

  async function cloneStarter(starter: AgentStarter) {
    setSaving(true);
    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starter: starter.slug, name: starter.name }),
      });
      if (response.ok) {
        const payload = (await response.json()) as { agent?: { id: string } };
        if (payload.agent?.id) {
          router.push(`/journal/style-guide/agents/${payload.agent.id}`);
          router.refresh();
          return;
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveManual() {
    if (!draft.personaPrompt.trim()) {
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          role: draft.role,
          description: draft.description || null,
          personaPrompt: draft.personaPrompt,
          usesVoiceProfile: draft.usesVoiceProfile,
          outputKind: draft.outputKind,
        }),
      });
      if (response.ok) {
        const payload = (await response.json()) as { agent?: { id: string } };
        if (payload.agent?.id) {
          router.push(`/journal/style-guide/agents/${payload.agent.id}`);
          router.refresh();
        }
      }
    } finally {
      setSaving(false);
    }
  }

  if (mode === "starter") {
    return (
      <div className="space-y-4">
        <header>
          <h2 className="font-display text-3xl font-semibold">Pick a starter</h2>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            Each starter is a small preset persona. Cloning copies it into your
            own row — you can rename it, edit the prompt, and tweak any time.
          </p>
        </header>
        <ul className="grid gap-3 sm:grid-cols-2">
          {starters.map((starter) => (
            <li
              className={cn(
                "rounded-md border border-border bg-surface p-4 transition hover:border-accent",
                saving && "pointer-events-none opacity-60",
              )}
              key={starter.slug}
            >
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                <UserRoundCog className="h-4 w-4 text-accent-hover" />
                {starter.name}
                <span className="rounded-sm bg-surface-sunken px-1.5 py-0.5 text-xs text-text-faint">
                  {starter.outputKind}
                </span>
              </div>
              <p className="mb-3 text-xs text-text-faint">{starter.description}</p>
              <Button
                onClick={() => void cloneStarter(starter)}
                size="sm"
                variant="secondary"
              >
                Clone into my agents
              </Button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h2 className="font-display text-3xl font-semibold">Write your own agent</h2>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">
          Hand-write the persona prompt and the metadata. You can test before
          saving from the agent's detail page.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Name</span>
          <Input
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            value={draft.name}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Role</span>
          <Input
            onChange={(event) => setDraft({ ...draft, role: event.target.value })}
            value={draft.role}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Description</span>
          <Input
            onChange={(event) =>
              setDraft({ ...draft, description: event.target.value })
            }
            placeholder="One-line summary the roster shows"
            value={draft.description}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Output kind</span>
          <Select
            onValueChange={(value) =>
              setDraft({
                ...draft,
                outputKind: value === "response" ? "response" : "rewrite",
              })
            }
            value={draft.outputKind}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rewrite">Rewrite</SelectItem>
              <SelectItem value="response">Response (read-only)</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <Switch
            checked={draft.usesVoiceProfile}
            onCheckedChange={(checked) =>
              setDraft({ ...draft, usesVoiceProfile: checked === true })
            }
          />
          <span className="font-medium">Uses your voice profile</span>
        </label>
      </div>
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">Persona prompt</span>
        <Textarea
          className="min-h-72 font-mono text-sm"
          onChange={(event) =>
            setDraft({ ...draft, personaPrompt: event.target.value })
          }
          placeholder="You are the…"
          value={draft.personaPrompt}
        />
      </label>
      <div className="flex gap-2">
        <Button
          disabled={saving || !draft.personaPrompt.trim()}
          onClick={() => void saveManual()}
        >
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
            </>
          ) : (
            "Save agent"
          )}
        </Button>
      </div>
    </div>
  );
}
