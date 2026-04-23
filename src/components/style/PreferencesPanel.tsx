"use client";

import { useEffect, useRef, useState } from "react";

import { Textarea } from "@/components/ui/textarea";

export function PreferencesPanel({ initialContent }: { initialContent: string }) {
  const [content, setContent] = useState(initialContent);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (timer.current) {
      window.clearTimeout(timer.current);
    }

    timer.current = window.setTimeout(() => {
      void fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
    }, 800);

    return () => {
      if (timer.current) {
        window.clearTimeout(timer.current);
      }
    };
  }, [content]);

  return (
    <Textarea
      className="min-h-44 text-base leading-7"
      onChange={(event) => setContent(event.target.value)}
      placeholder="Write durable guidance about your voice: cadence, favorite moves, things to avoid, recurring audience needs."
      value={content}
    />
  );
}
