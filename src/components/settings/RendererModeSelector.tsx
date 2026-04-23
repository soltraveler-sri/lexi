"use client";

import { useState } from "react";

import type { RendererMode } from "@/types";

const modes: Array<{ value: RendererMode; label: string }> = [
  { value: "inline_strip", label: "Inline strip" },
  { value: "side_panel", label: "Side panel" },
  { value: "overlay_modal", label: "Overlay modal" },
];

export function RendererModeSelector({ value }: { value: RendererMode }) {
  const [mode, setMode] = useState(value);

  async function update(next: RendererMode) {
    setMode(next);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rendererMode: next }),
    });
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {modes.map((item) => (
        <button
          className={`rounded-sm border px-3 py-2 text-sm transition-colors ${
            mode === item.value
              ? "border-accent bg-accent-soft text-text"
              : "border-border bg-surface hover:bg-surface-sunken"
          }`}
          key={item.value}
          onClick={() => void update(item.value)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
