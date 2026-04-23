import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ExportPanel() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button asChild variant="secondary">
        <a href="/api/export">
          <Download className="h-4 w-4" />
          Training export
        </a>
      </Button>
      <span className="text-sm text-text-muted">Last export: never</span>
    </div>
  );
}
