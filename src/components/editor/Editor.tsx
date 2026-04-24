"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { PencilLine, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { BubbleMenu } from "@/components/editor/BubbleMenu";
import { EditTagToast } from "@/components/editor/EditTagToast";
import { SpotlightOverlay } from "@/components/editor/SpotlightOverlay";
import {
  RewriteStripProvider,
  useRewriteStrip,
} from "@/components/editor/extensions/RewriteStrip/controller";
import { RewriteStrip } from "@/components/editor/extensions/RewriteStrip";
import {
  OverlayModalRenderer,
  SidePanelRenderer,
} from "@/components/editor/extensions/RewriteStrip/renderers";
import { ExemplarMark } from "@/components/editor/extensions/ExemplarMark";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { Button } from "@/components/ui/button";
import { useHotkey } from "@/lib/hotkeys/useHotkey";
import { countWords, tipTapToMarkdown } from "@/lib/style/export";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/editorStore";
import { useUiStore } from "@/stores/uiStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import type { DocumentType, RendererMode, TipTapDocument, VoiceContext } from "@/types";

export interface EditorDocument {
  id: string;
  title: string;
  content: TipTapDocument;
  type: DocumentType;
  voiceContext: VoiceContext;
}

export interface EditorSettings {
  rendererMode: RendererMode;
  spotlightIntensity: number;
  editTagToastEnabled: boolean;
}

function textToTipTap(text: string): TipTapDocument {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    type: "doc",
    content: (paragraphs.length ? paragraphs : [""]).map((paragraph) => ({
      type: "paragraph",
      content: paragraph ? [{ type: "text", text: paragraph }] : undefined,
    })),
  };
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function EditorSurface({
  document,
  settings,
  editor,
  title,
  onTitleChange,
}: {
  document: EditorDocument;
  settings: EditorSettings;
  editor: NonNullable<ReturnType<typeof useEditor>>;
  title: string;
  onTitleChange: (title: string) => void;
}) {
  const router = useRouter();
  const { selectedText, setSelectedText } = useEditorStore();
  const { paletteOpen, setPaletteOpen } = useUiStore();
  const { activeDocumentId, setActiveDocumentId, toggleSidebar } = useWorkspaceStore();
  const { session, lastEventId, beginFromSelection, clearLastEventId } =
    useRewriteStrip();
  const [floatingRect, setFloatingRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    setActiveDocumentId(document.id);
    return () => setActiveDocumentId(null);
  }, [document.id, setActiveDocumentId]);

  const updateSelectionState = useCallback(() => {
    const { from, to, empty } = editor.state.selection;

    if (empty || from === to) {
      setSelectedText("");
      setFloatingRect(null);
      return;
    }

    setSelectedText(editor.state.doc.textBetween(from, to, "\n"));
    const coords = editor.view.coordsAtPos(to);
    setFloatingRect(new DOMRect(coords.right + 8, coords.bottom - 28, 32, 32));
  }, [editor, setSelectedText]);

  useEffect(() => {
    editor.on("selectionUpdate", updateSelectionState);
    return () => {
      editor.off("selectionUpdate", updateSelectionState);
    };
  }, [editor, updateSelectionState]);

  const runRewrite = useCallback(() => {
    beginFromSelection();
  }, [beginFromSelection]);

  const createDocument = useCallback(async () => {
    const response = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled" }),
    });
    const payload = (await response.json()) as {
      document?: { id: string };
    };

    if (payload.document) {
      router.push(`/workspace/${payload.document.id}`);
    }
  }, [router]);

  const renameDocument = useCallback(() => {
    const nextTitle = window.prompt("Document title", title);

    if (nextTitle) {
      onTitleChange(nextTitle);
    }
  }, [onTitleChange, title]);

  const deleteDocument = useCallback(async () => {
    if (!window.confirm("Delete this document?")) {
      return;
    }

    await fetch(`/api/documents/${document.id}`, { method: "DELETE" });
    router.push("/workspace");
    router.refresh();
  }, [document.id, router]);

  const exportMarkdown = useCallback(() => {
    downloadText(
      `${title || "document"}.md`,
      tipTapToMarkdown(editor.getJSON() as TipTapDocument),
    );
  }, [editor, title]);

  const markAsExemplar = useCallback(async () => {
    const { from, to, empty } = editor.state.selection;

    if (empty || from === to) {
      return;
    }

    const textSnapshot = editor.state.doc.textBetween(from, to, "\n");
    const response = await fetch("/api/exemplars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: document.id,
        fromPos: from,
        toPos: to,
        textSnapshot,
      }),
    });
    const payload = (await response.json()) as {
      exemplar?: { id: string };
    };

    if (payload.exemplar) {
      editor
        .chain()
        .focus()
        .setMark("exemplarMark", { exemplarId: payload.exemplar.id })
        .run();
    }
  }, [document.id, editor]);

  useHotkey(
    "Mod+R",
    (event) => {
      event.preventDefault();
      runRewrite();
    },
    Boolean(selectedText) && !session,
  );
  useHotkey("Mod+E", (event) => {
    event.preventDefault();
    void markAsExemplar();
  });
  useHotkey("Mod+K", (event) => {
    event.preventDefault();
    setPaletteOpen(true);
  });
  useHotkey("Mod+N", (event) => {
    event.preventDefault();
    void createDocument();
  });
  useHotkey("Mod+,", (event) => {
    event.preventDefault();
    router.push("/settings");
  });
  useHotkey("Mod+\\", (event) => {
    event.preventDefault();
    toggleSidebar();
  });

  const commandContext = useMemo(
    () => ({
      editor,
      router,
      activeDocumentId,
      selectedText,
      openPalette: () => setPaletteOpen(true),
      toggleSidebar,
      runRewrite,
      markAsExemplar,
      exportMarkdown,
      createDocument,
      renameDocument,
      deleteDocument,
    }),
    [
      activeDocumentId,
      createDocument,
      deleteDocument,
      editor,
      exportMarkdown,
      markAsExemplar,
      renameDocument,
      router,
      runRewrite,
      selectedText,
      setPaletteOpen,
      toggleSidebar,
    ],
  );

  return (
    <div className="relative min-h-screen bg-bg">
      <SpotlightOverlay intensity={settings.spotlightIntensity} />
      <SidePanelRenderer />
      <OverlayModalRenderer />
      <EditTagToast
        enabled={settings.editTagToastEnabled}
        eventId={lastEventId}
        onDismiss={clearLastEventId}
      />
      <CommandPalette
        context={commandContext}
        onOpenChange={setPaletteOpen}
        open={paletteOpen}
      />
      {floatingRect && selectedText && !session ? (
        <Button
          className="fixed z-30 h-8 w-8 rounded-full p-0 shadow-md"
          onClick={runRewrite}
          size="icon"
          style={{ left: floatingRect.left, top: floatingRect.top }}
          title="Rewrite selection"
        >
          <Wand2 className="h-4 w-4" />
        </Button>
      ) : null}
      <main className="mx-auto max-w-[840px] px-12 pb-24 pt-20">
        <div className="mb-10 max-w-[680px]">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-text-faint">
            <PencilLine className="h-3.5 w-3.5" />
            {document.type.replace("_", " ")}
          </div>
          <input
            className="w-full border-0 bg-transparent font-display text-5xl font-semibold leading-tight text-text outline-none placeholder:text-text-faint"
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Untitled"
            value={title}
          />
        </div>
        <section className={cn("lexi-editor", session && "select-none")}>
          {editor ? <BubbleMenu editor={editor} /> : null}
          <EditorContent editor={editor} />
        </section>
      </main>
    </div>
  );
}

export function Editor({
  document,
  settings,
}: {
  document: EditorDocument;
  settings: EditorSettings;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(document.title);
  const saveTimer = useRef<number | null>(null);
  const titleTimer = useRef<number | null>(null);
  const snapshotTimer = useRef<number | null>(null);
  const lastSnapshot = useRef(JSON.stringify(document.content));
  const dirtyForSnapshot = useRef(false);

  const scheduleSave = useCallback(
    (payload: Record<string, unknown>) => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }

      saveTimer.current = window.setTimeout(() => {
        void fetch(`/api/documents/${document.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        router.refresh();
      }, 800);
    },
    [document.id, router],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        autolink: true,
        openOnClick: false,
      }),
      RewriteStrip,
      ExemplarMark,
    ],
    content: document.content as JSONContent,
    editorProps: {
      attributes: {
        class: "prose-none",
      },
      handleDrop(_view, event) {
        const file = event.dataTransfer?.files?.[0];

        if (!file || (!file.name.endsWith(".md") && !file.name.endsWith(".txt"))) {
          return false;
        }

        event.preventDefault();
        void file.text().then(async (text) => {
          const firstLine = text.split(/\r?\n/).find(Boolean) ?? "Imported draft";
          const response = await fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: firstLine.replace(/^#+\s*/, "").slice(0, 120),
              content: textToTipTap(text),
              wordCount: countWords(text),
            }),
          });
          const payload = (await response.json()) as {
            document?: { id: string };
          };

          if (payload.document) {
            router.push(`/workspace/${payload.document.id}`);
          }
        });

        return true;
      },
      handlePaste(view, event) {
        const text = event.clipboardData?.getData("text/plain") ?? "";

        if (
          text.length > 200 &&
          view.state.doc.textContent.trim().length === 0 &&
          window.confirm("Use first line as title?")
        ) {
          const firstLine = text.split(/\r?\n/).find(Boolean);

          if (firstLine) {
            setTitle(firstLine.replace(/^#+\s*/, "").slice(0, 120));
          }
        }

        return false;
      },
    },
    onUpdate({ editor: currentEditor }) {
      const content = currentEditor.getJSON() as TipTapDocument;
      dirtyForSnapshot.current = true;
      scheduleSave({ content });
    },
  });

  useEffect(() => {
    setTitle(document.title);
    editor?.commands.setContent(document.content as JSONContent, false);
  }, [document.content, document.title, editor]);

  useEffect(() => {
    if (titleTimer.current) {
      window.clearTimeout(titleTimer.current);
    }

    titleTimer.current = window.setTimeout(() => {
      void fetch(`/api/documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
    }, 800);
  }, [document.id, title]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    snapshotTimer.current = window.setInterval(() => {
      if (!dirtyForSnapshot.current) {
        return;
      }

      const content = editor.getJSON() as TipTapDocument;
      const serialized = JSON.stringify(content);

      if (serialized === lastSnapshot.current) {
        return;
      }

      dirtyForSnapshot.current = false;
      lastSnapshot.current = serialized;
      void fetch(`/api/documents/${document.id}/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
    }, 120000);

    return () => {
      if (snapshotTimer.current) {
        window.clearInterval(snapshotTimer.current);
      }
    };
  }, [document.id, editor]);

  useEffect(
    () => () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
      if (titleTimer.current) {
        window.clearTimeout(titleTimer.current);
      }
    },
    [],
  );

  if (!editor) {
    return null;
  }

  return (
    <RewriteStripProvider
      documentId={document.id}
      documentType={document.type}
      editor={editor}
      rendererMode={settings.rendererMode}
      voiceContext={document.voiceContext}
    >
      <EditorSurface
        document={document}
        editor={editor}
        onTitleChange={setTitle}
        settings={settings}
        title={title}
      />
    </RewriteStripProvider>
  );
}
