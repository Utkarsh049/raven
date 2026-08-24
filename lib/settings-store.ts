"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getPref, setPref } from "./db";

export type Theme = "light" | "dark" | "system";

type SettingsState = {
  branchSlug: string | null;
  theme: Theme;
  hydrated: boolean;
  setBranchSlug: (slug: string | null) => void;
  setTheme: (theme: Theme) => void;
  hydrate: () => Promise<void>;
};

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const resolved = theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
  root.setAttribute("data-theme", resolved);
  root.classList.toggle("dark", resolved === "dark");
}

const STORAGE_KEY = "raven-settings";

function syncToDexie(state: Pick<SettingsState, "branchSlug" | "theme">) {
  setPref("branchSlug", state.branchSlug ?? "").catch(() => {});
  setPref("theme", state.theme).catch(() => {});
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      branchSlug: null,
      theme: "system",
      hydrated: false,
      setBranchSlug: (branchSlug) => {
        set({ branchSlug });
        syncToDexie({ branchSlug, theme: get().theme });
      },
      setTheme: (theme) => {
        set({ theme });
        try {
          applyTheme(theme);
        } catch {}
        syncToDexie({ branchSlug: get().branchSlug, theme });
      },
      hydrate: async () => {
        try {
          const [branchSlug, theme] = await Promise.all([getPref("branchSlug"), getPref("theme")]);
          const hasDexieData = Boolean(branchSlug || theme);
          if (hasDexieData) {
            const next: Partial<SettingsState> = {};
            if (branchSlug) next.branchSlug = branchSlug;
            if (theme && (theme === "light" || theme === "dark" || theme === "system")) next.theme = theme as Theme;
            set(next as SettingsState);
            try {
              applyTheme((next.theme as Theme) ?? get().theme);
            } catch {}
            syncToDexie({ branchSlug: (next.branchSlug as string | null) ?? get().branchSlug, theme: (next.theme as Theme) ?? get().theme });
          } else if (!get().hydrated) {
            try {
              applyTheme(get().theme);
            } catch {}
          }
          set({ hydrated: true });
        } catch {
          set({ hydrated: true });
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ branchSlug: s.branchSlug, theme: s.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          try {
            applyTheme(state.theme);
          } catch {}
        }
      },
    },
  ),
);
