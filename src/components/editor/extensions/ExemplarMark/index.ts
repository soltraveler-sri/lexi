import { Mark, mergeAttributes } from "@tiptap/core";

export interface ExemplarMarkAttrs {
  exemplarId: string | null;
}

export const ExemplarMark = Mark.create({
  name: "exemplarMark",

  addAttributes() {
    return {
      exemplarId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-exemplar-id"),
        renderHTML: (attributes: ExemplarMarkAttrs) => ({
          "data-exemplar-id": attributes.exemplarId,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-exemplar-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "exemplar-mark" }), 0];
  },
});
