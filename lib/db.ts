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
