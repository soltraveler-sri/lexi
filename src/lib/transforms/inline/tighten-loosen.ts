import { registerTransform } from "@/lib/transforms/registry";
import type {
  Transform,
  TransformPromptInput,
  TransformPromptResult,
} from "@/lib/transforms/types";

function buildPrompt(input: TransformPromptInput): TransformPromptResult {
  const direction = input.parameters.direction ?? "tighten";
  const directionInstruction =
    direction === "tighten"
      ? "Tighten the passage by roughly 20–30%. Cut redundancy, prefer plain verbs, keep meaning, voice, and continuity intact."
      : "Loosen the passage by roughly 20–30%. Add breath without padding — fuller phrasing, gentler cadence, additional clarifying detail where it earns its place. Keep meaning, voice, and continuity intact.";

  const variantHint =
    input.variantHint === "tighter"
      ? "\nLean a touch crisper than the baseline."
      : input.variantHint === "warmer"
        ? "\nLean a touch softer than the baseline."
        : "";

  const lines = [
    `Document type: ${input.documentType.replace("_", " ")}`,
    `Voice context: ${input.voiceContext.replace("_", " ")}`,
  ];

  if (input.surroundingBefore.trim()) {
    lines.push("", "Preceding context:", input.surroundingBefore.trim());
  }
  lines.push("", "Passage to revise:", input.selection.trim());
  if (input.surroundingAfter.trim()) {
    lines.push("", "Following context:", input.surroundingAfter.trim());
  }
  lines.push(
    "",
    "Instructions:",
    directionInstruction + variantHint,
    "",
    "Return only the revised passage. Do not include quotes, labels, explanations, or commentary.",
  );

  return {
    prompt: lines.join("\n"),
    temperature: input.variantHint === "tighter" ? 0.55 : 0.8,
  };
}

export const tightenLoosenTransform: Transform = {
  id: "tighten_loosen",
  name: "Tighten / Loosen",
  description: "Compress or expand the selection by ~20–30%.",
  requiresSelection: true,
  variantCount: 2,
  parameters: [
    {
      id: "direction",
      label: "Direction",
      default: "tighten",
      options: [
        {
          value: "tighten",
          label: "Tighten",
          description: "Cut by ~20–30%; same meaning, less air.",
        },
        {
          value: "loosen",
          label: "Loosen",
          description: "Expand by ~20–30%; same meaning, more breath.",
        },
      ],
    },
  ],
  buildPrompt,
};

registerTransform(tightenLoosenTransform);
