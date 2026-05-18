"use client";

import { useState } from "react";
import { BubbleMenu as TipTapBubbleMenu, type Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";

import {
  InlineComposer,
  type ComposerAgent,
} from "@/components/editor/InlineComposer";
import type { AgentListItem } from "@/components/journal/AgentsRoster";
import type { Transform } from "@/lib/transforms/types";
import { cn } from "@/lib/utils";

function FormatButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-surface-sunken hover:text-text",
        active && "bg-accent-soft text-text",
      )}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function FormatDivider() {
  return <span className="mx-1 h-3.5 w-px bg-border-strong/60" />;
}

export function BubbleMenu({
  editor,
  onRunTransform,
  agents,
  onRunAgent,
  onManualEdit,
}: {
  editor: Editor;
  onRunTransform: (transform: Transform, parameters: Record<string, string>) => void;
  agents: AgentListItem[];
  onRunAgent: (agent: AgentListItem) => void;
  onManualEdit: (text: string) => void;
}) {
  const [selectedAgent, setSelectedAgent] = useState<ComposerAgent>(null);

  function collapseSelection() {
    if (!editor) return;
    const { to } = editor.state.selection;
    editor.chain().focus().setTextSelection(to).run();
  }

  return (
    <TipTapBubbleMenu
      className="flex flex-col gap-1.5"
      editor={editor}
      tippyOptions={{ duration: 100, placement: "top-start" }}
    >
      {/*
        Composer is the primary surface — always rendered when the bubble
        menu is shown. The formatting toolbar sits below as a smaller,
        de-emphasized secondary row.
      */}
      <InlineComposer
        agents={agents}
        onClose={collapseSelection}
        onManualEdit={onManualEdit}
        onRunAgent={onRunAgent}
        onRunTransform={onRunTransform}
        onSelectAgent={setSelectedAgent}
        selectedAgent={selectedAgent}
      />
      <div className="flex w-fit items-center gap-0.5 rounded-md border border-border bg-surface px-1.5 py-1 shadow-sm">
        <FormatButton
          active={editor.isActive("bold")}
          label="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" strokeWidth={1.75} />
        </FormatButton>
        <FormatButton
          active={editor.isActive("italic")}
          label="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" strokeWidth={1.75} />
        </FormatButton>
        <FormatButton
          active={editor.isActive("code")}
          label="Code"
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="h-3.5 w-3.5" strokeWidth={1.75} />
        </FormatButton>
        <FormatButton
          active={editor.isActive("link")}
          label="Link"
          onClick={() => {
            const url = window.prompt("URL");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
        >
          <LinkIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
        </FormatButton>
        <FormatDivider />
        <FormatButton
          active={editor.isActive("heading", { level: 1 })}
          label="Heading 1"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-3.5 w-3.5" strokeWidth={1.75} />
        </FormatButton>
        <FormatButton
          active={editor.isActive("heading", { level: 2 })}
          label="Heading 2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-3.5 w-3.5" strokeWidth={1.75} />
        </FormatButton>
        <FormatButton
          active={editor.isActive("heading", { level: 3 })}
          label="Heading 3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-3.5 w-3.5" strokeWidth={1.75} />
        </FormatButton>
        <FormatButton
          active={editor.isActive("bulletList")}
          label="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" strokeWidth={1.75} />
        </FormatButton>
        <FormatButton
          active={editor.isActive("orderedList")}
          label="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-3.5 w-3.5" strokeWidth={1.75} />
        </FormatButton>
        <FormatButton
          active={editor.isActive("blockquote")}
          label="Highlight block"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-3.5 w-3.5" strokeWidth={1.75} />
        </FormatButton>
      </div>
    </TipTapBubbleMenu>
  );
}
