"use client";

import { useState } from "react";

import { Switch } from "@/components/ui/switch";

export function SettingsToggles({
  alwaysSendFullVoiceProfile,
  editTagToastEnabled,
}: {
  alwaysSendFullVoiceProfile: boolean;
  editTagToastEnabled: boolean;
}) {
  const [fullProfile, setFullProfile] = useState(alwaysSendFullVoiceProfile);
  const [toastEnabled, setToastEnabled] = useState(editTagToastEnabled);

  async function patch(payload: Record<string, boolean>) {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  return (
    <div className="space-y-4">
      <label className="flex items-start justify-between gap-6">
        <span>
          <span className="block text-sm font-medium">Full Voice Profile</span>
          <span className="mt-1 block max-w-xl text-sm leading-6 text-text-muted">
            Sends the full profile with every AI call. Intended for use with prompt
            caching; may increase costs if caching is unavailable.
          </span>
        </span>
        <Switch
          checked={fullProfile}
          onCheckedChange={(checked) => {
            setFullProfile(checked);
            void patch({ alwaysSendFullVoiceProfile: checked });
          }}
        />
      </label>
      <label className="flex items-center justify-between gap-6">
        <span className="text-sm font-medium">Edit tag toast</span>
        <Switch
          checked={toastEnabled}
          onCheckedChange={(checked) => {
            setToastEnabled(checked);
            void patch({ editTagToastEnabled: checked });
          }}
        />
      </label>
    </div>
  );
}
