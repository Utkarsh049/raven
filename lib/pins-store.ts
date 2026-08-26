"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getPref, setPref } from "./db";
import {
  cacheChapterForOffline,
  removeChapterFromOffline,
  syncAllPinsOffline,
} from "./offline-cache";

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
        const next = exists
          ? get().pins.filter((p) => p.id !== item.id)
          : [...get().pins, { ...item, pinnedAt: Date.now() }];
        set({ pins: next, pinnedIds: next.map((p) => p.id) });
        syncPinsToDexie(next);

        // Proactively prime or clear offline cache
        if (exists) {
          removeChapterFromOffline(item.href);
        } else {
          cacheChapterForOffline(item.href);
        }
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
        try {
          const raw = await getPref("pins");
          const state = get();
          const hasLocalPins = state.pins.length > 0;
          let activePins: PinnedItem[] = [];

          if (raw) {
            const parsed = JSON.parse(raw) as PinnedItem[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              activePins = parsed;
              if (!hasLocalPins) set({ pins: parsed, pinnedIds: parsed.map((p) => p.id) });
              else syncPinsToDexie(state.pins);
            } else if (!hasLocalPins) {
              set({ pins: [], pinnedIds: [] });
            }
          } else if (hasLocalPins) {
            activePins = state.pins;
            syncPinsToDexie(state.pins);
          }

          set({ hydrated: true });

          // Background sync all pinned items to ensure offline availability
          if (activePins.length > 0) {
            syncAllPinsOffline(activePins);
          }
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
        if (state && !state.pinnedIds?.length && state.pins.length) state.pinnedIds = state.pins.map((p) => p.id);
      },
    },
  ),
);
