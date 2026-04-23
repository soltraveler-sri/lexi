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

export interface Transform {
  id: string;
  name: string;
  description: string;
  hotkey?: string;
  requiresSelection: boolean;
  allowedDocumentTypes?: DocumentType[];
  run(ctx: TransformContext): Promise<TransformResult | null>;
}
