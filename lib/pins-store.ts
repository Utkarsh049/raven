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
  pinnedIds: string[];
  hydrated: boolean;
  toggle: (item: Omit<PinnedItem, "pinnedAt">) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
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
      pinnedIds: [],
      hydrated: false,
      toggle: (item) => {
        const exists = get().pins.some((p) => p.id === item.id);
        const next = exists ? get().pins.filter((p) => p.id !== item.id) : [...get().pins, { ...item, pinnedAt: Date.now() }];
        set({ pins: next, pinnedIds: next.map((p) => p.id) });
        syncPinsToDexie(next);
      },
      reorder: (fromIndex, toIndex) => {
        const next = [...get().pins];
        const [moved] = next.splice(fromIndex, 1);
        if (!moved) return;
        next.splice(toIndex, 0, moved);
        set({ pins: next, pinnedIds: next.map((p) => p.id) });
        syncPinsToDexie(next);
      },
      isPinned: (id) => get().pins.some((p) => p.id === id),
      hydrate: async () => {
        if (get().hydrated) return;
        try {
          const raw = await getPref("pins");
          if (raw) {
            const parsed = JSON.parse(raw) as PinnedItem[];
            if (Array.isArray(parsed)) set({ pins: parsed, pinnedIds: parsed.map((p) => p.id), hydrated: true });
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
      partialize: (s) => ({ pins: s.pins, pinnedIds: s.pinnedIds }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true;
          if (!state.pinnedIds?.length && state.pins.length) state.pinnedIds = state.pins.map((p) => p.id);
          syncPinsToDexie(state.pins);
        }
      },
    },
  ),
);
