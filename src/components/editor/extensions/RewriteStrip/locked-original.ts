import { mergeAttributes, Node } from "@tiptap/core";

export const LockedOriginal = Node.create({
  name: "lockedOriginal",
  group: "block",
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      rewriteId: {
        default: null,
      },
      text: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-locked-original]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-locked-original": "true",
        "data-rewrite-id": HTMLAttributes.rewriteId,
        class: "locked-original-node rewrite-strip-active",
      }),
      HTMLAttributes.text,
    ];
  },
});
