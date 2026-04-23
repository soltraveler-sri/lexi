import type { TipTapDocument, TipTapNode } from "@/types";

function nodeText(node: TipTapNode): string {
  if (node.text) {
    return node.text;
  }

  return node.content?.map(nodeText).join("") ?? "";
}

export function tipTapToText(doc: TipTapDocument): string {
  return doc.content?.map(nodeText).join("\n\n") ?? "";
}

function nodeToMarkdown(node: TipTapNode): string {
  const children = node.content?.map(nodeToMarkdown).join("") ?? node.text ?? "";

  switch (node.type) {
    case "heading": {
      const levelValue = node.attrs?.level;
      const level = typeof levelValue === "number" ? levelValue : 2;
      return `${"#".repeat(Math.min(Math.max(level, 1), 6))} ${children}`;
    }
    case "bulletList":
      return node.content?.map(nodeToMarkdown).join("\n") ?? "";
    case "orderedList":
      return (
        node.content
          ?.map((child, index) => `${index + 1}. ${nodeToMarkdown(child)}`)
          .join("\n") ?? ""
      );
    case "listItem":
      return children.trim();
    case "blockquote":
      return children
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    case "hardBreak":
      return "\n";
    case "paragraph":
      return children;
    default:
      return children;
  }
}

export function tipTapToMarkdown(doc: TipTapDocument): string {
  return doc.content?.map(nodeToMarkdown).join("\n\n").trim() ?? "";
}

export function countWords(text: string) {
  const words = text.trim().match(/\S+/g);
  return words?.length ?? 0;
}
