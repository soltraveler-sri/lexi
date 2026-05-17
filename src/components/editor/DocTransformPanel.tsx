"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Save, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Editor, JSONContent } from "@tiptap/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { consumeTextStream } from "@/lib/ai/streaming";
import { markdownToTipTap } from "@/lib/editor/markdown";
import { tipTapToText } from "@/lib/style/export";
import { socToDraftTransform } from "@/lib/transforms/doc";
import { cn } from "@/lib/utils";
import type { DocumentType, TipTapDocument, VoiceContext } from "@/types";

interface RunState {
  status: "idle" | "confirming" | "streaming" | "ready" | "error";
  text: string;
  error: string | null;
  target: "draft" | "outline";
}

const idleState: RunState = {
  status: "idle",
  text: "",
  error: null,
  target: "draft",
};

function approxWordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function describeCost(wordCount: number, target: "draft" | "outline") {
  const action =
    target === "outline"
      ? "outline the source"
      : "rewrite the source as a draft";
  return `This will read your full document — about ~${wordCount.toLocaleString()} words — and ${action}. Continue?`;
}

export function DocTransformPanel({
  editor,
  documentId,
  documentType,
  voiceContext,
  open,
  onOpenChange,
  initialTarget = "draft",
  triggerSource,
}: {
  editor: Editor | null;
  documentId: string;
  documentType: DocumentType;
  voiceContext: VoiceContext;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTarget?: "draft" | "outline";
  triggerSource: "blank-cta" | "doc-action";
}) {
  const router = useRouter();
  const [run, setRun] = useState<RunState>({ ...idleState, target: initialTarget });
  const [target, setTarget] = useState<"draft" | "outline">(initialTarget);
  const [snapshotting, setSnapshotting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setTarget(initialTarget);
      setRun({ ...idleState, target: initialTarget });
    } else {
      abortRef.current?.abort();
      abortRef.current = null;
    }
  }, [initialTarget, open]);

  const fullText = editor ? tipTapToText(editor.getJSON() as TipTapDocument) : "";
  const wordCount = approxWordCount(fullText);

  async function takeSnapshot(): Promise<boolean> {
    if (!editor) {
      return false;
    }
    setSnapshotting(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editor.getJSON(),
          wordCount,
        }),
      });
      return response.ok;
    } finally {
      setSnapshotting(false);
    }
  }

  async function startTransform() {
    if (!editor) {
      return;
    }

    setRun({ status: "confirming", text: "", error: null, target });
    const snapshotOk = await takeSnapshot();
    if (!snapshotOk) {
      setRun({
        status: "error",
        text: "",
        error: "Could not snapshot the document — refusing to run a destructive transform.",
        target,
      });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setRun({ status: "streaming", text: "", error: null, target });

    try {
      const response = await fetch(
        `/api/ai/doc-transform/${socToDraftTransform.id.replace("doc:", "")}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId,
            documentType,
            voiceContext,
            fullDocumentText: fullText,
            parameters: { target },
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
          error?: string;
        } | null;
        setRun({
          status: "error",
          text: "",
          error: payload?.message ?? payload?.error ?? "Doc transform failed.",
          target,
        });
        return;
      }

      const result = await consumeTextStream(response, {
        signal: controller.signal,
        onChunk: (cumulative) => {
          setRun((current) =>
            current.status === "streaming"
              ? { ...current, text: cumulative }
              : current,
          );
        },
      });

      const finalText = result.text.trim();

      if (!finalText) {
        setRun({
          status: "error",
          text: "",
          error: "The model returned nothing — your document is unchanged.",
          target,
        });
        return;
      }

      setRun({ status: "ready", text: finalText, error: null, target });
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        return;
      }
      const message = error instanceof Error ? error.message : "Network error";
      setRun({ status: "error", text: "", error: message, target });
    }
  }

  function applyAsReplacement() {
    if (!editor || run.status !== "ready" || !run.text.trim()) {
      return;
    }
    const tipTapDoc = markdownToTipTap(run.text);
    editor
      .chain()
      .focus()
      .setContent(tipTapDoc as JSONContent, true)
      .run();
    onOpenChange(false);
  }

  async function saveAsNewDoc() {
    if (run.status !== "ready" || !run.text.trim()) {
      return;
    }
    const tipTapDoc = markdownToTipTap(run.text);
    const wordCountResult = approxWordCount(run.text);
    const response = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:
          target === "outline"
            ? `Outline of ${documentId.slice(0, 8)}`
            : `Draft from ${documentId.slice(0, 8)}`,
        content: tipTapDoc,
        sourceDocumentId: documentId,
        wordCount: wordCountResult,
        type: documentType,
        voiceContext,
      }),
    });
    if (response.ok) {
      const payload = (await response.json()) as { document?: { id: string } };
      if (payload.document?.id) {
        onOpenChange(false);
        router.push(`/workspace/${payload.document.id}`);
      }
    }
  }

  function discard() {
    abortRef.current?.abort();
    abortRef.current = null;
    setRun({ ...idleState, target });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{socToDraftTransform.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-text-muted">
          {socToDraftTransform.description}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-text-faint">
            Target
          </span>
          <button
            className={cn(
              "rounded-sm border px-2 py-1 text-xs",
              target === "draft"
                ? "border-accent bg-accent-soft"
                : "border-border bg-surface hover:bg-surface-sunken",
            )}
            onClick={() => setTarget("draft")}
            type="button"
          >
            Draft
          </button>
          <button
            className={cn(
              "rounded-sm border px-2 py-1 text-xs",
              target === "outline"
                ? "border-accent bg-accent-soft"
                : "border-border bg-surface hover:bg-surface-sunken",
            )}
            onClick={() => setTarget("outline")}
            type="button"
          >
            Outline
          </button>
          <span className="ml-auto text-xs text-text-faint">
            from {triggerSource === "blank-cta" ? "blank doc" : "doc action"}
          </span>
        </div>
        {run.status === "idle" || run.status === "confirming" ? (
          <div className="space-y-3 rounded-sm bg-surface-sunken p-3 text-sm text-text-muted">
            <p>{describeCost(wordCount, target)}</p>
            <p className="text-xs text-text-faint">
              Your current document will be snapshotted before anything is replaced.
              You can also save the result as a new doc.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => void startTransform()} disabled={snapshotting}>
                {snapshotting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Snapshotting…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" /> Run
                  </>
                )}
              </Button>
              <Button onClick={discard} variant="ghost">
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
        {run.status === "streaming" || run.status === "ready" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <section className="max-h-[420px] overflow-auto rounded-sm border border-border bg-surface-sunken p-3 text-sm leading-6 text-text-muted">
                <header className="mb-2 text-xs uppercase tracking-wide text-text-faint">
                  Original
                </header>
                <pre className="whitespace-pre-wrap font-display">{fullText}</pre>
              </section>
              <section className="max-h-[420px] overflow-auto rounded-sm border border-accent bg-surface p-3 text-sm leading-6">
                <header className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-text-faint">
                  <span>Result ({target})</span>
                  {run.status === "streaming" ? (
                    <span className="flex items-center gap-1 text-text-faint">
                      <Loader2 className="h-3 w-3 animate-spin" /> drafting
                    </span>
                  ) : null}
                </header>
                <pre className="whitespace-pre-wrap font-display">{run.text}</pre>
              </section>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={run.status !== "ready" || !run.text.trim()}
                onClick={applyAsReplacement}
              >
                Replace document
              </Button>
              <Button
                disabled={run.status !== "ready" || !run.text.trim()}
                onClick={() => void saveAsNewDoc()}
                variant="secondary"
              >
                <Save className="h-3.5 w-3.5" />
                Save as new doc
              </Button>
              <Button onClick={discard} variant="ghost">
                Discard
              </Button>
            </div>
          </div>
        ) : null}
        {run.status === "error" ? (
          <div className="space-y-2 rounded-sm border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
            <p>{run.error}</p>
            <Button onClick={discard} variant="ghost" size="sm">
              Close
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
