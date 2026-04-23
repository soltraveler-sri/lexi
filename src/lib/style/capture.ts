import { create as createStyleEvent } from "@/lib/db/repos/styleEvents";
import type { StyleEventInsert } from "@/lib/db/schema";

export async function captureStyleEvent(values: StyleEventInsert) {
  return createStyleEvent(values);
}

export function getSurrounding(
  fullText: string,
  pivot: number,
  length: number,
  direction: "before" | "after",
) {
  if (direction === "before") {
    return fullText.slice(Math.max(0, pivot - length), pivot);
  }

  return fullText.slice(pivot, pivot + length);
}
