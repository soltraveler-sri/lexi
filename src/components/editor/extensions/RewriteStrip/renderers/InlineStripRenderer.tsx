"use client";

import { useEffect, useRef } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useRewriteStrip,
  VARIANT_HOTKEYS,
  VARIANT_LABELS,
  type VariantKey,
} from "@/components/editor/extensions/RewriteStrip/controller";
import { cn } from "@/lib/utils";

function isVariantKey(value: unknown): value is VariantKey {
  return value === "tighter" || value === "warmer";
}

function ActionRow() {
  const {
    session,
    aiAvailable,
    commit,
    cancel,
    startFromOriginal,
    setAutoAdvance,
    retryStreaming,
  } = useRewriteStrip();

  if (!session) {
    return null;
  }

  const focused = session.variants[session.focused];
  const anyError = focused.status === "error";

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 font-ui text-sm">
      <Button onClick={() => void commit(false)} size="sm">
        Replace {VARIANT_LABELS[session.focused]}{" "}
        <kbd className="rounded-[4px] bg-white/20 px-1.5">⌘⏎</kbd>
      </Button>
      <Button onClick={() => void commit(true)} size="sm" variant="secondary">
        Replace & Next <kbd className="rounded-[4px] bg-surface-sunken px-1.5">⇧⏎</kbd>
      </Button>
      {aiAvailable && anyError ? (
        <Button onClick={retryStreaming} size="sm" variant="secondary">
          <Sparkles className="h-3.5 w-3.5" />
          Retry both
        </Button>
      ) : null}
      <label className="ml-1 flex items-center gap-2 text-text-muted">
        <Checkbox
          checked={session.autoAdvance}
          onCheckedChange={(checked) => setAutoAdvance(checked === true)}
        />
        Auto-advance
      </label>
      <button
        className="ml-auto text-sm text-accent-hover hover:underline"
        onClick={() => startFromOriginal(session.focused)}
        type="button"
      >
        Start from original
      </button>
      <Button onClick={cancel} size="sm" variant="ghost">
        Cancel <kbd className="rounded-[4px] bg-surface-sunken px-1.5">⎋</kbd>
      </Button>
      {!aiAvailable ? (
        <p className="basis-full text-xs text-text-faint">
          AI suggestions are unavailable — type a manual rewrite into either pane.
        </p>
      ) : null}
    </div>
  );
}

export function InlineStripNodeView({ node }: NodeViewProps) {
  const { session, updateVariant, commit, focusVariant } = useRewriteStrip();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const rewriteId =
    typeof node.attrs.rewriteId === "string" ? node.attrs.rewriteId : null;
  const variantKey = isVariantKey(node.attrs.variantKey)
    ? node.attrs.variantKey
    : null;

  const variant = session && variantKey ? session.variants[variantKey] : null;
  const expectedNodeId =
    session && variantKey ? session.variantNodeIds[variantKey] : null;
  const isActive = Boolean(expectedNodeId && expectedNodeId === rewriteId);
  const isFocused =
    isActive && Boolean(session && variantKey && session.focused === variantKey);
  const isLoading = variant?.status === "loading";
  const isStreaming = variant?.status === "streaming";
  const showActionRow = isFocused;
  const variantText = variant?.text ?? "";

  // Focus the textarea when the user picks this variant.
  useEffect(() => {
    if (isFocused) {
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, [isFocused]);

  // Keep the textarea sized to its content.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [variantText]);

  if (!session || !variantKey || !variant) {
    return <NodeViewWrapper className="rewrite-input-node" />;
  }

  if (!isActive) {
    return <NodeViewWrapper className="rewrite-input-node" />;
  }

  const placeholder = isLoading
    ? "Drafting…"
    : variantKey === "tighter"
      ? "Tighter, more direct…"
      : "Warmer, more conversational…";

  return (
    <NodeViewWrapper
      className={cn(
        "rewrite-input-node rewrite-strip-active rounded-sm",
        isFocused
          ? "bg-surface ring-2 ring-accent"
          : "bg-surface/70 ring-1 ring-border",
        session.shake && isFocused && "rewrite-shake",
      )}
      data-rewrite-id={rewriteId}
      data-rewrite-input="true"
      data-variant-key={variantKey}
      onClick={() => focusVariant(variantKey)}
    >
      <header className="flex items-center justify-between px-3 pt-2 font-ui text-xs uppercase tracking-wide text-text-faint">
        <span className="flex items-center gap-1.5">
          {VARIANT_LABELS[variantKey]}
          <span className="text-text-faint/70">{VARIANT_HOTKEYS[variantKey]}</span>
        </span>
        {isLoading || isStreaming ? (
          <span className="flex items-center gap-1 text-text-faint">
            <Loader2 className="h-3 w-3 animate-spin" /> drafting
          </span>
        ) : variant.status === "error" ? (
          <span className="text-danger">{variant.error || "AI unavailable"}</span>
        ) : null}
      </header>
      <textarea
        className="min-h-24 w-full resize-none rounded-sm bg-transparent px-3 py-2 font-display text-[18px] leading-[1.7] text-text outline-none placeholder:text-text-faint"
        onChange={(event) => updateVariant(variantKey, event.target.value)}
        onFocus={() => focusVariant(variantKey)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void commit(event.shiftKey);
          }
        }}
        placeholder={placeholder}
        ref={textareaRef}
        value={variant.text}
      />
      {showActionRow ? (
        <div className="px-3 pb-3">
          <ActionRow />
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}
