"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Mode = "select" | "brief" | "deep" | "skip";
type Stage = "intro" | "qa" | "compose" | "review" | "merging" | "done" | "error";
type MergeStrategy = "replace" | "append";

interface QnA {
  question: string;
  answer: string;
}

interface WalkthroughState {
  mode: Mode;
  stage: Stage;
  history: QnA[];
  currentQuestion: string | null;
  currentAnswer: string;
  draftPreferences: string;
  error: string | null;
}

const initialState: WalkthroughState = {
  mode: "select",
  stage: "intro",
  history: [],
  currentQuestion: null,
  currentAnswer: "",
  draftPreferences: "",
  error: null,
};

export function VoiceProfileWalkthrough({
  existingPreferences,
}: {
  existingPreferences: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<WalkthroughState>(initialState);
  const [busy, setBusy] = useState(false);
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>(
    existingPreferences ? "append" : "replace",
  );
  const answerRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (state.stage === "qa") {
      answerRef.current?.focus({ preventScroll: true });
    }
  }, [state.stage, state.currentQuestion]);

  async function fetchNextQuestion(history: QnA[], mode: "brief" | "deep") {
    setBusy(true);
    try {
      const response = await fetch(
        "/api/walkthrough/voice-profile/next-question",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, history }),
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | { question?: string | null; done?: boolean; message?: string; error?: string }
        | null;

      if (!response.ok) {
        setState((current) => ({
          ...current,
          stage: "error",
          error: payload?.message ?? payload?.error ?? "Could not fetch a question.",
        }));
        return;
      }

      if (payload?.done || !payload?.question) {
        await composeProfile(history);
        return;
      }

      setState((current) => ({
        ...current,
        stage: "qa",
        currentQuestion: payload.question ?? null,
        currentAnswer: "",
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        stage: "error",
        error: error instanceof Error ? error.message : "Network error.",
      }));
    } finally {
      setBusy(false);
    }
  }

  async function composeProfile(history: QnA[]) {
    setState((current) => ({ ...current, stage: "compose" }));
    setBusy(true);
    try {
      const response = await fetch("/api/walkthrough/voice-profile/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { profile?: string; message?: string; error?: string }
        | null;
      if (!response.ok || !payload?.profile) {
        setState((current) => ({
          ...current,
          stage: "error",
          error:
            payload?.message ??
            payload?.error ??
            "Could not compose a draft profile.",
        }));
        return;
      }
      setState((current) => ({
        ...current,
        stage: "review",
        draftPreferences: payload.profile ?? "",
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        stage: "error",
        error: error instanceof Error ? error.message : "Network error.",
      }));
    } finally {
      setBusy(false);
    }
  }

  function startMode(mode: "brief" | "deep") {
    setState({ ...initialState, mode, stage: "qa" });
    void fetchNextQuestion([], mode);
  }

  function submitAnswer() {
    if (state.mode !== "brief" && state.mode !== "deep") {
      return;
    }
    const trimmed = state.currentAnswer.trim();
    if (!trimmed) {
      return;
    }
    const nextHistory: QnA[] = [
      ...state.history,
      { question: state.currentQuestion ?? "", answer: trimmed },
    ];
    setState((current) => ({ ...current, history: nextHistory }));
    void fetchNextQuestion(nextHistory, state.mode);
  }

  function finishEarly() {
    if (state.history.length === 0) {
      return;
    }
    void composeProfile(state.history);
  }

  async function commitPreferences() {
    setState((current) => ({ ...current, stage: "merging" }));
    setBusy(true);
    try {
      const next =
        mergeStrategy === "append" && existingPreferences
          ? `${existingPreferences.trim()}\n\n${state.draftPreferences.trim()}`
          : state.draftPreferences.trim();
      const response = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: next }),
      });
      if (!response.ok) {
        setState((current) => ({
          ...current,
          stage: "error",
          error: "Could not save preferences.",
        }));
        return;
      }
      setState((current) => ({ ...current, stage: "done" }));
    } finally {
      setBusy(false);
    }
  }

  if (state.stage === "intro") {
    return (
      <div className="space-y-6">
        <header>
          <h2 className="font-display text-3xl font-semibold">
            Set up your voice profile
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            A short conversation that turns your taste into a clean prompt the
            model uses to preserve voice. You&apos;ll review and edit before
            anything is saved.
          </p>
        </header>
        <div className="grid gap-3 sm:grid-cols-3">
          <Button
            className="h-auto flex-col items-start gap-2 px-4 py-4 text-left"
            onClick={() => startMode("brief")}
            variant="secondary"
          >
            <span className="font-display text-lg">Brief walkthrough</span>
            <span className="text-xs text-text-muted">
              5–8 questions. A couple of minutes.
            </span>
          </Button>
          <Button
            className="h-auto flex-col items-start gap-2 px-4 py-4 text-left"
            onClick={() => startMode("deep")}
            variant="secondary"
          >
            <span className="font-display text-lg">Deep walkthrough</span>
            <span className="text-xs text-text-muted">
              15–25 model-led questions. 15–20 minutes.
            </span>
          </Button>
          <Button
            className="h-auto flex-col items-start gap-2 px-4 py-4 text-left"
            onClick={() => router.push("/journal/style-guide#preferences")}
            variant="secondary"
          >
            <span className="font-display text-lg">Skip / write my own</span>
            <span className="text-xs text-text-muted">
              Edit preferences directly. Tips on what makes a good prompt.
            </span>
          </Button>
        </div>
        {existingPreferences ? (
          <p className="text-xs text-text-faint">
            You already have a voice profile. The walkthrough will let you
            review the new draft side-by-side and choose to replace, append, or
            keep the existing one.
          </p>
        ) : null}
      </div>
    );
  }

  if (state.stage === "qa") {
    return (
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-text-faint">
            Question {state.history.length + 1}
            {state.mode === "brief" ? " / 5–8" : ""}
          </p>
          <Button onClick={finishEarly} size="sm" variant="ghost">
            Finish early ({state.history.length} answered)
          </Button>
        </header>
        <p className="font-display text-2xl leading-snug">
          {state.currentQuestion ?? "Loading…"}
        </p>
        <Textarea
          className="min-h-32"
          onChange={(event) =>
            setState((current) => ({
              ...current,
              currentAnswer: event.target.value,
            }))
          }
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              submitAnswer();
            }
          }}
          placeholder="Type your answer (Cmd/Ctrl+Enter to continue)"
          ref={answerRef}
          value={state.currentAnswer}
        />
        <div className="flex justify-end">
          <Button
            disabled={busy || !state.currentAnswer.trim()}
            onClick={submitAnswer}
          >
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

  if (state.stage === "compose") {
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-sm text-text-muted">
          <Sparkles className="h-4 w-4 animate-pulse text-accent-hover" />
          Drafting your profile from {state.history.length} answers…
        </p>
      </div>
    );
  }

  if (state.stage === "review" || state.stage === "merging") {
    const merged =
      mergeStrategy === "append" && existingPreferences
        ? `${existingPreferences.trim()}\n\n${state.draftPreferences.trim()}`
        : state.draftPreferences;

    return (
      <div className="space-y-4">
        <header>
          <h2 className="font-display text-3xl font-semibold">Review & save</h2>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            This is the prompt your voice profile will use. Edit anything you
            want; nothing is saved until you click Save.
          </p>
        </header>
        {existingPreferences ? (
          <div className="flex flex-wrap gap-2">
            <button
              className={cn(
                "rounded-sm border px-2 py-1 text-xs",
                mergeStrategy === "append"
                  ? "border-accent bg-accent-soft"
                  : "border-border bg-surface hover:bg-surface-sunken",
              )}
              onClick={() => setMergeStrategy("append")}
              type="button"
            >
              Append to existing
            </button>
            <button
              className={cn(
                "rounded-sm border px-2 py-1 text-xs",
                mergeStrategy === "replace"
                  ? "border-accent bg-accent-soft"
                  : "border-border bg-surface hover:bg-surface-sunken",
              )}
              onClick={() => setMergeStrategy("replace")}
              type="button"
            >
              Replace existing
            </button>
          </div>
        ) : null}
        <Textarea
          className="min-h-72"
          onChange={(event) =>
            setState((current) => ({
              ...current,
              draftPreferences: event.target.value,
            }))
          }
          value={
            mergeStrategy === "append" && existingPreferences
              ? merged
              : state.draftPreferences
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={busy || !state.draftPreferences.trim()}
            onClick={() => void commitPreferences()}
          >
            {state.stage === "merging" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
              </>
            ) : (
              "Save profile"
            )}
          </Button>
          <Button
            onClick={() => void composeProfile(state.history)}
            variant="secondary"
          >
            Re-compose
          </Button>
          <Button onClick={() => setState(initialState)} variant="ghost">
            Discard
          </Button>
        </div>
      </div>
    );
  }

  if (state.stage === "done") {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-3xl font-semibold">Saved.</h2>
        <p className="text-sm text-text-muted">
          Your voice profile now reflects this conversation. You can re-run the
          walkthrough any time from Style Guide → Set up my voice profile.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => router.push("/journal/style-guide")}>
            Back to Style Guide
          </Button>
          <Button onClick={() => router.push("/workspace")} variant="secondary">
            Back to writing
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-red-600">{state.error ?? "Something went wrong."}</p>
      <Button onClick={() => setState(initialState)} variant="secondary">
        Start over
      </Button>
    </div>
  );
}
