"use client";

import { useEffect } from "react";

import { matchesHotkey } from "@/lib/hotkeys/parse";

export function useHotkey(
  hotkey: string,
  handler: (event: KeyboardEvent) => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!matchesHotkey(event, hotkey)) {
        return;
      }

      handler(event);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, handler, hotkey]);
}
