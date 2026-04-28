"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Editor, JSONContent } from "@tiptap/react";

import { setRewriteStripPluginState } from "@/components/editor/extensions/RewriteStrip/commands";
import type { RendererMode, DocumentType, VoiceContext } from "@/types";

type RewriteStatus = "idle" | "drafting" | "committing" | "done" | "cancelled";
type AiStatus = "idle" | "loading" | "ready" | "error";

interface RewriteSession {
  id: string;
  status: RewriteStatus;
  mode: RendererMode;
  originalText: string;
  input: string;
  range: { from: number; to: number };
  blockType: string;
  blockAttrs: Record<string, unknown>;
  openedAt: number;
  autoAdvance: boolean;
  rect: DOMRect | null;
  shake: boolean;
  fullDocumentText: string;
  aiStatus: AiStatus;
  aiError: string | null;
  aiSuggestion: string | null;
  aiProvider: string | null;
}

interface RewriteStripContextValue {
  session: RewriteSession | null;
  lastEventId: string | null;
  aiAvailable: boolean;
  beginFromSelection: () => void;
  commit: (advance?: boolean) => Promise<void>;
  cancel: () => void;
  updateInput: (value: string) => void;
  startFromOriginal: () => void;
  setAutoAdvance: (value: boolean) => void;
  clearLastEventId: () => void;
  requestAiSuggestion: () => Promise<void>;
}

const RewriteStripContext = createContext<RewriteStripContextValue | null>(null);

function getSelectionRect(editor: Editor) {
  const { from, to } = editor.state.selection;
  const start = editor.view.coordsAtPos(from);
  const end = editor.view.coordsAtPos(to);
  const left = Math.min(start.left, end.left);
  const right = Math.max(start.right, end.right);
  const top = Math.min(start.top, end.top);
  const bottom = Math.max(start.bottom, end.bottom);

  return new DOMRect(left, top, Math.max(right - left, 1), Math.max(bottom - top, 1));
}

function contentForReplacement(
  text: string,
  blockType: string,
  blockAttrs: Record<string, unknown>,
): JSONContent[] {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const normalizedBlocks = blocks.length ? blocks : [text.trim()];

  if (normalizedBlocks.length === 1 && blockType === "heading") {
    return [
      {
        type: "heading",
        attrs: blockAttrs,
        content: [{ type: "text", text: normalizedBlocks[0] }],
      },
    ];
  }

  return normalizedBlocks.map((block) => ({
    type: "paragraph",
    content: [{ type: "text", text: block }],
  }));
}

function findInlineStripRange(editor: Editor, rewriteId: string) {
  let from: number | null = null;
  let to: number | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (
      (node.type.name === "lockedOriginal" || node.type.name === "rewriteInput") &&
      node.attrs.rewriteId === rewriteId
    ) {
      from = from === null ? pos : Math.min(from, pos);
      to = to === null ? pos + node.nodeSize : Math.max(to, pos + node.nodeSize);
    }
  });

  return from === null || to === null ? null : { from, to };
}

function findNextParagraphRange(editor: Editor, after: number) {
  let range: { from: number; to: number } | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (range || pos <= after || node.type.name !== "paragraph") {
      return true;
    }

    const from = pos + 1;
    const to = Math.max(from, pos + node.nodeSize - 1);
    range = { from, to };
    return false;
  });

  return range;
}

export function RewriteStripProvider({
  children,
  editor,
  documentId,
  documentType,
  voiceContext,
  rendererMode,
}: {
  children: ReactNode;
  editor: Editor | null;
  documentId: string;
  documentType: DocumentType;
  voiceContext: VoiceContext;
  rendererMode: RendererMode;
}) {
  const [session, setSession] = useState<RewriteSession | null>(null);
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);
  const sessionRef = useRef<RewriteSession | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/ai/status")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { available?: boolean } | null) => {
        if (!cancelled && payload?.available) {
          setAiAvailable(true);
        }
      })
      .catch(() => {
        // Silent: the AI button just stays hidden if status can't be fetched.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const clearSession = useCallback(
    (status: RewriteStatus) => {
      if (editor) {
        editor.setEditable(true);
        setRewriteStripPluginState(editor, status, null);
      }

      sessionRef.current = null;
      setSession(null);
    },
    [editor],
  );

  const replaceInlineWithOriginal = useCallback(
    (current: RewriteSession) => {
      if (!editor) {
        return;
      }

      const range = findInlineStripRange(editor, current.id);

      if (!range) {
        return;
      }

      editor
        .chain()
        .focus()
        .insertContentAt(
          range,
          contentForReplacement(
            current.originalText,
            current.blockType,
            current.blockAttrs,
          ),
        )
        .run();
    },
    [editor],
  );

  const cancel = useCallback(() => {
    const current = sessionRef.current;

    if (!current || !editor) {
      return;
    }

    editor.setEditable(true);

    if (current.mode === "inline_strip") {
      replaceInlineWithOriginal(current);
    }

    clearSession("cancelled");
  }, [clearSession, editor, replaceInlineWithOriginal]);

  const beginFromSelection = useCallback(() => {
    if (!editor) {
      return;
    }

    const { from, to, empty, $from } = editor.state.selection;

    if (empty || from === to) {
      return;
    }

    const current = sessionRef.current;

    if (current) {
      cancel();
    }

    const id = crypto.randomUUID();
    const originalText = editor.state.doc.textBetween(from, to, "\n");
    const fullDocumentText = editor.state.doc.textBetween(
      0,
      editor.state.doc.content.size,
      "\n",
    );
    const blockType = $from.parent.type.name;
    const blockAttrs = { ...$from.parent.attrs };
    const rect = getSelectionRect(editor);
    const nextSession: RewriteSession = {
      id,
      status: "drafting",
      mode: rendererMode,
      originalText,
      input: "",
      range: { from, to },
      blockType,
      blockAttrs,
      openedAt: Date.now(),
      autoAdvance: false,
      rect,
      shake: false,
      fullDocumentText,
      aiStatus: "idle",
      aiError: null,
      aiSuggestion: null,
      aiProvider: null,
    };

    if (rendererMode === "inline_strip") {
      editor
        .chain()
        .focus()
        .insertContentAt({ from, to }, [
          {
            type: "lockedOriginal",
            attrs: { rewriteId: id, text: originalText },
          },
          {
            type: "rewriteInput",
            attrs: { rewriteId: id },
          },
        ])
        .run();
    }

    editor.setEditable(false);
    setRewriteStripPluginState(editor, "drafting", id);
    setSession(nextSession);
  }, [cancel, editor, rendererMode]);

  const updateInput = useCallback((value: string) => {
    setSession((current) => (current ? { ...current, input: value } : current));
  }, []);

  const startFromOriginal = useCallback(() => {
    setSession((current) =>
      current ? { ...current, input: current.originalText } : current,
    );
  }, []);

  const setAutoAdvance = useCallback((value: boolean) => {
    setSession((current) => (current ? { ...current, autoAdvance: value } : current));
  }, []);

  const requestAiSuggestion = useCallback(async () => {
    const current = sessionRef.current;

    if (!current) {
      return;
    }

    setSession((existing) =>
      existing ? { ...existing, aiStatus: "loading", aiError: null } : existing,
    );

    try {
      const response = await fetch("/api/ai/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          beforeText: current.originalText,
          surroundingBefore: current.fullDocumentText.slice(
            Math.max(0, current.range.from - 1500),
            current.range.from,
          ),
          surroundingAfter: current.fullDocumentText.slice(
            current.range.to,
            current.range.to + 1500,
          ),
          documentType,
          voiceContext,
          tier: "heavy",
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        suggestion?: string;
        provider?: string;
        error?: string;
        message?: string;
      } | null;

      if (!response.ok || !payload?.suggestion) {
        const message =
          payload?.message || payload?.error || `Request failed (${response.status}).`;
        setSession((existing) =>
          existing ? { ...existing, aiStatus: "error", aiError: message } : existing,
        );
        return;
      }

      const suggestion = payload.suggestion.trim();
      setSession((existing) =>
        existing
          ? {
              ...existing,
              aiStatus: "ready",
              aiError: null,
              aiSuggestion: suggestion,
              aiProvider: payload.provider ?? null,
              input: suggestion,
            }
          : existing,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network error";
      setSession((existing) =>
        existing ? { ...existing, aiStatus: "error", aiError: message } : existing,
      );
    }
  }, [documentId, documentType, voiceContext]);

  const commit = useCallback(
    async (advance = false) => {
      const current = sessionRef.current;

      if (!current || !editor) {
        return;
      }

      const replacementText = current.input.trim();

      if (!replacementText) {
        setSession((existing) => (existing ? { ...existing, shake: true } : existing));
        window.setTimeout(
          () =>
            setSession((existing) =>
              existing ? { ...existing, shake: false } : existing,
            ),
          180,
        );
        return;
      }

      setSession({ ...current, status: "committing" });
      setRewriteStripPluginState(editor, "committing", current.id);
      editor.setEditable(true);

      const replaceRange =
        current.mode === "inline_strip"
          ? (findInlineStripRange(editor, current.id) ?? current.range)
          : current.range;

      editor
        .chain()
        .focus()
        .insertContentAt(
          replaceRange,
          contentForReplacement(replacementText, current.blockType, current.blockAttrs),
        )
        .run();

      const usedAi = Boolean(current.aiSuggestion);
      const eventType = usedAi
        ? current.aiSuggestion === replacementText
          ? "ai_suggestion_accepted"
          : "ai_suggestion_edited"
        : "rewrite";

      const response = await fetch("/api/style-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          eventType,
          beforeText: current.originalText,
          afterText: replacementText,
          surroundingBefore: current.fullDocumentText.slice(
            Math.max(0, current.range.from - 500),
            current.range.from,
          ),
          surroundingAfter: current.fullDocumentText.slice(
            current.range.to,
            current.range.to + 500,
          ),
          documentType,
          voiceContext,
          aiProvider: current.aiProvider,
          timeSpentMs: Date.now() - current.openedAt,
        }),
      });

      if (response.ok) {
        const payload = (await response.json()) as {
          event?: { id?: string };
        };

        if (payload.event?.id) {
          setLastEventId(payload.event.id);
        }
      }

      clearSession("done");

      if (advance || current.autoAdvance) {
        const next = findNextParagraphRange(editor, replaceRange.from);

        if (next) {
          window.setTimeout(() => {
            editor.commands.setTextSelection(next);
            beginFromSelection();
          }, 0);
        }
      }
    },
    [beginFromSelection, clearSession, documentId, documentType, editor, voiceContext],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!sessionRef.current) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        cancel();
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void commit(event.shiftKey);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cancel, commit]);

  const value = useMemo<RewriteStripContextValue>(
    () => ({
      session,
      lastEventId,
      aiAvailable,
      beginFromSelection,
      commit,
      cancel,
      updateInput,
      startFromOriginal,
      setAutoAdvance,
      clearLastEventId: () => setLastEventId(null),
      requestAiSuggestion,
    }),
    [
      aiAvailable,
      beginFromSelection,
      cancel,
      commit,
      lastEventId,
      requestAiSuggestion,
      session,
      setAutoAdvance,
      startFromOriginal,
      updateInput,
    ],
  );

  return (
    <RewriteStripContext.Provider value={value}>
      {children}
    </RewriteStripContext.Provider>
  );
}

export function useRewriteStrip() {
  const context = useContext(RewriteStripContext);

  if (!context) {
    throw new Error("useRewriteStrip must be used inside RewriteStripProvider");
  }

  return context;
}
