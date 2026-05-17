"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

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
import { consumeTextStream } from "@/lib/ai/streaming";

interface AgentEditorState {
  id: string;
  name: string;
  role: string;
  description: string | null;
  personaPrompt: string;
  usesVoiceProfile: boolean;
  outputKind: "rewrite" | "response";
  defaultTemperature: string | null;
}

const DEFAULT_TEST_TEXT =
  "She wasn't sure what she was doing on a Tuesday afternoon at the edge of the city, holding a coffee that had gone cold somewhere between the train station and the bench, but she'd taken the day off and that meant something — at least it had at 7am when she'd written it on the whiteboard.";

export function AgentEditor({ agent }: { agent: AgentEditorState }) {
  const router = useRouter();
  const [draft, setDraft] = useState(agent);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testInput, setTestInput] = useState(DEFAULT_TEST_TEXT);
  const [testOutput, setTestOutput] = useState("");
  const [testError, setTestError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          role: draft.role,
          description: draft.description,
          personaPrompt: draft.personaPrompt,
          usesVoiceProfile: draft.usesVoiceProfile,
          outputKind: draft.outputKind,
          defaultTemperature: draft.defaultTemperature
            ? Number(draft.defaultTemperature)
            : null,
        }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this agent?")) {
      return;
    }
    await fetch(`/api/agents/${agent.id}`, { method: "DELETE" });
    router.push("/journal/style-guide");
    router.refresh();
  }

  async function runTest() {
    setTesting(true);
    setTestOutput("");
    setTestError(null);
    try {
      const response = await fetch(`/api/agents/test/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          personaPrompt: draft.personaPrompt,
          usesVoiceProfile: draft.usesVoiceProfile,
          outputKind: draft.outputKind,
          scope: "selection",
          text: testInput,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { message?: string; error?: string }
          | null;
        setTestError(payload?.message ?? payload?.error ?? "Test failed.");
        return;
      }
      const result = await consumeTextStream(response, {
        onChunk: (cumulative) => setTestOutput(cumulative),
      });
      setTestOutput(result.text);
    } catch (error) {
      setTestError(error instanceof Error ? error.message : "Network error.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="font-display text-3xl font-semibold">{draft.name}</h2>
        <Button onClick={() => void remove()} size="sm" variant="ghost">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
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
            value={draft.description ?? ""}
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
              <SelectItem value="rewrite">Rewrite (commits via strip)</SelectItem>
              <SelectItem value="response">Response (read-only side panel)</SelectItem>
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
          value={draft.personaPrompt}
        />
      </label>

      <div className="flex gap-2">
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>

      <section className="rounded-md border border-border bg-surface p-4">
        <header className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold">Test your agent</h3>
          <Button onClick={() => void runTest()} disabled={testing} size="sm">
            {testing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Running…
              </>
            ) : (
              "Run test"
            )}
          </Button>
        </header>
        <Textarea
          className="mb-3 min-h-32 text-sm"
          onChange={(event) => setTestInput(event.target.value)}
          value={testInput}
        />
        {testError ? <p className="text-sm text-danger">{testError}</p> : null}
        {testOutput ? (
          <pre className="whitespace-pre-wrap rounded-sm bg-surface-sunken p-3 text-sm">
            {testOutput}
          </pre>
        ) : null}
      </section>
    </div>
  );
}
