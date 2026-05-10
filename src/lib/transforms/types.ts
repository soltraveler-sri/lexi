import type { StyleEventInsert } from "@/lib/db/schema";
import type { DocumentType, VoiceContext } from "@/types";

export interface TransformContext {
  documentId: string;
  userId: string;
  selection: {
    from: number;
    to: number;
    text: string;
    blockType: string;
  } | null;
  fullDocumentText: string;
  documentType: DocumentType;
  voiceContext: VoiceContext;
}

export interface TransformResult {
  replacementText: string;
  replaceRange: { from: number; to: number };
  styleEventSeed?: Partial<StyleEventInsert>;
}

export interface TransformParameterOption {
  value: string;
  label: string;
  description?: string;
}

export interface TransformParameter {
  id: string;
  label: string;
  description?: string;
  options: TransformParameterOption[];
  default?: string;
}

export interface Transform {
  id: string;
  name: string;
  description: string;
  hotkey?: string;
  requiresSelection: boolean;
  /**
   * Number of variants to stream in parallel. Two for transforms where two
   * takes meaningfully diverge (rewrite, tighten/loosen); one when an
   * explicit parameter already disambiguates (tone shift, audience swap).
   */
  variantCount: 1 | 2;
  parameters?: TransformParameter[];
  allowedDocumentTypes?: DocumentType[];
  buildPrompt: (input: TransformPromptInput) => TransformPromptResult;
}

export interface TransformPromptInput {
  selection: string;
  surroundingBefore: string;
  surroundingAfter: string;
  documentType: DocumentType;
  voiceContext: VoiceContext;
  parameters: Record<string, string>;
  variantHint?: "tighter" | "warmer" | "neutral";
}

export interface TransformPromptResult {
  prompt: string;
  /** Optional override of the per-variant temperature spread. */
  temperature?: number;
  /** Optional override of `maxTokens`. */
  maxTokens?: number;
}
