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
import { consumeTextStream } from "@/lib/ai/streaming";
import type { RendererMode, DocumentType, VoiceContext } from "@/types";

type RewriteStatus = "idle" | "drafting" | "committing" | "done" | "cancelled";
type AiStatus = "idle" | "loading" | "streaming" | "ready" | "error";

export type VariantKey = "tighter" | "warmer";

export interface VariantState {
  key: VariantKey;
  text: string;
  edited: boolean;
  status: AiStatus;
  error: string | null;
  finalSuggestion: string | null;
  provider: string | null;
}

export interface InlineTransformConfig {
  transformId: string;
  transformName: string;
  variantCount: 1 | 2;
  parameters: Record<string, string>;
}

interface RewriteSession {
  id: string;
  status: RewriteStatus;
  mode: RendererMode;
  originalText: string;
  range: { from: number; to: number };
  blockType: string;
  blockAttrs: Record<string, unknown>;
  openedAt: number;
  autoAdvance: boolean;
  rect: DOMRect | null;
  shake: boolean;
  fullDocumentText: string;
  variants: Record<VariantKey, VariantState>;
  focused: VariantKey;
  variantNodeIds: Record<VariantKey, string>;
  transform: InlineTransformConfig;
}

interface RewriteStripContextValue {
  session: RewriteSession | null;
  lastEventId: string | null;
  aiAvailable: boolean;
  beginFromSelection: (config?: Partial<InlineTransformConfig>) => void;
  commit: (advance?: boolean) => Promise<void>;
  cancel: () => void;
  updateVariant: (key: VariantKey, value: string) => void;
  startFromOriginal: (key?: VariantKey) => void;
  setAutoAdvance: (value: boolean) => void;
  clearLastEventId: () => void;
  focusVariant: (key: VariantKey) => void;
  retryStreaming: () => void;
}

const RewriteStripContext = createContext<RewriteStripContextValue | null>(null);

const VARIANT_KEYS: VariantKey[] = ["tighter", "warmer"];

function emptyVariant(key: VariantKey): VariantState {
  return {
    key,
    text: "",
    edited: false,
    status: "idle",
    error: null,
    finalSuggestion: null,
    provider: null,
  };
}

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

function findInlineStripRange(
  editor: Editor,
  rewriteId: string,
  variantNodeIds: string[],
) {
  const ids = new Set([rewriteId, ...variantNodeIds]);
  let from: number | null = null;
  let to: number | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (
      (node.type.name === "lockedOriginal" || node.type.name === "rewriteInput") &&
      typeof node.attrs.rewriteId === "string" &&
      ids.has(node.attrs.rewriteId)
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
  const streamControllers = useRef<Record<VariantKey, AbortController | null>>({
    tighter: null,
    warmer: null,
  });

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
        // Silent: AI button stays hidden if status can't be fetched.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const abortAllStreams = useCallback(() => {
    for (const key of VARIANT_KEYS) {
      streamControllers.current[key]?.abort();
      streamControllers.current[key] = null;
    }
  }, []);

  const updateVariantState = useCallback(
    (key: VariantKey, updater: (variant: VariantState) => VariantState) => {
      setSession((current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          variants: { ...current.variants, [key]: updater(current.variants[key]) },
        };
      });
    },
    [],
  );

  const clearSession = useCallback(
    (status: RewriteStatus) => {
      abortAllStreams();
      if (editor) {
        editor.setEditable(true);
        setRewriteStripPluginState(editor, status, null);
      }

      sessionRef.current = null;
      setSession(null);
    },
    [abortAllStreams, editor],
  );

  const replaceInlineWithOriginal = useCallback(
    (current: RewriteSession) => {
      if (!editor) {
        return;
      }

      const range = findInlineStripRange(editor, current.id, [
        current.variantNodeIds.tighter,
        current.variantNodeIds.warmer,
      ]);

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

  const streamVariant = useCallback(
    async (key: VariantKey, current: RewriteSession) => {
      const controller = new AbortController();
      streamControllers.current[key]?.abort();
      streamControllers.current[key] = controller;

      updateVariantState(key, (variant) => ({
        ...variant,
        status: "loading",
        error: null,
        text: "",
        finalSuggestion: null,
        edited: false,
      }));

      try {
        const response = await fetch(
          `/api/ai/transform/${current.transform.transformId}`,
          {
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
              variant: key,
              variantId: key,
              parameters: current.transform.parameters,
            }),
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            message?: string;
            error?: string;
          } | null;
          updateVariantState(key, (variant) => ({
            ...variant,
            status: "error",
            error:
              payload?.message ||
              payload?.error ||
              `Request failed (${response.status}).`,
          }));
          return;
        }

        updateVariantState(key, (variant) => ({ ...variant, status: "streaming" }));

        const result = await consumeTextStream(response, {
          signal: controller.signal,
          onChunk: (cumulative) => {
            updateVariantState(key, (variant) =>
              variant.edited ? variant : { ...variant, text: cumulative },
            );
          },
        });

        const finalText = result.text.trim();
        updateVariantState(key, (variant) => ({
          ...variant,
          status: "ready",
          finalSuggestion: finalText,
          provider: result.meta?.provider ?? variant.provider,
          text: variant.edited ? variant.text : finalText,
        }));
      } catch (error) {
        if ((error as Error)?.name === "AbortError") {
          return;
        }
        const message = error instanceof Error ? error.message : "Network error";
        updateVariantState(key, (variant) => ({
          ...variant,
          status: "error",
          error: message,
        }));
      } finally {
        if (streamControllers.current[key] === controller) {
          streamControllers.current[key] = null;
        }
      }
    },
    [documentId, documentType, voiceContext, updateVariantState],
  );

  const beginFromSelection = useCallback(
    (config?: Partial<InlineTransformConfig>) => {
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
      const tighterId = `${id}:tighter`;
      const warmerId = `${id}:warmer`;
      const originalText = editor.state.doc.textBetween(from, to, "\n");
      const fullDocumentText = editor.state.doc.textBetween(
        0,
        editor.state.doc.content.size,
        "\n",
      );
      const blockType = $from.parent.type.name;
      const blockAttrs = { ...$from.parent.attrs };
      const rect = getSelectionRect(editor);
      const variantStates: Record<VariantKey, VariantState> = {
        tighter: emptyVariant("tighter"),
        warmer: emptyVariant("warmer"),
      };

      const transformConfig: InlineTransformConfig = {
        transformId: config?.transformId ?? "rewrite",
        transformName: config?.transformName ?? "Rewrite",
        variantCount: config?.variantCount ?? 2,
        parameters: config?.parameters ?? {},
      };

      const nextSession: RewriteSession = {
        id,
        status: "drafting",
        mode: rendererMode,
        originalText,
        range: { from, to },
        blockType,
        blockAttrs,
        openedAt: Date.now(),
        autoAdvance: false,
        rect,
        shake: false,
        fullDocumentText,
        variants: variantStates,
        focused: "tighter",
        variantNodeIds: { tighter: tighterId, warmer: warmerId },
        transform: transformConfig,
      };

      if (rendererMode === "inline_strip") {
        const inlineNodes = [
          {
            type: "lockedOriginal" as const,
            attrs: { rewriteId: id, text: originalText },
          },
          {
            type: "rewriteInput" as const,
            attrs: { rewriteId: tighterId, variantKey: "tighter" },
          },
        ];
        if (transformConfig.variantCount === 2) {
          inlineNodes.push({
            type: "rewriteInput" as const,
            attrs: { rewriteId: warmerId, variantKey: "warmer" },
          });
        }
        editor.chain().focus().insertContentAt({ from, to }, inlineNodes).run();
      }

      editor.setEditable(false);
      setRewriteStripPluginState(editor, "drafting", id);
      setSession(nextSession);

      if (aiAvailable) {
        void streamVariant("tighter", nextSession);
        if (transformConfig.variantCount === 2) {
          void streamVariant("warmer", nextSession);
        }
      }
    },
    [aiAvailable, cancel, editor, rendererMode, streamVariant],
  );

  const updateVariant = useCallback(
    (key: VariantKey, value: string) => {
      updateVariantState(key, (variant) => ({
        ...variant,
        text: value,
        edited: true,
      }));
    },
    [updateVariantState],
  );

  const focusVariant = useCallback((key: VariantKey) => {
    setSession((current) => {
      if (!current) {
        return current;
      }
      if (current.transform.variantCount === 1 && key !== "tighter") {
        return current;
      }
      return { ...current, focused: key };
    });
  }, []);

  const startFromOriginal = useCallback(
    (key?: VariantKey) => {
      setSession((current) => {
        if (!current) {
          return current;
        }
        const targets: VariantKey[] = key ? [key] : VARIANT_KEYS;
        const variants = { ...current.variants };
        for (const target of targets) {
          variants[target] = {
            ...variants[target],
            text: current.originalText,
            edited: true,
          };
        }
        return { ...current, variants };
      });
    },
    [],
  );

  const setAutoAdvance = useCallback((value: boolean) => {
    setSession((current) => (current ? { ...current, autoAdvance: value } : current));
  }, []);

  const retryStreaming = useCallback(() => {
    const current = sessionRef.current;
    if (!current || !aiAvailable) {
      return;
    }
    void streamVariant("tighter", current);
    if (current.transform.variantCount === 2) {
      void streamVariant("warmer", current);
    }
  }, [aiAvailable, streamVariant]);

  const recordRejectedVariant = useCallback(
    async (current: RewriteSession, rejectedKey: VariantKey) => {
      const rejected = current.variants[rejectedKey];
      const rejectedText = (rejected.finalSuggestion ?? rejected.text).trim();
      if (!rejected || rejected.status !== "ready" || !rejectedText) {
        return;
      }

      await fetch("/api/style-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          eventType: "ai_suggestion_rejected",
          beforeText: current.originalText,
          afterText: rejectedText,
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
          aiProvider: rejected.provider,
          timeSpentMs: Date.now() - current.openedAt,
          editTags: [`variant:${rejectedKey}`],
        }),
      }).catch(() => {
        // Silently swallow — the rejected event is a nice-to-have signal.
      });
    },
    [documentId, documentType, voiceContext],
  );

  const commit = useCallback(
    async (advance = false) => {
      const current = sessionRef.current;

      if (!current || !editor) {
        return;
      }

      const focused = current.focused;
      const focusedVariant = current.variants[focused];
      const replacementText = focusedVariant.text.trim();

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

      abortAllStreams();
      setSession({ ...current, status: "committing" });
      setRewriteStripPluginState(editor, "committing", current.id);
      editor.setEditable(true);

      const replaceRange =
        current.mode === "inline_strip"
          ? (findInlineStripRange(editor, current.id, [
              current.variantNodeIds.tighter,
              current.variantNodeIds.warmer,
            ]) ?? current.range)
          : current.range;

      editor
        .chain()
        .focus()
        .insertContentAt(
          replaceRange,
          contentForReplacement(replacementText, current.blockType, current.blockAttrs),
        )
        .run();

      const usedAi = focusedVariant.status === "ready" && focusedVariant.finalSuggestion;
      const eventType = usedAi
        ? focusedVariant.finalSuggestion === replacementText
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
          aiProvider: focusedVariant.provider,
          timeSpentMs: Date.now() - current.openedAt,
          editTags: usedAi ? [`variant:${focused}`] : [],
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

      if (current.transform.variantCount === 2) {
        const rejectedKey: VariantKey = focused === "tighter" ? "warmer" : "tighter";
        void recordRejectedVariant(current, rejectedKey);
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
    [
      abortAllStreams,
      beginFromSelection,
      clearSession,
      documentId,
      documentType,
      editor,
      recordRejectedVariant,
      voiceContext,
    ],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!sessionRef.current) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        cancel();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void commit(event.shiftKey);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "1") {
        event.preventDefault();
        focusVariant("tighter");
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "2") {
        event.preventDefault();
        focusVariant("warmer");
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cancel, commit, focusVariant]);

  useEffect(() => {
    return () => {
      abortAllStreams();
    };
  }, [abortAllStreams]);

  const value = useMemo<RewriteStripContextValue>(
    () => ({
      session,
      lastEventId,
      aiAvailable,
      beginFromSelection,
      commit,
      cancel,
      updateVariant,
      startFromOriginal,
      setAutoAdvance,
      clearLastEventId: () => setLastEventId(null),
      focusVariant,
      retryStreaming,
    }),
    [
      aiAvailable,
      beginFromSelection,
      cancel,
      commit,
      focusVariant,
      lastEventId,
      retryStreaming,
      session,
      setAutoAdvance,
      startFromOriginal,
      updateVariant,
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

export const VARIANT_LABELS: Record<VariantKey, string> = {
  tighter: "Tighter",
  warmer: "Warmer",
};

export const VARIANT_HOTKEYS: Record<VariantKey, string> = {
  tighter: "⌘1",
  warmer: "⌘2",
};
