"use client";

import { useState } from "react";
import { KeyRound, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface CredentialListItem {
  id: string;
  provider: string;
  label: string;
  isDefault: boolean;
  ownership: "user" | "app";
}

export function AIProviderList({ credentials }: { credentials: CredentialListItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("Personal key");
  const [isDefault, setIsDefault] = useState(true);

  async function addCredential() {
    await fetch("/api/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, apiKey, label, isDefault }),
    });
    setOpen(false);
    setApiKey("");
    router.refresh();
  }

  async function deleteCredential(id: string) {
    await fetch(`/api/credentials/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {credentials.length ? (
        <div className="space-y-2">
          {credentials.map((credential) => (
            <div
              className="flex items-center justify-between rounded-sm border border-border bg-surface px-3 py-2"
              key={credential.id}
            >
              <div>
                <div className="text-sm font-medium">
                  {credential.provider} · {credential.label}
                </div>
                <div className="text-xs text-text-faint">
                  {credential.isDefault ? "Default" : "Available"} ·{" "}
                  {credential.ownership.toUpperCase()}
                </div>
              </div>
              <Button
                onClick={() => void deleteCredential(credential.id)}
                size="icon"
                variant="ghost"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">No AI provider keys saved.</p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary">
            <KeyRound className="h-4 w-4" />
            Add provider
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add AI provider</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
              </SelectContent>
            </Select>
            <Input
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Label"
              value={label}
            />
            <Input
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="API key"
              type="password"
              value={apiKey}
            />
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <Checkbox
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
              />
              Set as default
            </label>
            <Button onClick={() => void addCredential()} disabled={!apiKey}>
              Save key
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
