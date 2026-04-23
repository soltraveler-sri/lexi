"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useRewriteStrip } from "@/components/editor/extensions/RewriteStrip/controller";
import { cn } from "@/lib/utils";

export function SidePanelRenderer() {
  const { session, updateInput, commit, cancel, startFromOriginal, setAutoAdvance } =
    useRewriteStrip();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (session?.mode === "side_panel") {
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, [session?.mode]);

  if (!session || session.mode !== "side_panel") {
    return null;
  }

  return (
    <aside className="fixed right-0 top-0 z-50 h-screen w-[420px] border-l border-border bg-surface p-6 shadow-lg transition-transform duration-150">
      <div className="mb-4 font-ui text-xs font-medium uppercase tracking-wide text-text-faint">
        Rewrite
      </div>
      <div className="locked-original-node rewrite-strip-active mb-3">
        {session.originalText}
      </div>
      <textarea
        className={cn(
          "min-h-48 w-full resize-none rounded-sm border-2 border-accent bg-surface px-3 py-3 font-display text-[18px] leading-[1.7] text-text shadow-sm outline-none",
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
      </div>
    </aside>
  );
}
