import { Plugin, PluginKey, type Transaction } from "@tiptap/pm/state";

export type RewriteStripStatus =
  | "idle"
  | "drafting"
  | "committing"
  | "done"
  | "cancelled";

export interface RewriteStripPluginState {
  status: RewriteStripStatus;
  activeId: string | null;
}

export const rewriteStripPluginKey = new PluginKey<RewriteStripPluginState>(
  "rewriteStrip",
);

export function createRewriteStripPlugin() {
  return new Plugin<RewriteStripPluginState>({
    key: rewriteStripPluginKey,
    state: {
      init() {
        return { status: "idle", activeId: null };
      },
      apply(transaction: Transaction, value) {
        const meta = transaction.getMeta(rewriteStripPluginKey) as
          | Partial<RewriteStripPluginState>
          | undefined;

        if (!meta) {
          return value;
        }

        return { ...value, ...meta };
      },
    },
  });
}
