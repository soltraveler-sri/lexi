"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CallTier, VoiceContext } from "@/types";

const scopes: VoiceContext[] = [
  "universal",
  "blog_post",
  "work_doc",
  "fiction",
  "communication",
];

export function VoiceProfilePreview() {
  const [scope, setScope] = useState<VoiceContext>("universal");
  const [tier, setTier] = useState<CallTier>("light");
  const [content, setContent] = useState("");
  const [open, setOpen] = useState(true);

  useEffect(() => {
    void fetch(`/api/voice-profile?scope=${scope}&tier=${tier}`)
      .then((response) => response.json())
      .then((payload: { profile?: { compiledSystemPrompt: string } }) => {
        setContent(payload.profile?.compiledSystemPrompt ?? "");
      });
  }, [scope, tier]);

  async function regenerate() {
    const response = await fetch("/api/voice-profile/regenerate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, tier }),
    });
    const payload = (await response.json()) as {
      profile?: { compiledSystemPrompt: string };
    };
    setContent(payload.profile?.compiledSystemPrompt ?? "");
  }

  return (
    <div className="rounded-md border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <button
          className="font-display text-xl font-semibold"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          Voice Profile preview
        </button>
        <div className="ml-auto flex items-center gap-2">
          <Select
            value={scope}
            onValueChange={(value) => setScope(value as VoiceContext)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {scopes.map((item) => (
                <SelectItem key={item} value={item}>
                  {item.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tier} onValueChange={(value) => setTier(value as CallTier)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">light</SelectItem>
              <SelectItem value="heavy">heavy</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => void regenerate()} size="sm" variant="secondary">
            Regenerate
          </Button>
        </div>
      </div>
      {open ? (
        <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-sm bg-surface-sunken p-4 font-ui text-sm leading-6 text-text-muted">
          {content}
        </pre>
      ) : null}
    </div>
  );
}
