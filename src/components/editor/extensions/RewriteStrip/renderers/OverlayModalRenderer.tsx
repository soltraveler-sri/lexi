"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useRewriteStrip } from "@/components/editor/extensions/RewriteStrip/controller";
import { cn } from "@/lib/utils";

export function OverlayModalRenderer() {
  const {
    session,
    aiAvailable,
    updateInput,
    commit,
    cancel,
    startFromOriginal,
    setAutoAdvance,
    requestAiSuggestion,
  } = useRewriteStrip();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const aiLoading = session?.aiStatus === "loading";

  useEffect(() => {
    if (session?.mode === "overlay_modal") {
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, [session?.mode]);

  if (!session || session.mode !== "overlay_modal") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text/35 p-8 backdrop-blur-[1px]">
      <section className="rewrite-strip-active w-full max-w-3xl rounded-lg border border-border bg-surface p-5 shadow-lg">
        <div className="locked-original-node mb-3">{session.originalText}</div>
        <textarea
          className={cn(
            "min-h-44 w-full resize-none rounded-sm border-2 border-accent bg-surface px-3 py-3 font-display text-[18px] leading-[1.7] text-text shadow-sm outline-none",
            session.shake && "rewrite-shake",
          )}
          onChange={(event) => updateInput(event.target.value)}
          placeholder="Rewrite this line..."
          ref={textareaRef}
          value={session.input}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={() => void commit(false)} size="sm">
            Replace <kbd className="rounded-[4px] bg-white/20 px-1.5">⏎</kbd>
          </Button>
          <Button onClick={() => void commit(true)} size="sm" variant="secondary">
            Replace & Next{" "}
            <kbd className="rounded-[4px] bg-surface-sunken px-1.5">⇧⏎</kbd>
          </Button>
          {aiAvailable ? (
            <Button
              disabled={aiLoading}
              onClick={() => void requestAiSuggestion()}
              size="sm"
              variant="secondary"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {aiLoading
                ? "Drafting…"
                : session.aiSuggestion
                  ? "Regenerate"
                  : "Suggest with AI"}
            </Button>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <Checkbox
              checked={session.autoAdvance}
              onCheckedChange={(checked) => setAutoAdvance(checked === true)}
            />
            Auto-advance
          </label>
          <button
            className="text-sm text-accent-hover hover:underline"
            onClick={startFromOriginal}
            type="button"
          >
            Start from original
          </button>
          <Button onClick={cancel} size="sm" variant="ghost">
            Cancel <kbd className="rounded-[4px] bg-surface-sunken px-1.5">⎋</kbd>
          </Button>
          {session.aiError ? (
            <p className="basis-full text-xs text-red-600">{session.aiError}</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
