import type { Transform } from "@/lib/transforms/types";

const transforms = new Map<string, Transform>();

export function registerTransform(transform: Transform) {
  transforms.set(transform.id, transform);
}

export function getTransform(id: string) {
  return transforms.get(id) ?? null;
}

export function listTransforms() {
  return Array.from(transforms.values());
}
