import { registerCommand } from "@/lib/commands/registry";
import type { Command } from "@/lib/commands/types";
import "@/lib/transforms/rewrite";

const builtInCommands: Command[] = [
  {
    id: "document.new",
    title: "New document",
    hotkey: "Mod+N",
    section: "document",
    run: (ctx) => ctx.createDocument(),
  },
  {
    id: "document.rename",
    title: "Rename document",
    section: "document",
    run: (ctx) => ctx.renameDocument(),
    isAvailable: (ctx) => Boolean(ctx.activeDocumentId),
  },
  {
    id: "document.delete",
    title: "Delete document",
    section: "document",
    run: (ctx) => ctx.deleteDocument(),
    isAvailable: (ctx) => Boolean(ctx.activeDocumentId),
  },
  {
    id: "document.export-markdown",
    title: "Export markdown",
    section: "document",
    run: (ctx) => ctx.exportMarkdown(),
    isAvailable: (ctx) => Boolean(ctx.activeDocumentId),
  },
  {
    id: "edit.rewrite-selection",
    title: "Rewrite selection",
    hotkey: "Mod+R",
    section: "edit",
    run: (ctx) => ctx.runRewrite(),
    isAvailable: (ctx) => ctx.selectedText.length > 0,
  },
  {
    id: "edit.mark-as-exemplar",
    title: "Mark as exemplar",
    hotkey: "Mod+E",
    section: "edit",
    run: (ctx) => ctx.markAsExemplar(),
    isAvailable: (ctx) => ctx.selectedText.length > 0,
  },
  {
    id: "style.open-profile",
    title: "Open Style Profile",
    section: "style",
    run: (ctx) => ctx.router.push("/style"),
  },
  {
    id: "system.open-settings",
    title: "Open settings",
    hotkey: "Mod+,",
    section: "system",
    run: (ctx) => ctx.router.push("/settings"),
  },
  {
    id: "system.toggle-sidebar",
    title: "Toggle sidebar",
    hotkey: "Mod+\\",
    section: "system",
    run: (ctx) => ctx.toggleSidebar(),
  },
  {
    id: "system.open-palette",
    title: "Open command palette",
    hotkey: "Mod+K",
    section: "system",
    run: (ctx) => ctx.openPalette(),
  },
];

builtInCommands.forEach(registerCommand);

export { builtInCommands };
