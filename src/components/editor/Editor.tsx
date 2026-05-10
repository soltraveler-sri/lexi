"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Check, PencilLine } from "lucide-react";
import { useRouter } from "next/navigation";

import { BlankDocCTA, shouldShowBlankCta } from "@/components/editor/BlankDocCTA";
import { BubbleMenu } from "@/components/editor/BubbleMenu";
import { DocTransformPanel } from "@/components/editor/DocTransformPanel";
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
import { AdHocResearch } from "@/components/research/AdHocResearch";
import type { Transform } from "@/lib/transforms/types";
import { getTransform } from "@/lib/transforms/registry";
import "@/lib/transforms/inline";
import { useHotkey } from "@/lib/hotkeys/useHotkey";
import { countWords } from "@/lib/style/export";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/editorStore";
import { useUiStore } from "@/stores/uiStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import type {
  DocumentType,
  RendererMode,
  TipTapDocument,
  TipTapNode,
  VoiceContext,
} from "@/types";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface SaveState {
  status: SaveStatus;
  savedAt: number | null;
}

const SESSION_NODE_TYPES = new Set(["lockedOriginal", "rewriteInput"]);

function stripSessionNodes(doc: TipTapDocument): TipTapDocument {
  function visit(nodes: TipTapNode[] | undefined): TipTapNode[] | undefined {
    if (!nodes) return nodes;
    return nodes
      .filter((node) => !SESSION_NODE_TYPES.has(node.type))
      .map((node) => ({
        ...node,
        content: visit(node.content),
      }));
  }
  return { ...doc, content: visit(doc.content) };
}

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

function triggerDownload(url: string) {
  const link = document.createElement("a");
  link.href = url;
  // The server endpoint sets Content-Disposition; the browser uses that filename.
  link.rel = "noopener";
  link.click();
}

function SaveIndicator({ state }: { state: SaveState }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (state.status !== "saved" || !state.savedAt) return;
    const interval = window.setInterval(() => setTick((n) => n + 1), 30000);
    return () => window.clearInterval(interval);
  }, [state.status, state.savedAt]);

  if (state.status === "saving") {
    return <span className="text-text-faint">Saving…</span>;
  }
  if (state.status === "error") {
    return <span className="text-red-600">Save failed</span>;
  }
  if (state.status === "saved" && state.savedAt) {
    const elapsedMs = Date.now() - state.savedAt;
    const label =
      elapsedMs < 5000
        ? "just now"
        : elapsedMs < 60000
          ? `${Math.floor(elapsedMs / 1000)}s ago`
          : `${Math.floor(elapsedMs / 60000)}m ago`;
    return (
      <span className="flex items-center gap-1 text-text-faint">
        <Check className="h-3 w-3" />
        Saved {label}
      </span>
    );
  }
  return null;
}

function EditorSurface({
  document,
  settings,
  editor,
  title,
  onTitleChange,
  saveState,
  onSaveNow,
}: {
  document: EditorDocument;
  settings: EditorSettings;
  editor: NonNullable<ReturnType<typeof useEditor>>;
  title: string;
  onTitleChange: (title: string) => void;
  saveState: SaveState;
  onSaveNow: () => void;
}) {
  const router = useRouter();
  const { selectedText, setSelectedText } = useEditorStore();
  const {
    paletteOpen,
    setPaletteOpen,
    researchOpen,
    setResearchOpen,
    docTransformOpen,
    setDocTransformOpen,
  } = useUiStore();
  const [docTransformTarget, setDocTransformTarget] = useState<
    "draft" | "outline"
  >("draft");
  const [docTransformSource, setDocTransformSource] = useState<
    "blank-cta" | "doc-action"
  >("doc-action");
  const [currentWordCount, setCurrentWordCount] = useState(0);
  const { activeDocumentId, setActiveDocumentId, toggleSidebar } = useWorkspaceStore();
  const { session, lastEventId, beginFromSelection, clearLastEventId } =
    useRewriteStrip();
  const [webSearchAvailable, setWebSearchAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/ai/status")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { webSearch?: { available?: boolean } } | null) => {
        if (!cancelled && payload?.webSearch?.available) {
          setWebSearchAvailable(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setActiveDocumentId(document.id);
    return () => setActiveDocumentId(null);
  }, [document.id, setActiveDocumentId]);

  const updateSelectionState = useCallback(() => {
    const { from, to, empty } = editor.state.selection;

    if (empty || from === to) {
      setSelectedText("");
      return;
    }

    setSelectedText(editor.state.doc.textBetween(from, to, "\n"));
  }, [editor, setSelectedText]);

  useEffect(() => {
    editor.on("selectionUpdate", updateSelectionState);
    return () => {
      editor.off("selectionUpdate", updateSelectionState);
    };
  }, [editor, updateSelectionState]);

  const recomputeWordCount = useCallback(() => {
    const text = editor.state.doc.textBetween(
      0,
      editor.state.doc.content.size,
      "\n",
    );
    setCurrentWordCount(countWords(text));
  }, [editor]);

  useEffect(() => {
    recomputeWordCount();
    editor.on("update", recomputeWordCount);
    return () => {
      editor.off("update", recomputeWordCount);
    };
  }, [editor, recomputeWordCount]);

  const openDocTransform = useCallback(
    (target: "draft" | "outline", source: "blank-cta" | "doc-action") => {
      setDocTransformTarget(target);
      setDocTransformSource(source);
      setDocTransformOpen(true);
    },
    [setDocTransformOpen],
  );

  const runTransform = useCallback(
    (transform: Transform, parameters: Record<string, string>) => {
      beginFromSelection({
        transformId: transform.id,
        transformName: transform.name,
        variantCount: transform.variantCount,
        parameters,
      });
    },
    [beginFromSelection],
  );

  const runRewrite = useCallback(() => {
    const rewrite = getTransform("rewrite");
    if (!rewrite) {
      beginFromSelection();
      return;
    }
    runTransform(rewrite, {});
  }, [beginFromSelection, runTransform]);

  const runInlineTransform = useCallback(
    (transformId: string, parameters?: Record<string, unknown>) => {
      const transform = getTransform(transformId);
      if (!transform) {
        return;
      }
      const stringParams: Record<string, string> = {};
      for (const [key, value] of Object.entries(parameters ?? {})) {
        if (typeof value === "string") {
          stringParams[key] = value;
        }
      }
      runTransform(transform, stringParams);
    },
    [runTransform],
  );

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
    triggerDownload(`/api/documents/${document.id}/download?format=md`);
  }, [document.id]);

  const downloadDocx = useCallback(() => {
    triggerDownload(`/api/documents/${document.id}/download?format=docx`);
  }, [document.id]);

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
  useHotkey("Mod+S", (event) => {
    event.preventDefault();
    onSaveNow();
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
      downloadDocx,
      createDocument,
      renameDocument,
      deleteDocument,
      openAdHocResearch: () => setResearchOpen(true),
      runInlineTransform,
      openDocTransform: () => openDocTransform("draft", "doc-action"),
      webSearchAvailable,
    }),
    [
      activeDocumentId,
      createDocument,
      deleteDocument,
      downloadDocx,
      editor,
      exportMarkdown,
      markAsExemplar,
      renameDocument,
      router,
      runInlineTransform,
      runRewrite,
      openDocTransform,
      selectedText,
      setPaletteOpen,
      setResearchOpen,
      toggleSidebar,
      webSearchAvailable,
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
      <AdHocResearch
        editor={editor}
        onOpenChange={setResearchOpen}
        open={researchOpen}
      />
      <DocTransformPanel
        documentId={document.id}
        documentType={document.type}
        editor={editor}
        initialTarget={docTransformTarget}
        onOpenChange={setDocTransformOpen}
        open={docTransformOpen}
        triggerSource={docTransformSource}
        voiceContext={document.voiceContext}
      />
      <main className="mx-auto max-w-[840px] px-12 pb-24 pt-20">
        <div className="mb-10 max-w-[680px]">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-text-faint">
            <PencilLine className="h-3.5 w-3.5" />
            <span>{document.type.replace("_", " ")}</span>
            <span className="ml-auto flex items-center gap-3 normal-case tracking-normal">
              <button
                className="rounded-sm px-2 py-0.5 text-accent-hover hover:bg-accent-soft"
                onClick={() => openDocTransform("draft", "doc-action")}
                title="Run a doc-level transform"
                type="button"
              >
                ✨ Doc actions
              </button>
              <SaveIndicator state={saveState} />
              <button
                className="rounded-sm px-2 py-0.5 text-text-muted hover:bg-surface-sunken hover:text-text"
                onClick={onSaveNow}
                title="Save now (⌘S)"
                type="button"
              >
                Save
              </button>
            </span>
          </div>
          <input
            className="w-full border-0 bg-transparent font-display text-5xl font-semibold leading-tight text-text outline-none placeholder:text-text-faint"
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Untitled"
            value={title}
          />
        </div>
        {shouldShowBlankCta(currentWordCount) ? (
          <BlankDocCTA
            className="mb-8"
            onOpenWithTarget={(target) => openDocTransform(target, "blank-cta")}
            wordCount={currentWordCount}
          />
        ) : null}
        <section className={cn("lexi-editor", session && "select-none")}>
          {editor ? (
            <BubbleMenu editor={editor} onRunTransform={runTransform} />
          ) : null}
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
  const titleRef = useRef(title);
  const saveTimer = useRef<number | null>(null);
  const titleTimer = useRef<number | null>(null);
  const snapshotTimer = useRef<number | null>(null);
  const lastSnapshot = useRef(JSON.stringify(document.content));
  const dirtyForSnapshot = useRef(false);
  const [saveState, setSaveState] = useState<SaveState>({
    status: "idle",
    savedAt: null,
  });

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  const performSave = useCallback(
    async (payload: Record<string, unknown>) => {
      setSaveState((current) => ({ ...current, status: "saving" }));
      try {
        const response = await fetch(`/api/documents/${document.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error(`Save failed (${response.status})`);
        }
        setSaveState({ status: "saved", savedAt: Date.now() });
      } catch {
        setSaveState((current) => ({ ...current, status: "error" }));
      }
    },
    [document.id],
  );

  const scheduleSave = useCallback(
    (payload: Record<string, unknown>) => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }

      saveTimer.current = window.setTimeout(() => {
        saveTimer.current = null;
        void performSave(payload);
      }, 800);
    },
    [performSave],
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
      const content = stripSessionNodes(currentEditor.getJSON() as TipTapDocument);
      dirtyForSnapshot.current = true;
      scheduleSave({ content });
    },
  });

  const loadedDocId = useRef(document.id);
  const loadedTitle = useRef(document.title);

  useEffect(() => {
    if (loadedDocId.current === document.id) {
      return;
    }
    loadedDocId.current = document.id;
    loadedTitle.current = document.title;
    setTitle(document.title);
    lastSnapshot.current = JSON.stringify(document.content);
    dirtyForSnapshot.current = false;
    editor?.commands.setContent(document.content as JSONContent, false);
  }, [document.content, document.id, document.title, editor]);

  useEffect(() => {
    if (title === loadedTitle.current) {
      return;
    }

    if (titleTimer.current) {
      window.clearTimeout(titleTimer.current);
    }

    titleTimer.current = window.setTimeout(() => {
      titleTimer.current = null;
      loadedTitle.current = title;
      void performSave({ title });
    }, 800);
  }, [performSave, title]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    snapshotTimer.current = window.setInterval(() => {
      if (!dirtyForSnapshot.current) {
        return;
      }

      const content = stripSessionNodes(editor.getJSON() as TipTapDocument);
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

  const flushSave = useCallback(() => {
    if (!editor) return;

    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (titleTimer.current) {
      window.clearTimeout(titleTimer.current);
      titleTimer.current = null;
    }

    const content = stripSessionNodes(editor.getJSON() as TipTapDocument);
    loadedTitle.current = titleRef.current;
    void performSave({ title: titleRef.current, content });
  }, [editor, performSave]);

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
        onSaveNow={flushSave}
        onTitleChange={setTitle}
        saveState={saveState}
        settings={settings}
        title={title}
      />
    </RewriteStripProvider>
  );
}
