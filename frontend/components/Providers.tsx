"use client";

import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/lib/toast";
import { ThemeProvider } from "@/lib/theme";
import { NavBar } from "./NavBar";
import { KvkkConsentGate } from "./KvkkConsentGate";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <NavBar />
          <main className="mx-auto max-w-6xl px-4 py-6">
            <KvkkConsentGate>{children}</KvkkConsentGate>
          </main>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
