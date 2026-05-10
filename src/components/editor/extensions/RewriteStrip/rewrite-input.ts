import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { InlineStripNodeView } from "@/components/editor/extensions/RewriteStrip/renderers/InlineStripRenderer";

export const RewriteInput = Node.create({
  name: "rewriteInput",
  group: "block",
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      rewriteId: {
        default: null,
      },
      variantKey: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-rewrite-input]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      {
        ...HTMLAttributes,
        "data-rewrite-input": "true",
        "data-rewrite-id": HTMLAttributes.rewriteId,
        "data-variant-key": HTMLAttributes.variantKey,
        class: "rewrite-input-node rewrite-strip-active",
      },
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineStripNodeView);
  },
});
