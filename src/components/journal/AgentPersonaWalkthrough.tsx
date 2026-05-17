"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Save, Sparkles } from "lucide-react";

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

type Stage = "qa" | "compose" | "review" | "test" | "saving" | "done" | "error";

interface QnA {
  question: string;
  answer: string;
}

interface DraftPersona {
  name: string;
  role: "editor" | "author" | "critic" | "other";
  outputKind: "rewrite" | "response";
  usesVoiceProfile: boolean;
  description: string;
  personaPrompt: string;
}

const DEFAULT_TEST_TEXT =
  "She wasn't sure what she was doing on a Tuesday afternoon at the edge of the city, holding a coffee that had gone cold somewhere between the train station and the bench, but she'd taken the day off and that meant something — at least it had at 7am when she'd written it on the whiteboard.";

export function AgentPersonaWalkthrough({ mode }: { mode: "brief" | "deep" }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("qa");
  const [history, setHistory] = useState<QnA[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [draft, setDraft] = useState<DraftPersona | null>(null);
  const [busy, setBusy] = useState(false);
  const [testInput, setTestInput] = useState(DEFAULT_TEST_TEXT);
  const [testOutput, setTestOutput] = useState("");
  const [testError, setTestError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const answerRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    void fetchNextQuestion([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stage === "qa" && currentQuestion) {
      answerRef.current?.focus({ preventScroll: true });
    }
  }, [stage, currentQuestion]);

  async function fetchNextQuestion(nextHistory: QnA[]) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        "/api/walkthrough/agent-persona/next-question",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, history: nextHistory }),
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | { question?: string | null; done?: boolean; message?: string; error?: string }
        | null;
      if (!response.ok) {
        setStage("error");
        setError(payload?.message ?? payload?.error ?? "Could not fetch a question.");
        return;
      }
      if (payload?.done || !payload?.question) {
        await composeDraft(nextHistory);
        return;
      }
      setCurrentQuestion(payload.question);
      setCurrentAnswer("");
      setStage("qa");
    } finally {
      setBusy(false);
    }
  }

  async function composeDraft(nextHistory: QnA[]) {
    setStage("compose");
    setBusy(true);
    try {
      const response = await fetch("/api/walkthrough/agent-persona/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: nextHistory }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { persona?: DraftPersona; message?: string; error?: string }
        | null;
      if (!response.ok || !payload?.persona) {
        setStage("error");
        setError(
          payload?.message ?? payload?.error ?? "Could not compose a draft persona.",
        );
        return;
      }
      setDraft(payload.persona);
      setStage("review");
    } finally {
      setBusy(false);
    }
  }

  function submitAnswer() {
    const trimmed = currentAnswer.trim();
    if (!trimmed) {
      return;
    }
    const nextHistory = [
      ...history,
      { question: currentQuestion ?? "", answer: trimmed },
    ];
    setHistory(nextHistory);
    void fetchNextQuestion(nextHistory);
  }

  function finishEarly() {
    if (history.length === 0) {
      return;
    }
    void composeDraft(history);
  }

  async function runTest() {
    if (!draft) {
      return;
    }
    setStage("test");
    setBusy(true);
    setTestOutput("");
    setTestError(null);
    try {
      const response = await fetch("/api/agents/test/run", {
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
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!draft) {
      return;
    }
    setStage("saving");
    setBusy(true);
    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          role: draft.role,
          description: draft.description,
          personaPrompt: draft.personaPrompt,
          usesVoiceProfile: draft.usesVoiceProfile,
          outputKind: draft.outputKind,
        }),
      });
      if (!response.ok) {
        setStage("error");
        setError("Could not save agent.");
        return;
      }
      const payload = (await response.json()) as { agent?: { id: string } };
      if (payload.agent?.id) {
        router.push(`/journal/style-guide/agents/${payload.agent.id}`);
        router.refresh();
        return;
      }
      setStage("done");
    } finally {
      setBusy(false);
    }
  }

  if (stage === "qa") {
    return (
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-text-faint">
            Question {history.length + 1}
            {mode === "brief" ? " / 5–8" : ""}
          </p>
          <Button onClick={finishEarly} size="sm" variant="ghost">
            Finish early ({history.length} answered)
          </Button>
        </header>
        <p className="font-display text-2xl leading-snug">
          {currentQuestion ?? "Loading…"}
        </p>
        <Textarea
          className="min-h-32"
          onChange={(event) => setCurrentAnswer(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              submitAnswer();
            }
          }}
          placeholder="Type your answer (Cmd/Ctrl+Enter to continue)"
          ref={answerRef}
          value={currentAnswer}
        />
        <div className="flex justify-end">
          <Button disabled={busy || !currentAnswer.trim()} onClick={submitAnswer}>
            {busy ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
              </>
            ) : (
              <>
                Continue <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (stage === "compose") {
    return (
      <p className="flex items-center gap-2 text-sm text-text-muted">
        <Sparkles className="h-4 w-4 animate-pulse text-accent-hover" />
        Drafting your agent from {history.length} answers…
      </p>
    );
  }

  if (stage === "error" || !draft) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-danger">{error ?? "Something went wrong."}</p>
        <Button onClick={() => router.push("/journal/style-guide")}>
          Back to Style Guide
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-3xl font-semibold">Review & test</h2>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">
          Edit anything you want. Run a test before saving — the agent runs
          against a sample paragraph using your voice profile (if it&apos;s
          wired to use it). When you&apos;re happy, save it to the roster.
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
          <Select
            onValueChange={(value) =>
              setDraft({
                ...draft,
                role: value as DraftPersona["role"],
              })
            }
            value={draft.role}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="author">Author</SelectItem>
              <SelectItem value="critic">Critic</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Description</span>
          <Input
            onChange={(event) =>
              setDraft({ ...draft, description: event.target.value })
            }
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
          value={draft.personaPrompt}
        />
      </label>

      <section className="rounded-md border border-border bg-surface p-4">
        <header className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold">Test your agent</h3>
          <Button
            disabled={busy}
            onClick={() => void runTest()}
            size="sm"
            variant="secondary"
          >
            {busy && stage === "test" ? (
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
        {testError ? (
          <p className="text-sm text-danger">{testError}</p>
        ) : null}
        {testOutput ? (
          <pre className="whitespace-pre-wrap rounded-sm bg-surface-sunken p-3 text-sm">
            {testOutput}
          </pre>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void save()}>
          {stage === "saving" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" /> Save agent
            </>
          )}
        </Button>
        <Button onClick={() => router.push("/journal/style-guide")} variant="ghost">
          Discard
        </Button>
      </div>
    </div>
  );
}
