import { ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: ReactNode }) {
  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    if (tg && typeof tg.ready === "function") {
      try {
        tg.ready();
        if (tg.colorScheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
        if (typeof tg.expand === "function") tg.expand();
      } catch {}
    }
  }, []);

  return (
    <div
      className={cn(
        "min-h-screen w-full",
        // Subtle gradient background for Telegram look
        "bg-gradient-to-b from-white to-sky-50/60 dark:from-[#0b1220] dark:to-[#0b1220]",
        "text-[#333] dark:text-zinc-100",
        "antialiased",
      )}
    >
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-[#0b1220]/70 backdrop-blur supports-[backdrop-filter]:backdrop-blur border-b border-slate-200/60 dark:border-white/10">
        <div className="mx-auto max-w-screen-sm px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 shrink-0 rounded-[14px] shadow-[0_4px_12px_rgba(0,0,0,0.05)] bg-gradient-to-br from-sky-400 to-cyan-300 flex items-center justify-center text-xl">🍽️</div>
            <div className="flex-1 text-center">
              <h1 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">Bill Splitter</h1>
              <p className="text-[12px] leading-4 text-slate-500 dark:text-slate-400">Добавьте блюда, чтобы поделить счёт между участниками.</p>
            </div>
            <div className="w-9" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-sm px-3 sm:px-4 py-4 sm:py-8">
        {children}
      </main>

      <footer className="mt-6 border-t border-slate-200/70 dark:border-white/10">
        <div className="mx-auto max-w-screen-sm px-4 py-4">
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">© 2025 Bill Splitter | Telegram WebApp</p>
        </div>
      </footer>
    </div>
  );
}
