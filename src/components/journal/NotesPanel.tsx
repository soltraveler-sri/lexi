"use client";

import { useEffect, useRef, useState } from "react";

import { Textarea } from "@/components/ui/textarea";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function NotesPanel({ initialContent }: { initialContent: string }) {
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (timer.current) {
      window.clearTimeout(timer.current);
    }

    if (content === initialContent) {
      return;
    }

    setStatus("saving");
    timer.current = window.setTimeout(() => {
      void fetch("/api/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
        .then((response) => {
          setStatus(response.ok ? "saved" : "error");
        })
        .catch(() => setStatus("error"));
    }, 800);

    return () => {
      if (timer.current) {
        window.clearTimeout(timer.current);
      }
    };
  }, [content, initialContent]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-muted">
        Plain notes about your writing — patterns to keep, things to revisit,
        running observations. Per-user, single canvas. Future iterations may
        mix this into your voice profile, opt-in.
      </p>
      <Textarea
        className="min-h-[420px] text-base leading-7"
        onChange={(event) => setContent(event.target.value)}
        placeholder="What are you noticing about your writing?"
        value={content}
      />
      <p className="text-xs text-text-faint">
        {status === "saving"
          ? "Saving…"
          : status === "saved"
            ? "Saved"
            : status === "error"
              ? "Save failed — content kept locally"
              : ""}
      </p>
    </div>
  );
}
