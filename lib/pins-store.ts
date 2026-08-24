"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getPref, setPref } from "./db";

export type PinnedItem = {
  id: string;
  href: string;
  title: string;
  kind: "subject" | "chapter";
  pinnedAt: number;
};

type PinsState = {
  pins: PinnedItem[];
  hydrated: boolean;
  toggle: (item: Omit<PinnedItem, "pinnedAt">) => void;
  isPinned: (id: string) => boolean;
  hydrate: () => Promise<void>;
};

function syncPinsToDexie(pins: PinnedItem[]) {
  setPref("pins", JSON.stringify(pins)).catch(() => {});
}

export const usePinsStore = create<PinsState>()(
  persist(
    (set, get) => ({
      pins: [],
      hydrated: false,
      toggle: (item) => {
        const exists = get().pins.some((p) => p.id === item.id);
        const next = exists ? get().pins.filter((p) => p.id !== item.id) : [...get().pins, { ...item, pinnedAt: Date.now() }];
        set({ pins: next });
        syncPinsToDexie(next);
      },
      isPinned: (id) => get().pins.some((p) => p.id === id),
      hydrate: async () => {
        if (get().hydrated) return;
        try {
          const raw = await getPref("pins");
          if (raw) {
            const parsed = JSON.parse(raw) as PinnedItem[];
            if (Array.isArray(parsed)) set({ pins: parsed, hydrated: true });
            else set({ hydrated: true });
          } else set({ hydrated: true });
        } catch {
          set({ hydrated: true });
        }
      },
    }),
    {
      name: "raven-pins",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ pins: s.pins }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true;
          syncPinsToDexie(state.pins);
        }
      },
    },
  ),
);
