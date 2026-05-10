"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Candidate {
  id: string;
  statement: string;
  rationale: string;
  examples: Array<{ before: string; after: string }>;
}

interface CandidateState {
  candidate: Candidate;
  status: "pending" | "edited" | "accepted" | "rejected";
  edited: string;
}

const MIN_CORPUS_SIZE = 5;

export function AnalyzeEditsButton({ corpusSize }: { corpusSize: number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateState[]>([]);
  const [appended, setAppended] = useState<number>(0);

  const insufficient = corpusSize < MIN_CORPUS_SIZE;

  async function run() {
    setOpen(true);
    if (insufficient) {
      setCandidates([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/style/analyze-edits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await response.json().catch(() => null)) as
        | { candidates?: Candidate[]; message?: string; error?: string }
        | null;

      if (!response.ok) {
        setError(payload?.message ?? payload?.error ?? "Analysis failed.");
        setCandidates([]);
        return;
      }

      setCandidates(
        (payload?.candidates ?? []).map((candidate) => ({
          candidate,
          status: "pending",
          edited: candidate.statement,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function accept(state: CandidateState) {
    const text = state.edited.trim();
    if (!text) {
      return;
    }
    const response = await fetch("/api/style/analyze-edits/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statement: text }),
    });
    if (response.ok) {
      setCandidates((items) =>
        items.map((entry) =>
          entry.candidate.id === state.candidate.id
            ? { ...entry, status: "accepted" }
            : entry,
        ),
      );
      setAppended((count) => count + 1);
    }
  }

  function reject(state: CandidateState) {
    setCandidates((items) =>
      items.map((entry) =>
        entry.candidate.id === state.candidate.id
          ? { ...entry, status: "rejected" }
          : entry,
      ),
    );
  }

  return (
    <>
      <Button onClick={() => void run()} size="sm" variant="secondary">
        <Sparkles className="h-3.5 w-3.5" />
        Analyze my edits
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Analyze my edits → suggest preferences</DialogTitle>
          </DialogHeader>
          {insufficient ? (
            <p className="text-sm text-text-muted">
              Not enough material yet — accept a few rewrites first ({corpusSize}/{MIN_CORPUS_SIZE}). Patterns get more useful with a real corpus.
            </p>
          ) : null}
          {!insufficient && loading ? (
            <p className="flex items-center gap-2 text-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing your last
              accepted rewrites…
            </p>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {!loading && candidates.length > 0 ? (
            <ul className="space-y-3">
              {candidates.map((state) => (
                <li
                  className="rounded-md border border-border bg-surface p-3"
                  key={state.candidate.id}
                >
                  <Textarea
                    className="min-h-16 text-sm"
                    onChange={(event) =>
                      setCandidates((items) =>
                        items.map((entry) =>
                          entry.candidate.id === state.candidate.id
                            ? {
                                ...entry,
                                edited: event.target.value,
                                status: "edited",
                              }
                            : entry,
                        ),
                      )
                    }
                    value={state.edited}
                  />
                  <p className="mt-2 text-xs text-text-faint">
                    {state.candidate.rationale}
                  </p>
                  {state.candidate.examples.length ? (
                    <ul className="mt-2 space-y-1 text-xs text-text-muted">
                      {state.candidate.examples.map((example, index) => (
                        <li key={index}>
                          <span className="text-text-faint">before:</span>{" "}
                          {example.before}{" "}
                          <span className="text-text-faint">after:</span>{" "}
                          {example.after}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="mt-3 flex gap-2">
                    {state.status === "accepted" ? (
                      <span className="text-xs text-text-faint">Appended ✓</span>
                    ) : state.status === "rejected" ? (
                      <span className="text-xs text-text-faint">Rejected</span>
                    ) : (
                      <>
                        <Button
                          onClick={() => void accept(state)}
                          size="sm"
                        >
                          Append to preferences
                        </Button>
                        <Button
                          onClick={() => reject(state)}
                          size="sm"
                          variant="ghost"
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          {appended > 0 ? (
            <p className="text-xs text-text-faint">
              Added {appended} bullet{appended === 1 ? "" : "s"} to your
              preferences. Tweak any time from this page.
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
