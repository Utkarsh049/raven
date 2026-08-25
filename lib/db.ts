import Dexie, { type Table } from "dexie";

export type PrefsRow = {
  key: string;
  value: string;
  updatedAt: number;
};

class RavenDB extends Dexie {
  prefs!: Table<PrefsRow, string>;

  constructor() {
    super("raven");
    this.version(1).stores({
      prefs: "key",
    });
  }
}

export const db = new RavenDB();

export async function getPref(key: string): Promise<string | null> {
  const row = await db.prefs.get(key);
  return row?.value ?? null;
}

export async function setPref(key: string, value: string) {
  await db.prefs.put({ key, value, updatedAt: Date.now() });
}

export type BranchCacheItem = { slug: string; title: string };

export async function getBranchesCache(): Promise<BranchCacheItem[]> {
  try {
    const raw = await getPref("cached_branches");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Dexie getBranchesCache error:", err);
    return [];
  }
}

export async function setBranchesCache(branches: BranchCacheItem[]) {
  try {
    await setPref("cached_branches", JSON.stringify(branches));
  } catch (err) {
    console.error("Dexie setBranchesCache error:", err);
  }
}

