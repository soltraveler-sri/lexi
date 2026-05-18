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
  Wand2,
} from "lucide-react";

import {
  InlineComposer,
  type ComposerAgent,
} from "@/components/editor/InlineComposer";
import { Button } from "@/components/ui/button";
import type { AgentListItem } from "@/components/journal/AgentsRoster";
import type { Transform } from "@/lib/transforms/types";
import { cn } from "@/lib/utils";

function ToolButton({
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
    <Button
      aria-label={label}
      className={cn("h-8 w-8 p-0", active && "bg-accent-soft text-text")}
      onClick={onClick}
      size="icon"
      title={label}
      type="button"
      variant="ghost"
    >
      {children}
    </Button>
  );
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
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<ComposerAgent>(null);

  return (
    <TipTapBubbleMenu
      className="flex flex-col gap-1.5"
      editor={editor}
      tippyOptions={{ duration: 100, placement: "top-start" }}
    >
      <div className="flex items-center gap-0.5 rounded-md border border-border bg-surface p-1.5 shadow-md">
        <ToolButton
          active={composerOpen}
          label="Rewrite or message Lexi"
          onClick={() => setComposerOpen((open) => !open)}
        >
          <Wand2 className="h-4 w-4" />
        </ToolButton>
        <span className="mx-2 h-4 w-px bg-border-strong/60" />
        <ToolButton
          active={editor.isActive("bold")}
          label="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("italic")}
          label="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("code")}
          label="Code"
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("link")}
          label="Link"
          onClick={() => {
            const url = window.prompt("URL");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
        >
          <LinkIcon className="h-4 w-4" />
        </ToolButton>
        <span className="mx-2 h-4 w-px bg-border-strong/60" />
        <ToolButton
          active={editor.isActive("heading", { level: 1 })}
          label="Heading 1"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("heading", { level: 2 })}
          label="Heading 2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("heading", { level: 3 })}
          label="Heading 3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("bulletList")}
          label="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("orderedList")}
          label="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("blockquote")}
          label="Highlight block"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolButton>
      </div>
      {composerOpen ? (
        <InlineComposer
          agents={agents}
          onClose={() => setComposerOpen(false)}
          onManualEdit={onManualEdit}
          onRunAgent={onRunAgent}
          onRunTransform={onRunTransform}
          onSelectAgent={setSelectedAgent}
          selectedAgent={selectedAgent}
        />
      ) : null}
    </TipTapBubbleMenu>
  );
}
