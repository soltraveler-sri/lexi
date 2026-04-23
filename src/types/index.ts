export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };

export interface TipTapDocument {
  type: "doc";
  content?: TipTapNode[];
}

export interface TipTapNode {
  type: string;
  attrs?: Record<string, JsonValue>;
  content?: TipTapNode[];
  marks?: Array<{
    type: string;
    attrs?: Record<string, JsonValue>;
  }>;
  text?: string;
}

export type DocumentType =
  | "blog_post"
  | "work_doc"
  | "fiction"
  | "communication"
  | "brain_dump"
  | "other";

export type VoiceContext =
  | "blog_post"
  | "work_doc"
  | "fiction"
  | "communication"
  | "universal";

export type StyleEventType =
  | "rewrite"
  | "ai_suggestion_accepted"
  | "ai_suggestion_edited"
  | "ai_suggestion_rejected"
  | "annotation";

export type RendererMode = "inline_strip" | "side_panel" | "overlay_modal";

export type CredentialOwnership = "user" | "app";

export type CallTier = "light" | "heavy";

export const emptyTipTapDocument: TipTapDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
