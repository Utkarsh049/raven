"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const DISMISSED_KEY = "raven-pwa-dismissed-at";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const DELAY_MS = 30_000;

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const isInCooldown = () => {
      const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) || 0);
      return Boolean(dismissedAt && Date.now() - dismissedAt < COOLDOWN_MS);
    };

    const onBIP = (e: Event) => {
      e.preventDefault();
      if (isInCooldown()) return;
      setDeferred(e as BIPEvent);
      timer = setTimeout(() => setVisible(true), DELAY_MS);
    };

    window.addEventListener("beforeinstallprompt", onBIP as EventListener);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP as EventListener);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!visible || !deferred) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md rounded-lg border bg-card p-4 shadow-lg sm:left-auto sm:right-4">
      <p className="text-sm font-medium">Install Raven</p>
      <p className="mt-1 text-xs text-muted-foreground">Add to your home screen for offline access.</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
          onClick={async () => {
            await deferred.prompt();
            try {
              await deferred.userChoice;
            } catch {}
            setVisible(false);
            setDeferred(null);
          }}
        >
          Install
        </button>
        <button
          type="button"
          className="rounded-md border px-3 py-1.5 text-sm"
          onClick={() => {
            localStorage.setItem(DISMISSED_KEY, String(Date.now()));
            setVisible(false);
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
