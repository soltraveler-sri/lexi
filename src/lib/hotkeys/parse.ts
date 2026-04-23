export interface ParsedHotkey {
  key: string;
  meta: boolean;
  shift: boolean;
  alt: boolean;
}

export function parseHotkey(hotkey: string): ParsedHotkey {
  const parts = hotkey.split("+");
  const key = parts[parts.length - 1]?.toLowerCase() ?? "";

  return {
    key,
    meta: parts.includes("Mod"),
    shift: parts.includes("Shift"),
    alt: parts.includes("Alt"),
  };
}

export function matchesHotkey(event: KeyboardEvent, hotkey: string) {
  const parsed = parseHotkey(hotkey);
  const key = event.key.toLowerCase();
  const expectedKey = parsed.key === "\\" ? "\\" : parsed.key.toLowerCase();

  return (
    key === expectedKey &&
    (!parsed.meta || event.metaKey || event.ctrlKey) &&
    parsed.shift === event.shiftKey &&
    parsed.alt === event.altKey
  );
}
