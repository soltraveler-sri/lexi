"use client";

import { ArrowRight, Sparkles } from "lucide-react";

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
    <div
      className={cn(
        "rounded-md border border-dashed border-accent/60 bg-accent-soft/40 p-6 text-center",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-center gap-2 text-sm font-medium text-accent-hover">
        <Sparkles className="h-4 w-4" />
        Start with a stream of consciousness
      </div>
      <p className="mx-auto mb-5 max-w-md text-sm text-text-muted">
        Drop your messy thoughts into the doc; lexi will structure them in your
        voice. Or just keep writing — this card will fade once you&apos;ve gathered
        momentum.
      </p>
      <div className="flex items-center justify-center gap-2">
        <Button onClick={() => onOpenWithTarget("draft")}>
          Turn into a draft <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        <Button onClick={() => onOpenWithTarget("outline")} variant="secondary">
          Turn into an outline
        </Button>
      </div>
      <p className="mt-3 text-xs text-text-faint">
        or just start writing — that&apos;s an entirely valid path
      </p>
    </div>
  );
}
