"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const tags = ["voice", "tighter", "restructured", "factual"];

export function EditTagToast({
  eventId,
  enabled,
  onDismiss,
}: {
  eventId: string | null;
  enabled: boolean;
  onDismiss: () => void;
}) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [showHideLink, setShowHideLink] = useState(false);
  const interactedRef = useRef(false);

  useEffect(() => {
    if (!eventId || !enabled) {
      return;
    }

    setSelectedTags([]);
    setNote("");
    interactedRef.current = false;
    setShowHideLink(
      Number(window.localStorage.getItem("forge-toast-dismisses") ?? "0") >= 3,
    );

    const timeout = window.setTimeout(() => {
      if (!interactedRef.current) {
        const count =
          Number(window.localStorage.getItem("forge-toast-dismisses") ?? "0") + 1;
        window.localStorage.setItem("forge-toast-dismisses", String(count));
      }
      onDismiss();
    }, 8000);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onDismiss();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled, eventId, onDismiss]);

  if (!eventId || !enabled) {
    return null;
  }

  async function patchEvent(nextTags: string[], nextNote = note) {
    interactedRef.current = true;
    window.localStorage.setItem("forge-toast-dismisses", "0");

    await fetch(`/api/style-events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ editTags: nextTags, note: nextNote }),
    });
  }

  async function hideToasts() {
    interactedRef.current = true;
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ editTagToastEnabled: false }),
    });
    onDismiss();
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-80 rounded-md border border-border bg-surface p-3 opacity-100 shadow-lg transition-opacity duration-200"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="mb-2 flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const active = selectedTags.includes(tag);

          return (
            <button
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                active
                  ? "border-accent bg-accent-soft text-text"
                  : "border-border bg-surface text-text-muted hover:bg-surface-sunken",
              )}
              key={tag}
              onClick={() => {
                const next = active
                  ? selectedTags.filter((item) => item !== tag)
                  : [...selectedTags, tag];
                setSelectedTags(next);
                void patchEvent(next);
              }}
              type="button"
            >
              {tag}
            </button>
          );
        })}
      </div>
      <Input
        className="h-8 text-xs"
        onChange={(event) => setNote(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            void patchEvent(selectedTags, note);
            onDismiss();
          }
        }}
        placeholder="Why?"
        value={note}
      />
      {showHideLink ? (
        <button
          className="mt-2 text-xs text-text-faint hover:text-text"
          onClick={() => void hideToasts()}
          type="button"
        >
          Hide these?
        </button>
      ) : null}
      <Button
        className="absolute right-2 top-2 h-6 px-2 text-xs"
        onClick={onDismiss}
        size="sm"
        variant="ghost"
      >
        Dismiss
      </Button>
    </div>
  );
}
