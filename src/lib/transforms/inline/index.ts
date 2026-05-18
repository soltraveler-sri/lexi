// Eagerly register the v1 in-line transforms so the registry is populated
// once anything imports from this barrel.
import "@/lib/transforms/inline/rewrite";
import "@/lib/transforms/inline/tighten-loosen";
import "@/lib/transforms/inline/tone-shift";
import "@/lib/transforms/inline/audience-swap";
import "@/lib/transforms/inline/custom-prompt";

export { rewriteTransform } from "@/lib/transforms/inline/rewrite";
export { tightenLoosenTransform } from "@/lib/transforms/inline/tighten-loosen";
export { toneShiftTransform } from "@/lib/transforms/inline/tone-shift";
export { audienceSwapTransform } from "@/lib/transforms/inline/audience-swap";
export { customPromptTransform } from "@/lib/transforms/inline/custom-prompt";
