"use client";

import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const THRESHOLD_WORDS = 50;

export function shouldShowBlankCta(wordCount: number) {
  return wordCount < THRESHOLD_WORDS;
}

export function BlankDocCTA({
  wordCount,
  onOpenWithTarget,
  className,
}: {
  wordCount: number;
  onOpenWithTarget: (target: "draft" | "outline") => void;
  className?: string;
}) {
  if (!shouldShowBlankCta(wordCount)) {
    return null;
  }

  return (
    <aside
      className={cn(
        "border-l border-border pl-5",
        className,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
        A way in
      </p>
      <p className="mt-2 font-display text-[20px] leading-snug text-text">
        Drop the messy thoughts in. Lexi will shape them in your voice.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => onOpenWithTarget("draft")} size="sm">
          Turn into a draft <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          onClick={() => onOpenWithTarget("outline")}
          size="sm"
          variant="secondary"
        >
          Turn into an outline
        </Button>
        <span className="text-xs text-text-faint">
          or just start writing — this fades on its own
        </span>
      </div>
    </aside>
  );
}
