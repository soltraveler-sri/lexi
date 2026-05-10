import { registerTransform } from "@/lib/transforms/registry";
import type {
  Transform,
  TransformPromptInput,
  TransformPromptResult,
} from "@/lib/transforms/types";

function variantClause(hint: TransformPromptInput["variantHint"]) {
  if (hint === "tighter") {
    return "\nBias your rewrite toward a tighter, more direct cadence. Cut hedges, trim filler, prefer plain verbs.";
  }
  if (hint === "warmer") {
    return "\nBias your rewrite toward a warmer, more conversational cadence. Keep the meaning steady; let the writing breathe.";
  }
  return "";
}

function buildPrompt(input: TransformPromptInput): TransformPromptResult {
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
    "Rewrite the passage in the writer's voice while preserving meaning and continuity with surrounding context." +
      variantClause(input.variantHint),
    "",
    "Return only the rewritten passage. Do not include quotes, labels, explanations, or commentary.",
  );

  return {
    prompt: lines.join("\n"),
    temperature: input.variantHint === "tighter" ? 0.5 : 0.85,
  };
}

export const rewriteTransform: Transform = {
  id: "rewrite",
  name: "Rewrite",
  description: "Two takes — one tighter, one warmer.",
  hotkey: "Mod+R",
  requiresSelection: true,
  variantCount: 2,
  buildPrompt,
};

registerTransform(rewriteTransform);
