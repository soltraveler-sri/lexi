"use client";

import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { X } from "lucide-react";

import { useRewriteStrip } from "@/components/editor/extensions/RewriteStrip/controller";

/**
 * React NodeView for the `lockedOriginal` node. Renders the read-only
 * original passage plus an always-visible (low-opacity until hover)
 * cancel pill — the explicit escape hatch from a rewrite session.
 */
export function LockedOriginalView({ node }: NodeViewProps) {
  const { cancel, session } = useRewriteStrip();
  const text = (node.attrs.text as string | undefined) ?? "";
  const rewriteId = node.attrs.rewriteId as string | null;
  // Only enable cancel for the active session — stale lock nodes
  // (rare, but possible) shouldn't accidentally cancel something else.
  const isActive = Boolean(session && session.id === rewriteId);

  return (
    <NodeViewWrapper
      as="div"
      className="locked-original-node rewrite-strip-active"
      data-rewrite-id={rewriteId ?? undefined}
    >
      <button
        aria-label="Cancel rewrite and unlock this block"
        className="locked-original-cancel"
        contentEditable={false}
        onClick={(event) => {
          event.preventDefault();
          if (isActive) cancel();
        }}
        type="button"
      >
        <X className="h-3 w-3" />
        Cancel
      </button>
      {text}
    </NodeViewWrapper>
  );
}
