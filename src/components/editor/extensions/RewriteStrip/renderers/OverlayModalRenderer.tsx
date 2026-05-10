"use client";

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

const VARIANTS: VariantKey[] = ["tighter", "warmer"];

function VariantPane({ variantKey }: { variantKey: VariantKey }) {
  const { session, updateVariant, focusVariant, commit } = useRewriteStrip();

  if (!session) {
    return null;
  }

  const variant = session.variants[variantKey];
  const isFocused = session.focused === variantKey;
  const isLoading = variant.status === "loading";
  const isStreaming = variant.status === "streaming";

  return (
    <div
      className={cn(
        "rounded-sm border bg-surface px-3 py-2",
        isFocused ? "border-accent ring-1 ring-accent" : "border-border",
        session.shake && isFocused && "rewrite-shake",
      )}
      onClick={() => focusVariant(variantKey)}
    >
      <header className="mb-1 flex items-center justify-between font-ui text-xs uppercase tracking-wide text-text-faint">
        <span className="flex items-center gap-1.5">
          {VARIANT_LABELS[variantKey]}
          <span className="text-text-faint/70">{VARIANT_HOTKEYS[variantKey]}</span>
        </span>
        {isLoading || isStreaming ? (
          <span className="flex items-center gap-1 text-text-faint">
            <Loader2 className="h-3 w-3 animate-spin" /> drafting
          </span>
        ) : variant.status === "error" ? (
          <span className="text-red-600">{variant.error || "AI unavailable"}</span>
        ) : null}
      </header>
      <textarea
        className="min-h-32 w-full resize-none rounded-sm bg-transparent font-display text-[18px] leading-[1.6] text-text outline-none placeholder:text-text-faint"
        onChange={(event) => updateVariant(variantKey, event.target.value)}
        onFocus={() => focusVariant(variantKey)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void commit(event.shiftKey);
          }
        }}
        placeholder={
          variantKey === "tighter"
            ? "Tighter, more direct…"
            : "Warmer, more conversational…"
        }
        value={variant.text}
      />
    </div>
  );
}

export function OverlayModalRenderer() {
  const {
    session,
    aiAvailable,
    commit,
    cancel,
    startFromOriginal,
    setAutoAdvance,
    retryStreaming,
  } = useRewriteStrip();

  if (!session || session.mode !== "overlay_modal") {
    return null;
  }

  const focused = session.variants[session.focused];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text/35 p-8 backdrop-blur-[1px]">
      <section className="rewrite-strip-active w-full max-w-3xl rounded-lg border border-border bg-surface p-5 shadow-lg">
        <div className="locked-original-node mb-3">{session.originalText}</div>
        <div className="flex flex-col gap-3">
          {VARIANTS.map((variant) => (
            <VariantPane key={variant} variantKey={variant} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={() => void commit(false)} size="sm">
            Replace {VARIANT_LABELS[session.focused]}{" "}
            <kbd className="rounded-[4px] bg-white/20 px-1.5">⌘⏎</kbd>
          </Button>
          <Button onClick={() => void commit(true)} size="sm" variant="secondary">
            Replace & Next{" "}
            <kbd className="rounded-[4px] bg-surface-sunken px-1.5">⇧⏎</kbd>
          </Button>
          {aiAvailable && focused.status === "error" ? (
            <Button onClick={retryStreaming} size="sm" variant="secondary">
              <Sparkles className="h-3.5 w-3.5" />
              Retry both
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
      </section>
    </div>
  );
}
