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
    <nav className="mt-8 flex flex-wrap items-center gap-6 border-b border-border">
      {TABS.map((tab) => {
        const active = pathname?.startsWith(tab.href);
        return (
          <Link
            className={cn(
              "-mb-px border-b-2 pb-3 pt-1 text-sm transition-colors",
              active
                ? "border-accent text-text"
                : "border-transparent text-text-muted hover:border-border-strong hover:text-text",
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
