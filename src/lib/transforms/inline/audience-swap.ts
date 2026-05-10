import { registerTransform } from "@/lib/transforms/registry";
import type {
  Transform,
  TransformPromptInput,
  TransformPromptResult,
} from "@/lib/transforms/types";

const AUDIENCE_INSTRUCTIONS: Record<string, string> = {
  senior_leader:
    "Rewrite for a senior decision-maker who is sharp on context but starved for time. Lead with the upshot. Trim setup. Highlight stakes and decisions, not process.",
  technical_peer:
    "Rewrite for a technically fluent peer. Use precise terminology where it earns its place; don't over-explain background they already know; lean into specifics.",
  generalist_reader:
    "Rewrite for a smart generalist with no domain background. Define jargon on first use, lean on relatable framing, and prioritize clarity over technical density.",
  friend:
    "Rewrite for a friend over coffee. Conversational, low formality, but still careful — keep it precise where it matters and warm throughout.",
};

function buildPrompt(input: TransformPromptInput): TransformPromptResult {
  const audience = input.parameters.audience ?? "generalist_reader";
  const instruction =
    AUDIENCE_INSTRUCTIONS[audience] ?? AUDIENCE_INSTRUCTIONS.generalist_reader;

  const lines = [
    `Document type: ${input.documentType.replace("_", " ")}`,
    `Voice context: ${input.voiceContext.replace("_", " ")}`,
  ];

  if (input.surroundingBefore.trim()) {
    lines.push("", "Preceding context:", input.surroundingBefore.trim());
  }
  lines.push("", "Passage to re-aim:", input.selection.trim());
  if (input.surroundingAfter.trim()) {
    lines.push("", "Following context:", input.surroundingAfter.trim());
  }
  lines.push(
    "",
    "Instructions:",
    instruction,
    "Preserve content and the writer's underlying voice. Only the audience's needs change — don't change what is being said.",
    "",
    "Return only the revised passage. Do not include quotes, labels, explanations, or commentary.",
  );

  return { prompt: lines.join("\n"), temperature: 0.6 };
}

export const audienceSwapTransform: Transform = {
  id: "audience_swap",
  name: "Audience swap",
  description: "Re-aim the passage at a different reader.",
  requiresSelection: true,
  variantCount: 1,
  parameters: [
    {
      id: "audience",
      label: "Audience",
      default: "generalist_reader",
      options: [
        { value: "senior_leader", label: "Senior leader" },
        { value: "technical_peer", label: "Technical peer" },
        { value: "generalist_reader", label: "Generalist reader" },
        { value: "friend", label: "Friend" },
      ],
    },
  ],
  buildPrompt,
};

registerTransform(audienceSwapTransform);
