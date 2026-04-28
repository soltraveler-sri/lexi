import { PassThrough } from "node:stream";

import archiver from "archiver";

import type { JsonValue, TipTapDocument, TipTapNode } from "@/types";

// Minimal Office Open XML (.docx) writer. Uses the existing `archiver` dep so we
// don't need to add a Word-specific library. Supports the subset Lexi needs:
// paragraphs, headings (1-3), bold/italic/code marks, bullet/numbered lists,
// blockquotes, and links. Anything more exotic falls back to plain paragraphs.

const NUMBERING_NUM_ID_BULLET = 1;
const NUMBERING_NUM_ID_ORDERED = 2;

interface RunMarks {
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  link?: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function attrString(attrs: Record<string, JsonValue> | undefined, key: string) {
  const value = attrs?.[key];
  return typeof value === "string" ? value : null;
}

function attrNumber(attrs: Record<string, JsonValue> | undefined, key: string) {
  const value = attrs?.[key];
  return typeof value === "number" ? value : null;
}

function marksFromNode(marks: TipTapNode["marks"]): RunMarks {
  if (!marks) {
    return {};
  }

  const result: RunMarks = {};

  for (const mark of marks) {
    if (mark.type === "bold") result.bold = true;
    else if (mark.type === "italic") result.italic = true;
    else if (mark.type === "code") result.code = true;
    else if (mark.type === "link") {
      const href = attrString(mark.attrs, "href");
      if (href) {
        result.link = href;
      }
    }
  }

  return result;
}

function runXml(text: string, marks: RunMarks): string {
  if (!text) {
    return "";
  }

  const propsParts: string[] = [];

  if (marks.bold) propsParts.push("<w:b/>");
  if (marks.italic) propsParts.push("<w:i/>");
  if (marks.code) propsParts.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>');

  const props = propsParts.length ? `<w:rPr>${propsParts.join("")}</w:rPr>` : "";
  const safe = escapeXml(text);

  return `<w:r>${props}<w:t xml:space="preserve">${safe}</w:t></w:r>`;
}

function inlineNodeToRuns(node: TipTapNode, inheritedMarks: RunMarks): string {
  if (node.type === "hardBreak") {
    return "<w:r><w:br/></w:r>";
  }

  if (node.type === "text" && typeof node.text === "string") {
    const marks = { ...inheritedMarks, ...marksFromNode(node.marks) };

    // Hyperlinks render as styled text; URLs are surfaced inline below for fidelity.
    if (marks.link) {
      const href = marks.link;
      const labelXml = runXml(node.text, { ...marks, link: undefined });
      const trailingUrl =
        href !== node.text ? runXml(` (${href})`, { ...marks, link: undefined }) : "";
      return labelXml + trailingUrl;
    }

    return runXml(node.text, marks);
  }

  if (node.content) {
    return node.content
      .map((child) => inlineNodeToRuns(child, inheritedMarks))
      .join("");
  }

  return "";
}

function paragraphXml(
  node: TipTapNode,
  options?: { styleId?: string; numId?: number },
) {
  const inline = (node.content ?? [])
    .map((child) => inlineNodeToRuns(child, {}))
    .join("");

  const propsParts: string[] = [];

  if (options?.styleId) {
    propsParts.push(`<w:pStyle w:val="${options.styleId}"/>`);
  }

  if (options?.numId !== undefined) {
    propsParts.push(
      `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${options.numId}"/></w:numPr>`,
    );
  }

  const pPr = propsParts.length ? `<w:pPr>${propsParts.join("")}</w:pPr>` : "";

  return `<w:p>${pPr}${inline}</w:p>`;
}

function blockquoteXml(node: TipTapNode): string {
  return (node.content ?? [])
    .map((child) => paragraphXml(child, { styleId: "Quote" }))
    .join("");
}

function listXml(node: TipTapNode, numId: number): string {
  return (node.content ?? [])
    .flatMap((listItem) => listItem.content ?? [])
    .map((child) => {
      if (child.type === "paragraph") {
        return paragraphXml(child, { numId });
      }

      // Nested blocks in list items render as plain paragraphs to avoid
      // unsupported nested numbering.
      return paragraphXml(child);
    })
    .join("");
}

function nodeToBlockXml(node: TipTapNode): string {
  switch (node.type) {
    case "paragraph":
      return paragraphXml(node);
    case "heading": {
      const level = attrNumber(node.attrs, "level") ?? 2;
      const styleId = `Heading${Math.min(Math.max(level, 1), 6)}`;
      return paragraphXml(node, { styleId });
    }
    case "bulletList":
      return listXml(node, NUMBERING_NUM_ID_BULLET);
    case "orderedList":
      return listXml(node, NUMBERING_NUM_ID_ORDERED);
    case "blockquote":
      return blockquoteXml(node);
    case "horizontalRule":
      return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr></w:pPr></w:p>';
    default: {
      // Fallback: render any inline content as a paragraph.
      if (node.content) {
        return paragraphXml(node);
      }
      return "";
    }
  }
}

function buildDocumentXml(doc: TipTapDocument, title: string): string {
  const blocks = (doc.content ?? []).map(nodeToBlockXml).join("");
  const titleHeader = title
    ? `<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(title)}</w:t></w:r></w:p>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${titleHeader}${blocks}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

const DOCUMENT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>`;

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:spacing w:before="240" w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="48"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:spacing w:before="200" w:after="100"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:spacing w:before="160" w:after="80"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading5"><w:name w:val="heading 5"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:rPr><w:b/><w:sz w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading6"><w:name w:val="heading 6"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:rPr><w:b/><w:i/><w:sz w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="720"/></w:pPr><w:rPr><w:i/></w:rPr></w:style>
</w:styles>`;

const NUMBERING_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
<w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`;

export function buildDocxStream(
  doc: TipTapDocument,
  title: string,
): { stream: PassThrough; promise: Promise<void> } {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = new PassThrough();
  archive.pipe(stream);

  archive.append(CONTENT_TYPES, { name: "[Content_Types].xml" });
  archive.append(ROOT_RELS, { name: "_rels/.rels" });
  archive.append(DOCUMENT_RELS, { name: "word/_rels/document.xml.rels" });
  archive.append(STYLES_XML, { name: "word/styles.xml" });
  archive.append(NUMBERING_XML, { name: "word/numbering.xml" });
  archive.append(buildDocumentXml(doc, title), { name: "word/document.xml" });

  const promise = archive.finalize();
  return { stream, promise };
}
