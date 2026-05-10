import { registerTransform } from "@/lib/transforms/registry";
import type {
  Transform,
  TransformPromptInput,
  TransformPromptResult,
} from "@/lib/transforms/types";

const AXIS_INSTRUCTIONS: Record<string, Record<string, string>> = {
  formal_casual: {
    formal:
      "Shift the passage toward a more formal register without going stiff or bureaucratic. Lean on precise diction; trim slang and offhand phrasing.",
    casual:
      "Shift the passage toward a more casual register without going lazy or flippant. Loosen sentence shape; let contractions and natural phrasing in.",
  },
  hedged_direct: {
    hedged:
      "Add appropriate hedges and qualifications. The point is care and intellectual honesty, not weakness — keep claims clear, just acknowledge uncertainty where it lives.",
    direct:
      "Cut hedges and qualifiers. Make claims with conviction. Don't overstate — just remove softening that adds no information.",
  },
  cold_warm: {
    cold:
      "Cool the tone. Strip warmth from phrasing without going clinical or aloof — match a thoughtful, even-keeled register.",
    warm:
      "Warm the tone. Bring more human texture without over-sweetening — small acknowledgements of the reader, gentler transitions, less mechanical phrasing.",
  },
};

function buildPrompt(input: TransformPromptInput): TransformPromptResult {
  const axis = input.parameters.axis ?? "formal_casual";
  const direction = input.parameters.direction ?? "casual";
  const instruction =
    AXIS_INSTRUCTIONS[axis]?.[direction] ??
    "Adjust the passage along the requested tone axis.";

  const lines = [
    `Document type: ${input.documentType.replace("_", " ")}`,
    `Voice context: ${input.voiceContext.replace("_", " ")}`,
  ];

  if (input.surroundingBefore.trim()) {
    lines.push("", "Preceding context:", input.surroundingBefore.trim());
  }
  lines.push("", "Passage to shift:", input.selection.trim());
  if (input.surroundingAfter.trim()) {
    lines.push("", "Following context:", input.surroundingAfter.trim());
  }
  lines.push(
    "",
    "Instructions:",
    instruction,
    "Preserve meaning, content, and the writer's underlying voice. Apply the tone shift in service of the same point — don't change what is being said.",
    "",
    "Return only the revised passage. Do not include quotes, labels, explanations, or commentary.",
  );

  return { prompt: lines.join("\n"), temperature: 0.65 };
}

export const toneShiftTransform: Transform = {
  id: "tone_shift",
  name: "Tone shift",
  description: "Move the passage along a tone axis.",
  requiresSelection: true,
  variantCount: 1,
  parameters: [
    {
      id: "axis",
      label: "Axis",
      default: "formal_casual",
      options: [
        { value: "formal_casual", label: "Formal ↔ Casual" },
        { value: "hedged_direct", label: "Hedged ↔ Direct" },
        { value: "cold_warm", label: "Cold ↔ Warm" },
      ],
    },
    {
      id: "direction",
      label: "Direction",
      default: "casual",
      options: [
        { value: "formal", label: "More formal" },
        { value: "casual", label: "More casual" },
        { value: "hedged", label: "More hedged" },
        { value: "direct", label: "More direct" },
        { value: "cold", label: "Cooler" },
        { value: "warm", label: "Warmer" },
      ],
    },
  ],
  buildPrompt,
};

registerTransform(toneShiftTransform);
