import type { Editor } from "@tiptap/react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export interface CommandContext {
  editor: Editor | null;
  router: AppRouterInstance;
  activeDocumentId: string | null;
  selectedText: string;
  openPalette: () => void;
  toggleSidebar: () => void;
  runRewrite: () => void;
  markAsExemplar: () => void;
  exportMarkdown: () => void;
  downloadDocx: () => void;
  createDocument: () => void;
  renameDocument: () => void;
  deleteDocument: () => void;
  openAdHocResearch: () => void;
  openDocTransform?: (id?: string) => void;
  runInlineTransform?: (transformId: string, params?: Record<string, unknown>) => void;
  openAgent?: (id: string, scope: "selection" | "document") => void;
  webSearchAvailable?: boolean;
}

export interface Command {
  id: string;
  title: string;
  hotkey?: string;
  section: "document" | "edit" | "style" | "system";
  run: (ctx: CommandContext) => Promise<void> | void;
  isAvailable?: (ctx: CommandContext) => boolean;
}
