import { Extension } from "@tiptap/core";

import { createRewriteStripPlugin } from "@/components/editor/extensions/RewriteStrip/plugin";
import { LockedOriginal } from "@/components/editor/extensions/RewriteStrip/locked-original";
import { RewriteInput } from "@/components/editor/extensions/RewriteStrip/rewrite-input";

export const RewriteStrip = Extension.create({
  name: "rewriteStrip",

  addExtensions() {
    return [LockedOriginal, RewriteInput];
  },

  addProseMirrorPlugins() {
    return [createRewriteStripPlugin()];
  },
});
