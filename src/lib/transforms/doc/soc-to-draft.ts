import { registerDocTransform } from "@/lib/transforms/doc/registry";
import type {
  DocTransform,
  DocTransformPromptInput,
  DocTransformPromptResult,
} from "@/lib/transforms/doc/types";

const DRAFT_INSTRUCTIONS = [
  "You are reading a writer's stream of consciousness. Structure may be loose, ideas may repeat, contradictions may exist.",
  "Pull out the through-line. Make decisions where the writer vacillated; resolve repetition; trim digressions that don't earn their place.",
  "Produce a coherent first draft in the writer's voice — paragraph-shaped, with clean transitions. Match cadence and diction to the writer's voice profile (provided as system context).",
  "Don't introduce facts the source didn't imply. Don't add boilerplate framing or scaffolding the writer didn't ask for.",
  "Output only the draft. No preamble, no commentary, no headers explaining the input or your process.",
].join(" ");

const OUTLINE_INSTRUCTIONS = [
  "You are reading a writer's stream of consciousness. Structure may be loose, ideas may repeat, contradictions may exist.",
  "Produce a hierarchical outline in markdown — top-level `##` headings for each major section, then `-` bullets for the supporting points beneath each heading.",
  "Each bullet should be specific enough that the writer could draft a paragraph from it, but short enough that it doesn't duplicate the eventual draft.",
  "Match section ordering to the writer's intended through-line; consolidate repetition. Don't invent material the source didn't imply.",
  "Output only the outline. No preamble, no commentary, no narrative paragraphs.",
].join(" ");

function buildPrompt(
  input: DocTransformPromptInput,
): DocTransformPromptResult {
  const target =
    input.parameters.target === "outline" ? "outline" : "draft";
  const instruction = target === "outline" ? OUTLINE_INSTRUCTIONS : DRAFT_INSTRUCTIONS;

  const lines = [
    `Document type: ${input.documentType.replace("_", " ")}`,
    `Voice context: ${input.voiceContext.replace("_", " ")}`,
    "",
    "Instructions:",
    instruction,
    "",
    "Stream of consciousness source:",
    input.fullDocumentText.trim() ||
      "(blank — produce a generative starting point only if the writer wrote nothing; otherwise refuse politely with a single line)",
  ];

  return {
    prompt: lines.join("\n"),
    temperature: target === "outline" ? 0.3 : 0.55,
    // Doc-level transforms can be long; raise the ceiling.
    maxTokens: 4000,
  };
}

export const socToDraftTransform: DocTransform = {
  id: "doc:soc_to_draft",
  name: "Stream of consciousness → Draft / Outline",
  description:
    "Turn loose, messy thoughts into a structured draft or outline in your voice.",
  requiresContent: false,
  parameters: [
    {
      id: "target",
      label: "Target",
      default: "draft",
      options: [
        {
          value: "draft",
          label: "Draft",
          description: "A coherent first draft, in your voice.",
        },
        {
          value: "outline",
          label: "Outline",
          description: "A hierarchical outline you can write the draft from.",
        },
      ],
    },
  ],
  buildPrompt,
};

registerDocTransform(socToDraftTransform);
