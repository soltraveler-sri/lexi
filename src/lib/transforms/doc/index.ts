// v1 doc-level transforms — registered eagerly so the registry is populated
// once anything imports from this barrel. v1.5 transforms (citation, glossary,
// critique etc.) will register here too.
import "@/lib/transforms/doc/soc-to-draft";

export { socToDraftTransform } from "@/lib/transforms/doc/soc-to-draft";
export { listDocTransforms, getDocTransform } from "@/lib/transforms/doc/registry";
