import type { TipTapDocument } from "@/types";
import type { DocumentType, VoiceContext } from "@/types";
import type { TransformParameter } from "@/lib/transforms/types";

export interface DocTransformContext {
  userId: string;
  documentId: string;
  fullDocumentText: string;
  fullDocumentJson: TipTapDocument;
  documentType: DocumentType;
  voiceContext: VoiceContext;
  parameters: Record<string, string>;
  /** Word count of the source — used by the cost-confirm UX. */
  wordCount: number;
}

export interface DocTransformPromptInput {
  fullDocumentText: string;
  documentType: DocumentType;
  voiceContext: VoiceContext;
  parameters: Record<string, string>;
}

export interface DocTransformPromptResult {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface DocTransform {
  /** Stable id, prefixed with "doc:" so it routes through the doc-level path. */
  id: string;
  /** Display name. */
  name: string;
  description: string;
  parameters?: TransformParameter[];
  /** Some transforms (citation, glossary) need content; SoC → Draft does not. */
  requiresContent: boolean;
  buildPrompt: (input: DocTransformPromptInput) => DocTransformPromptResult;
}
