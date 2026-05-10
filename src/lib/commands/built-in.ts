import { registerCommand } from "@/lib/commands/registry";
import type { Command } from "@/lib/commands/types";
import "@/lib/transforms/inline";

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
    id: "document.download-markdown",
    title: "Download as Markdown (.md)",
    section: "document",
    run: (ctx) => ctx.exportMarkdown(),
    isAvailable: (ctx) => Boolean(ctx.activeDocumentId),
  },
  {
    id: "document.download-docx",
    title: "Download as Word (.docx)",
    section: "document",
    run: (ctx) => ctx.downloadDocx(),
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
    id: "transform.tighten",
    title: "Tighten selection",
    section: "edit",
    run: (ctx) =>
      ctx.runInlineTransform?.("tighten_loosen", { direction: "tighten" }),
    isAvailable: (ctx) => ctx.selectedText.length > 0,
  },
  {
    id: "transform.loosen",
    title: "Loosen selection",
    section: "edit",
    run: (ctx) =>
      ctx.runInlineTransform?.("tighten_loosen", { direction: "loosen" }),
    isAvailable: (ctx) => ctx.selectedText.length > 0,
  },
  {
    id: "transform.tone-direct",
    title: "Tone shift: more direct",
    section: "edit",
    run: (ctx) =>
      ctx.runInlineTransform?.("tone_shift", {
        axis: "hedged_direct",
        direction: "direct",
      }),
    isAvailable: (ctx) => ctx.selectedText.length > 0,
  },
  {
    id: "transform.tone-warmer",
    title: "Tone shift: warmer",
    section: "edit",
    run: (ctx) =>
      ctx.runInlineTransform?.("tone_shift", {
        axis: "cold_warm",
        direction: "warm",
      }),
    isAvailable: (ctx) => ctx.selectedText.length > 0,
  },
  {
    id: "transform.audience-leader",
    title: "Re-aim at: senior leader",
    section: "edit",
    run: (ctx) =>
      ctx.runInlineTransform?.("audience_swap", { audience: "senior_leader" }),
    isAvailable: (ctx) => ctx.selectedText.length > 0,
  },
  {
    id: "transform.audience-generalist",
    title: "Re-aim at: generalist reader",
    section: "edit",
    run: (ctx) =>
      ctx.runInlineTransform?.("audience_swap", { audience: "generalist_reader" }),
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
    run: (ctx) => ctx.router.push("/journal/style-guide"),
  },
  {
    id: "research.ad-hoc",
    title: "Ad-hoc research (web)",
    section: "edit",
    run: (ctx) => ctx.openAdHocResearch(),
    isAvailable: (ctx) => ctx.webSearchAvailable !== false,
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
