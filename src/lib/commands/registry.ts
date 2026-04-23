import type { Command } from "@/lib/commands/types";

const commands = new Map<string, Command>();

export function registerCommand(command: Command) {
  commands.set(command.id, command);
}

export function listCommands() {
  return Array.from(commands.values());
}

export function getCommand(id: string) {
  return commands.get(id) ?? null;
}
