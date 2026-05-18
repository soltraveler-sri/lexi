"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  CornerDownLeft,
  PencilLine,
  Sparkles,
  UserRoundCog,
} from "lucide-react";
import Link from "next/link";

import type { AgentListItem } from "@/components/journal/AgentsRoster";
import {
  audienceSwapTransform,
  customPromptTransform,
  rewriteTransform,
  tightenLoosenTransform,
  toneShiftTransform,
} from "@/lib/transforms/inline";
import type { Transform } from "@/lib/transforms/types";
import { cn } from "@/lib/utils";

type Mode = "edit" | "message";

const QUICK_TRANSFORMS: Transform[] = [
  rewriteTransform,
  tightenLoosenTransform,
  toneShiftTransform,
  audienceSwapTransform,
];

export type ComposerAgent = {
  id: string;
  name: string;
  outputKind: AgentListItem["outputKind"];
} | null; // null = default Lexi model

export function InlineComposer({
  agents,
  selectedAgent,
  onSelectAgent,
  onRunTransform,
  onRunAgent,
  onManualEdit,
  onClose,
}: {
  agents: AgentListItem[];
  selectedAgent: ComposerAgent;
  onSelectAgent: (agent: ComposerAgent) => void;
  onRunTransform: (transform: Transform, parameters: Record<string, string>) => void;
  onRunAgent: (agent: AgentListItem) => void;
  onManualEdit: (text: string) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>("message");
  const [text, setText] = useState("");
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function submit() {
    const trimmed = text.trim();

    if (mode === "edit") {
      if (!trimmed) return;
      onManualEdit(trimmed);
      onClose();
      return;
    }

    // Message mode: route to selected agent or to the default model
    if (selectedAgent) {
      onRunAgent({
        id: selectedAgent.id,
        name: selectedAgent.name,
        outputKind: selectedAgent.outputKind,
      } as AgentListItem);
      onClose();
      return;
    }

    if (!trimmed) {
      // Default model needs a directive — fall back to plain Rewrite.
      onRunTransform(rewriteTransform, {});
      onClose();
      return;
    }

    onRunTransform(customPromptTransform, { directive: trimmed });
    onClose();
  }

  function runQuick(transform: Transform) {
    // Quick chips are AI prompts; clicking pulls us into Message mode and runs.
    if (mode === "edit") setMode("message");
    onRunTransform(transform, {});
    onClose();
  }

  function handleKey(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
      return;
    }
    if (event.key === "Tab" && !event.shiftKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      setMode((current) => (current === "edit" ? "message" : "edit"));
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  const placeholder =
    mode === "edit"
      ? "Write the replacement — your version goes straight into the doc."
      : selectedAgent
        ? `Run ${selectedAgent.name} on the selection. (Optional: type extra context.)`
        : "Tell Lexi what to do with the selection.";

  const submitLabel =
    mode === "edit" ? "Replace" : selectedAgent ? `Run ${selectedAgent.name}` : "Send";

  const submitDisabled = mode === "edit" ? text.trim().length === 0 : false;

  // In Message mode, the user is talking to Lexi — submit button gets the
  // Lexi mark (accent-2 / plum). In Edit mode, the user is writing
  // directly — submit gets the user mark (accent / forest).
  const submitClass =
    mode === "edit"
      ? "bg-accent text-accent-contrast hover:bg-accent-hover"
      : "bg-accent-2 text-accent-contrast hover:bg-accent-2-hover";

  return (
    <div className="rewrite-strip-active flex w-[480px] max-w-[80vw] flex-col gap-2.5 rounded-md border border-border bg-surface p-2.5 font-ui shadow-md">
      <header className="flex items-center justify-between gap-3">
        <ModeToggle mode={mode} onChange={setMode} />
        <AgentPill
          agents={agents}
          dimmed={mode === "edit"}
          onSelect={(agent) => {
            onSelectAgent(agent);
            setAgentMenuOpen(false);
          }}
          onToggleOpen={() => setAgentMenuOpen((value) => !value)}
          open={agentMenuOpen}
          selected={selectedAgent}
        />
      </header>

      <div className="relative">
        <textarea
          className="block w-full resize-none rounded-sm border border-transparent bg-bg px-3 py-2.5 pr-10 text-[13.5px] leading-relaxed text-text outline-none transition-colors placeholder:text-text-faint focus:border-border-strong"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          ref={textareaRef}
          rows={2}
          value={text}
        />
        <button
          aria-label={submitLabel}
          className={cn(
            "absolute bottom-2 right-2 inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
            submitClass,
          )}
          disabled={submitDisabled}
          onClick={submit}
          title={`${submitLabel} (Enter)`}
          type="button"
        >
          <CornerDownLeft className="h-3 w-3" />
          <span className="hidden sm:inline">{submitLabel}</span>
        </button>
      </div>

      <footer
        className={cn(
          "flex flex-wrap items-center gap-1.5 border-t border-border pt-2 transition-opacity",
          mode === "edit" && "opacity-55 hover:opacity-100",
        )}
      >
        <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint">
          Quick
        </span>
        {QUICK_TRANSFORMS.map((transform) => (
          <button
            className="rounded-sm border border-border bg-bg px-2 py-1 text-[11.5px] text-text-muted transition-colors hover:border-accent-2 hover:text-text"
            key={transform.id}
            onClick={() => runQuick(transform)}
            title={transform.description}
            type="button"
          >
            {transform.name}
          </button>
        ))}
      </footer>
    </div>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (mode: Mode) => void;
}) {
  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-sm border border-border bg-bg p-0.5"
      role="tablist"
    >
      <ToggleButton
        active={mode === "edit"}
        activeColor="accent"
        icon={<PencilLine className="h-3 w-3" />}
        label="Edit"
        onClick={() => onChange("edit")}
      />
      <ToggleButton
        active={mode === "message"}
        activeColor="accent-2"
        icon={<Sparkles className="h-3 w-3" />}
        label="Message"
        onClick={() => onChange("message")}
      />
    </div>
  );
}

function ToggleButton({
  active,
  activeColor,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  activeColor: "accent" | "accent-2";
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  const colorClass =
    activeColor === "accent"
      ? "bg-accent text-accent-contrast"
      : "bg-accent-2 text-accent-contrast";

  return (
    <button
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[4px] px-2 py-1 text-[11.5px] font-medium transition-colors",
        active ? colorClass : "text-text-muted hover:bg-surface-sunken",
      )}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function AgentPill({
  agents,
  dimmed,
  onSelect,
  onToggleOpen,
  open,
  selected,
}: {
  agents: AgentListItem[];
  dimmed: boolean;
  onSelect: (agent: ComposerAgent) => void;
  onToggleOpen: () => void;
  open: boolean;
  selected: ComposerAgent;
}) {
  const label = selected ? selected.name : "Lexi";

  return (
    <div className={cn("relative", dimmed && "opacity-65 hover:opacity-100")}>
      <button
        aria-haspopup="listbox"
        className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-bg px-2 py-1 text-[11.5px] text-text-muted transition-colors hover:border-border-strong hover:text-text"
        onClick={onToggleOpen}
        type="button"
      >
        <UserRoundCog className="h-3 w-3 text-accent-2" />
        <span className="max-w-[120px] truncate text-text">{label}</span>
        <ChevronDown className="h-3 w-3 text-text-faint" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-10 mt-1.5 w-[220px] rounded-md border border-border bg-surface p-1 shadow-md">
          <button
            className={cn(
              "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-[12.5px] transition-colors",
              !selected
                ? "bg-accent-2-soft text-text"
                : "text-text-muted hover:bg-surface-sunken hover:text-text",
            )}
            onClick={() => onSelect(null)}
            type="button"
          >
            <span>Lexi</span>
            <span className="text-[10px] uppercase tracking-wide text-text-faint">
              default
            </span>
          </button>
          {agents.length === 0 ? (
            <div className="px-2 py-2 text-[12px] text-text-muted">
              No agents yet.{" "}
              <Link
                className="text-accent-2 hover:underline"
                href="/journal/style-guide"
              >
                Create one
              </Link>
            </div>
          ) : (
            <ul>
              {agents.map((agent) => (
                <li key={agent.id}>
                  <button
                    className={cn(
                      "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-[12.5px] transition-colors",
                      selected?.id === agent.id
                        ? "bg-accent-2-soft text-text"
                        : "text-text-muted hover:bg-surface-sunken hover:text-text",
                    )}
                    onClick={() =>
                      onSelect({
                        id: agent.id,
                        name: agent.name,
                        outputKind: agent.outputKind,
                      })
                    }
                    type="button"
                  >
                    <span className="truncate">{agent.name}</span>
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-text-faint">
                      {agent.outputKind}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
