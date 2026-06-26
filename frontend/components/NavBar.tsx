"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/lib/theme";
import { cn } from "@/components/ui";

const LINKS = [
  { href: "/", label: "Panel" },
  { href: "/cv", label: "CV" },
  { href: "/jobs", label: "İlanlar" },
  { href: "/board", label: "Kanban" },
  { href: "/versions", label: "Versiyonlar" },
  { href: "/cold-messages", label: "Soğuk Mesaj" },
  { href: "/interviews", label: "Mülakat" },
];

export function NavBar() {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-brand">
          ATS<span className="text-slate-900 dark:text-slate-100">Review</span>
        </Link>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          {user && (
            <button
              className="rounded-lg border border-slate-200 px-2 py-1 text-slate-600 dark:border-slate-700 dark:text-slate-300"
              onClick={() => setOpen(!open)}
              aria-label="Menü"
            >
              ☰
            </button>
          )}
        </div>

        <div className="hidden items-center gap-1 md:flex">
          {user &&
            LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition-colors",
                  pathname === l.href
                    ? "bg-brand-50 font-medium text-brand dark:bg-brand-900/40 dark:text-brand-200"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                )}
              >
                {l.label}
              </Link>
            ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {!loading && !user && (
            <>
              <Link
                href="/login"
                className="text-sm text-slate-600 hover:text-brand dark:text-slate-300"
              >
                Giriş
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-brand px-3 py-1.5 text-sm text-white hover:bg-brand-dark"
              >
                Kayıt Ol
              </Link>
            </>
          )}
          {user && (
            <>
              <Link
                href="/account"
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition-colors",
                  pathname === "/account"
                    ? "bg-brand-50 font-medium text-brand dark:bg-brand-900/40 dark:text-brand-200"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                )}
              >
                ⚙️
              </Link>
              <button
                onClick={() => void signOut()}
                className="text-sm text-slate-500 hover:text-red-600 dark:text-slate-400"
              >
                Çıkış
              </button>
            </>
          )}
        </div>
      </nav>

      {user && open && (
        <div className="border-t border-slate-100 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900 md:hidden">
          {[...LINKS, { href: "/account", label: "Hesap & KVKK" }].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => void signOut()}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            Çıkış
          </button>
        </div>
      )}
    </header>
  );
}
