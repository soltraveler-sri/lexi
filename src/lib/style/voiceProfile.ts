import * as exemplarsRepo from "@/lib/db/repos/exemplars";
import * as preferencesRepo from "@/lib/db/repos/preferences";
import * as settingsRepo from "@/lib/db/repos/settings";
import * as styleEventsRepo from "@/lib/db/repos/styleEvents";
import * as voiceProfilesRepo from "@/lib/db/repos/voiceProfiles";
import type { CallTier, VoiceContext } from "@/types";

export const HEAVY_PROFILE_EXEMPLAR_COUNT = 5;
export const HEAVY_PROFILE_EDIT_PAIR_COUNT = 15;

export interface CompiledVoiceProfile {
  scope: VoiceContext;
  tier: CallTier;
  compiledSystemPrompt: string;
  includedExemplarIds: string[];
  includedEventIds: string[];
  cachedSystemBlocks: string[];
}

function heading(title: string) {
  return `\n\n## ${title}\n`;
}

function scoreByScope(scope: VoiceContext, value: string) {
  if (value === scope) {
    return 0;
  }

  if (value === "universal") {
    return 1;
  }

  return 2;
}

export async function compileVoiceProfile(
  userId: string,
  scope: VoiceContext,
  tier: CallTier,
  persist = true,
): Promise<CompiledVoiceProfile> {
  const [preferences, settings] = await Promise.all([
    preferencesRepo.getForUser(userId),
    settingsRepo.ensureForUser(userId),
  ]);

  const preferenceText = preferences?.content.trim() ?? "";
  const effectiveTier: CallTier =
    tier === "light" && !settings.alwaysSendFullVoiceProfile ? "light" : "heavy";

  const promptParts = [
    "You are the writer's private voice profile. Use these notes to preserve voice, rhythm, priorities, and editing instincts.",
    heading("Preferences"),
    preferenceText || "No explicit preferences have been written yet.",
  ];

  const includedExemplarIds: string[] = [];
  const includedEventIds: string[] = [];

  if (effectiveTier === "heavy") {
    const [exemplars, events] = await Promise.all([
      exemplarsRepo.listForUser(userId),
      styleEventsRepo.listForUser(userId, 100),
    ]);

    const selectedExemplars = exemplars
      .slice()
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .slice(-HEAVY_PROFILE_EXEMPLAR_COUNT);

    const selectedEvents = events
      .slice()
      .sort((left, right) => {
        const scopeScore =
          scoreByScope(scope, left.voiceContext) -
          scoreByScope(scope, right.voiceContext);

        if (scopeScore !== 0) {
          return scopeScore;
        }

        return right.createdAt.getTime() - left.createdAt.getTime();
      })
      .slice(0, HEAVY_PROFILE_EDIT_PAIR_COUNT);

    includedExemplarIds.push(...selectedExemplars.map((item) => item.id));
    includedEventIds.push(...selectedEvents.map((item) => item.id));

    promptParts.push(
      heading("Exemplars"),
      selectedExemplars.length
        ? selectedExemplars
            .map((item, index) => `${index + 1}. ${item.textSnapshot}`)
            .join("\n\n")
        : "No exemplars have been marked yet.",
      heading("Edit Pairs"),
      selectedEvents.length
        ? selectedEvents
            .map(
              (event, index) =>
                `${index + 1}. Before: ${event.beforeText}\nAfter: ${event.afterText}`,
            )
            .join("\n\n")
        : "No rewrite events have been captured yet.",
    );
  }

  const compiledSystemPrompt = promptParts.join("").trim();

  if (persist) {
    await voiceProfilesRepo.create({
      userId,
      scope,
      compiledSystemPrompt,
      includedExemplarIds,
      includedEventIds,
    });
  }

  return {
    scope,
    tier,
    compiledSystemPrompt,
    includedExemplarIds,
    includedEventIds,
    // Light calls normally include preferences only. When alwaysSendFullVoiceProfile
    // is enabled, light calls are upgraded to the heavy composition and exposed as
    // a cacheable system block so Anthropic prompt caching can make repeated,
    // profile-rich calls cheap once real AI surfaces are wired.
    cachedSystemBlocks:
      tier === "light" && settings.alwaysSendFullVoiceProfile
        ? [compiledSystemPrompt]
        : [],
  };
}
