import { registerTransform } from "@/lib/transforms/registry";
import type {
  Transform,
  TransformContext,
  TransformResult,
} from "@/lib/transforms/types";

type RewriteDelegate = (ctx: TransformContext) => Promise<TransformResult | null>;

let rewriteDelegate: RewriteDelegate | null = null;

export function setRewriteDelegate(delegate: RewriteDelegate | null) {
  rewriteDelegate = delegate;
}

export const rewriteTransform: Transform = {
  id: "rewrite",
  name: "Rewrite selection",
  description: "Open the Rewrite Strip for a manual line-level rewrite.",
  hotkey: "Mod+R",
  requiresSelection: true,
  async run(ctx: TransformContext) {
    if (!ctx.selection || !rewriteDelegate) {
      return null;
    }

    return rewriteDelegate(ctx);
  },
};

registerTransform(rewriteTransform);
