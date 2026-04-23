"use client";

import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { listCommands } from "@/lib/commands/registry";
import type { CommandContext } from "@/lib/commands/types";
import "@/lib/commands/built-in";

function fuzzyMatch(value: string, query: string) {
  const normalized = value.toLowerCase();
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) {
    return true;
  }

  let index = 0;

  for (const char of normalized) {
    if (char === normalizedQuery[index]) {
      index += 1;
    }
  }

  return index === normalizedQuery.length;
}

export function CommandPalette({
  open,
  onOpenChange,
  context,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: CommandContext;
}) {
  const [query, setQuery] = useState("");
  const commands = useMemo(
    () =>
      listCommands().filter(
        (command) =>
          (!command.isAvailable || command.isAvailable(context)) &&
          fuzzyMatch(command.title, query),
      ),
    [context, query],
  );

  const groups = ["document", "edit", "style", "system"] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[30%] max-w-xl p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="sr-only">Command palette</DialogTitle>
          <Input
            autoFocus
            className="border-0 bg-transparent px-0 shadow-none focus:ring-0"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search commands"
            value={query}
          />
        </DialogHeader>
        <div className="max-h-[420px] overflow-y-auto p-2">
          {groups.map((group) => {
            const groupCommands = commands.filter(
              (command) => command.section === group,
            );

            if (!groupCommands.length) {
              return null;
            }

            return (
              <section className="py-1" key={group}>
                <div className="px-2 pb-1 text-xs font-medium uppercase text-text-faint">
                  {group}
                </div>
                {groupCommands.map((command) => (
                  <button
                    className="flex w-full items-center justify-between rounded-sm px-2 py-2 text-left text-sm hover:bg-surface-sunken"
                    key={command.id}
                    onClick={() => {
                      void command.run(context);
                      onOpenChange(false);
                    }}
                    type="button"
                  >
                    <span>{command.title}</span>
                    {command.hotkey ? (
                      <span className="text-xs text-text-faint">{command.hotkey}</span>
                    ) : null}
                  </button>
                ))}
              </section>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
