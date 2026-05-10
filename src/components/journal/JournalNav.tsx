"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS: Array<{ href: string; label: string }> = [
  { href: "/journal/style-guide", label: "Style Guide" },
  { href: "/journal/reflections", label: "Reflections" },
  { href: "/journal/notes", label: "Notes" },
  { href: "/journal/context", label: "Context" },
];

export function JournalNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-6 flex flex-wrap gap-1 border-b border-border">
      {TABS.map((tab) => {
        const active = pathname?.startsWith(tab.href);
        return (
          <Link
            className={cn(
              "rounded-t-sm px-3 py-2 text-sm transition",
              active
                ? "border-b-2 border-accent text-text"
                : "text-text-muted hover:bg-surface-sunken hover:text-text",
            )}
            href={tab.href}
            key={tab.href}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
