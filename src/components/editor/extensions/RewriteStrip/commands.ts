import type { Editor } from "@tiptap/react";

import {
  rewriteStripPluginKey,
  type RewriteStripStatus,
} from "@/components/editor/extensions/RewriteStrip/plugin";

export function setRewriteStripPluginState(
  editor: Editor,
  status: RewriteStripStatus,
  activeId: string | null,
) {
  editor.view.dispatch(
    editor.state.tr.setMeta(rewriteStripPluginKey, { status, activeId }),
  );
}
