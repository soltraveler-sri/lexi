import { registerTransform } from "@/lib/transforms/registry";
import type {
  Transform,
  TransformPromptInput,
  TransformPromptResult,
} from "@/lib/transforms/types";

/**
 * The user's typed message becomes the rewrite directive. Used by the
 * inline composer when the user is in Message mode with the default
 * Lexi model selected (i.e. not routing to a named agent).
 */
function buildPrompt(input: TransformPromptInput): TransformPromptResult {
  const directive = (input.parameters.directive ?? "").trim();
  const lines = [
    `Document type: ${input.documentType.replace("_", " ")}`,
    `Voice context: ${input.voiceContext.replace("_", " ")}`,
  ];

  if (input.surroundingBefore.trim()) {
    lines.push("", "Preceding context:", input.surroundingBefore.trim());
  }
  lines.push("", "Passage to rewrite:", input.selection.trim());
  if (input.surroundingAfter.trim()) {
    lines.push("", "Following context:", input.surroundingAfter.trim());
  }
  lines.push(
    "",
    "Instructions:",
    directive ||
      "Rewrite the passage in the writer's voice while preserving meaning and continuity with surrounding context.",
    "",
    "Return only the rewritten passage. Do not include quotes, labels, explanations, or commentary.",
  );

  return {
    prompt: lines.join("\n"),
    temperature: 0.7,
  };
}

export const customPromptTransform: Transform = {
  id: "custom_prompt",
  name: "Custom prompt",
  description: "Your own instruction.",
  requiresSelection: true,
  variantCount: 1,
  buildPrompt,
};

registerTransform(customPromptTransform);
