import type { DocTransform } from "@/lib/transforms/doc/types";

const docTransforms = new Map<string, DocTransform>();

export function registerDocTransform(transform: DocTransform) {
  docTransforms.set(transform.id, transform);
}

export function getDocTransform(id: string) {
  return docTransforms.get(id) ?? null;
}

export function listDocTransforms() {
  return Array.from(docTransforms.values());
}
