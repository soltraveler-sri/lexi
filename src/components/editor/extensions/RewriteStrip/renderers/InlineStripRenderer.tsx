"use client";

import { useEffect, useRef } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useRewriteStrip } from "@/components/editor/extensions/RewriteStrip/controller";
import { cn } from "@/lib/utils";

function ActionRow() {
  const { session, commit, cancel, startFromOriginal, setAutoAdvance } =
    useRewriteStrip();

  if (!session) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 font-ui text-sm">
      <Button onClick={() => void commit(false)} size="sm">
        Replace <kbd className="rounded-[4px] bg-white/20 px-1.5">⏎</kbd>
      </Button>
      <Button onClick={() => void commit(true)} size="sm" variant="secondary">
        Replace & Next <kbd className="rounded-[4px] bg-surface-sunken px-1.5">⇧⏎</kbd>
      </Button>
      <label className="ml-1 flex items-center gap-2 text-text-muted">
        <Checkbox
          checked={session.autoAdvance}
          onCheckedChange={(checked) => setAutoAdvance(checked === true)}
        />
        Auto-advance
      </label>
      <button
        className="ml-auto text-sm text-accent-hover hover:underline"
        onClick={startFromOriginal}
        type="button"
      >
        Start from original
      </button>
      <Button onClick={cancel} size="sm" variant="ghost">
        Cancel <kbd className="rounded-[4px] bg-surface-sunken px-1.5">⎋</kbd>
      </Button>
    </div>
  );
}

export function InlineStripNodeView({ node }: NodeViewProps) {
  const { session, updateInput, commit } = useRewriteStrip();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const rewriteId =
    typeof node.attrs.rewriteId === "string" ? node.attrs.rewriteId : null;
  const isActive = Boolean(session && session.id === rewriteId);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    textareaRef.current?.focus({ preventScroll: true });
  }, [isActive]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [session?.input]);

  if (!isActive || !session) {
    return <NodeViewWrapper className="rewrite-input-node" />;
  }

  return (
    <NodeViewWrapper
      className={cn(
        "rewrite-input-node rewrite-strip-active rounded-sm bg-surface",
        session.shake && "rewrite-shake",
      )}
      data-rewrite-id={session.id}
      data-rewrite-input="true"
    >
      <textarea
        className="min-h-28 w-full resize-none rounded-sm border-2 border-accent bg-surface px-3 py-3 font-display text-[18px] leading-[1.7] text-text shadow-sm outline-none placeholder:text-text-faint"
        onChange={(event) => updateInput(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void commit(event.shiftKey);
          }
        }}
        placeholder="Rewrite this line..."
        ref={textareaRef}
        value={session.input}
      />
      <ActionRow />
    </NodeViewWrapper>
  );
}
