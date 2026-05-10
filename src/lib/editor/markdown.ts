// v1 doc-level transform seam: markdown <-> TipTap converters. Doc-level
// transforms produce markdown-ish output that needs to render back into the
// editor; v1.5 doc-level transforms (citation, glossary, critique etc.) will
// reuse these helpers. Keep them small and focused on paragraphs, headings,
// bullet/numbered lists, blockquotes, and inline emphasis. The forward path
// re-exports `tipTapToMarkdown` from `@/lib/style/export` for parity.

import { tipTapToMarkdown as forwardConvert } from "@/lib/style/export";
import type { TipTapDocument, TipTapNode } from "@/types";

export const tipTapToMarkdown = forwardConvert;

const HEADING_PATTERN = /^(#{1,6})\s+(.+)/;
const BULLET_PATTERN = /^[-*+]\s+(.+)/;
const ORDERED_PATTERN = /^\d+\.\s+(.+)/;
const BLOCKQUOTE_PATTERN = /^>\s?(.*)$/;

interface InlineToken {
  type: "text" | "bold" | "italic" | "code";
  value: string;
}

const INLINE_PATTERNS: Array<{ kind: InlineToken["type"]; regex: RegExp }> = [
  { kind: "code", regex: /^`([^`]+)`/ },
  { kind: "bold", regex: /^\*\*([^*]+)\*\*/ },
  { kind: "bold", regex: /^__([^_]+)__/ },
  { kind: "italic", regex: /^\*([^*]+)\*/ },
  { kind: "italic", regex: /^_([^_]+)_/ },
];

function tokenizeInline(input: string): InlineToken[] {
  const out: InlineToken[] = [];
  let buffer = "";
  let i = 0;

  while (i < input.length) {
    let matched = false;
    const slice = input.slice(i);
    for (const { kind, regex } of INLINE_PATTERNS) {
      const localMatch = slice.match(regex);
      if (localMatch) {
        if (buffer) {
          out.push({ type: "text", value: buffer });
          buffer = "";
        }
        out.push({ type: kind, value: localMatch[1] });
        i += localMatch[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      buffer += input[i];
      i += 1;
    }
  }

  if (buffer) {
    out.push({ type: "text", value: buffer });
  }

  return out;
}

function inlineToTipTap(input: string): TipTapNode[] {
  if (!input) {
    return [];
  }
  return tokenizeInline(input).map<TipTapNode>((token) => {
    if (token.type === "text") {
      return { type: "text", text: token.value };
    }
    if (token.type === "bold") {
      return {
        type: "text",
        text: token.value,
        marks: [{ type: "bold" }],
      };
    }
    if (token.type === "italic") {
      return {
        type: "text",
        text: token.value,
        marks: [{ type: "italic" }],
      };
    }
    return {
      type: "text",
      text: token.value,
      marks: [{ type: "code" }],
    };
  });
}

function paragraphFromText(text: string): TipTapNode {
  const content = inlineToTipTap(text.trim());
  if (!content.length) {
    return { type: "paragraph" };
  }
  return { type: "paragraph", content };
}

function listItem(text: string): TipTapNode {
  return {
    type: "listItem",
    content: [paragraphFromText(text)],
  };
}

function flushList(
  buffer: string[],
  type: "bulletList" | "orderedList",
): TipTapNode {
  return {
    type,
    content: buffer.map(listItem),
  };
}

export function markdownToTipTap(input: string): TipTapDocument {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const nodes: TipTapNode[] = [];
  let paragraphBuffer: string[] = [];
  let bulletBuffer: string[] = [];
  let orderedBuffer: string[] = [];
  let blockquoteBuffer: string[] = [];

  function flushParagraph() {
    if (paragraphBuffer.length === 0) {
      return;
    }
    const text = paragraphBuffer.join(" ").trim();
    paragraphBuffer = [];
    if (!text) {
      return;
    }
    nodes.push(paragraphFromText(text));
  }

  function flushBullets() {
    if (!bulletBuffer.length) {
      return;
    }
    nodes.push(flushList(bulletBuffer, "bulletList"));
    bulletBuffer = [];
  }

  function flushOrdered() {
    if (!orderedBuffer.length) {
      return;
    }
    nodes.push(flushList(orderedBuffer, "orderedList"));
    orderedBuffer = [];
  }

  function flushBlockquote() {
    if (!blockquoteBuffer.length) {
      return;
    }
    nodes.push({
      type: "blockquote",
      content: [paragraphFromText(blockquoteBuffer.join(" ").trim())],
    });
    blockquoteBuffer = [];
  }

  function flushAll() {
    flushParagraph();
    flushBullets();
    flushOrdered();
    flushBlockquote();
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      flushAll();
      continue;
    }

    const headingMatch = line.match(HEADING_PATTERN);
    if (headingMatch) {
      flushAll();
      const level = Math.min(Math.max(headingMatch[1].length, 1), 6);
      nodes.push({
        type: "heading",
        attrs: { level },
        content: inlineToTipTap(headingMatch[2].trim()),
      });
      continue;
    }

    const bulletMatch = line.match(BULLET_PATTERN);
    if (bulletMatch) {
      flushParagraph();
      flushOrdered();
      flushBlockquote();
      bulletBuffer.push(bulletMatch[1].trim());
      continue;
    }

    const orderedMatch = line.match(ORDERED_PATTERN);
    if (orderedMatch) {
      flushParagraph();
      flushBullets();
      flushBlockquote();
      orderedBuffer.push(orderedMatch[1].trim());
      continue;
    }

    const blockquoteMatch = line.match(BLOCKQUOTE_PATTERN);
    if (blockquoteMatch) {
      flushParagraph();
      flushBullets();
      flushOrdered();
      blockquoteBuffer.push(blockquoteMatch[1].trim());
      continue;
    }

    flushBullets();
    flushOrdered();
    flushBlockquote();
    paragraphBuffer.push(line.trim());
  }

  flushAll();

  if (!nodes.length) {
    nodes.push({ type: "paragraph" });
  }

  return { type: "doc", content: nodes };
}
