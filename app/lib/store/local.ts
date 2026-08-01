import { openDB, type IDBPDatabase } from "idb";
import { migratePlan, type PlanDoc } from "~/lib/plan/schema";

export type StoredPlan = {
  id: string;
  doc: PlanDoc;
  createdAt: string;
  updatedAt: string;
  sourceSlug?: string;
  startedAt?: string; // anchors ramp week
};

export type SessionLog = {
  id: string;
  planId: string;
  dayIndex: number;
  date: string;
  entries: { exerciseId: string; actual: string; pain?: number }[];
  loggedAt?: string; // ISO datetime set at creation; breaks same-date ties in getLogs
};

// One row per protocol per day it was marked done. Keyed by
// `${protocolName}|${date}` so each protocol tracks its own done/streak
// state independently (v1 keyed by date alone, sharing one row across every
// protocol in a plan).
export type ProtocolLog = { key: string; protocolName: string; date: string };

const DB_NAME = "tennisworkout";
const DB_VERSION = 2;

type StoreName = "plans" | "sessionLogs" | "protocolDays";

/**
 * Minimal storage primitives every public function routes through, so the
 * IndexedDB and in-memory implementations share all higher-level logic
 * (sorting, dedup, export/import) instead of duplicating it per backend.
 */
interface Backend {
  get<T>(store: StoreName, key: string): Promise<T | undefined>;
  getAll<T>(store: StoreName): Promise<T[]>;
  getAllByIndex<T>(store: StoreName, indexName: string, key: string): Promise<T[]>;
  put<T>(store: StoreName, value: T): Promise<void>;
  delete(store: StoreName, key: string): Promise<void>;
}

function keyPathFor(store: StoreName): "id" | "key" {
  return store === "protocolDays" ? "key" : "id";
}

/**
 * Memoized cache keyed to the IDBFactory instance. When tests swap
 * globalThis.indexedDB in beforeEach, the factory check automatically
 * invalidates the cache, preserving isolation without test-only hooks.
 */
let cachedDb: { factory: IDBFactory; promise: Promise<IDBPDatabase> } | null = null;

function openDatabase(): Promise<IDBPDatabase> {
  // Reuse cached promise if it was opened against the current factory
  if (cachedDb && cachedDb.factory === globalThis.indexedDB) {
    return cachedDb.promise;
  }

  // Open a fresh database and cache it keyed to the current factory
  const promise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains("plans")) {
        db.createObjectStore("plans", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("sessionLogs")) {
        const store = db.createObjectStore("sessionLogs", { keyPath: "id" });
        store.createIndex("planId", "planId");
      }
      // v1 stored protocolDays keyed by `date` alone — one shared row per
      // day across every protocol. v2 keys by `${protocolName}|${date}` so
      // each protocol gets its own done/streak state, which needs a
      // different keyPath. This is a fresh app with no production users
      // yet, so we just drop and recreate the store on upgrade rather than
      // migrating the old rows — there's nothing worth preserving.
      if (oldVersion < 2 && db.objectStoreNames.contains("protocolDays")) {
        db.deleteObjectStore("protocolDays");
      }
      if (!db.objectStoreNames.contains("protocolDays")) {
        db.createObjectStore("protocolDays", { keyPath: "key" });
      }
    },
  });

  cachedDb = { factory: globalThis.indexedDB, promise };
  return promise;
}

function indexedDbBackend(db: IDBPDatabase): Backend {
  return {
    async get(store, key) {
      return db.get(store, key);
    },
    async getAll(store) {
      return db.getAll(store);
    },
    async getAllByIndex(store, indexName, key) {
      return db.getAllFromIndex(store, indexName, key);
    },
    async put(store, value) {
      await db.put(store, value);
    },
    async delete(store, key) {
      await db.delete(store, key);
    },
  };
}

// In-memory fallback used when IndexedDB is unavailable (e.g. private
// browsing) or fails to open. Lives at module scope so data survives across
// calls for the lifetime of the page, mirroring the persistence semantics
// callers expect from the IndexedDB backend within a session.
const memoryStores: Record<StoreName, Map<string, unknown>> = {
  plans: new Map(),
  sessionLogs: new Map(),
  protocolDays: new Map(),
};

const memoryBackend: Backend = {
  async get<T>(store: StoreName, key: string): Promise<T | undefined> {
    return memoryStores[store].get(key) as T | undefined;
  },
  async getAll<T>(store: StoreName): Promise<T[]> {
    return Array.from(memoryStores[store].values()) as T[];
  },
  async getAllByIndex<T>(store: StoreName, indexName: string, key: string): Promise<T[]> {
    return Array.from(memoryStores[store].values()).filter(
      (value) => (value as Record<string, unknown>)[indexName] === key,
    ) as T[];
  },
  async put<T>(store: StoreName, value: T): Promise<void> {
    const keyPath = keyPathFor(store);
    const key = (value as unknown as Record<string, unknown>)[keyPath] as string;
    memoryStores[store].set(key, value);
  },
  async delete(store: StoreName, key: string): Promise<void> {
    memoryStores[store].delete(key);
  },
};

export function storageAvailable(): boolean {
  return typeof globalThis.indexedDB !== "undefined";
}

async function backend(): Promise<Backend> {
  if (!storageAvailable()) {
    return memoryBackend;
  }
  try {
    const db = await openDatabase();
    return indexedDbBackend(db);
  } catch {
    // Clear the cache on rejection so a later call can retry opening
    cachedDb = null;
    return memoryBackend;
  }
}

export async function savePlan(p: StoredPlan): Promise<void> {
  const b = await backend();
  await b.put<StoredPlan>("plans", p);
}

export async function getPlan(id: string): Promise<StoredPlan | undefined> {
  const b = await backend();
  return b.get<StoredPlan>("plans", id);
}

export async function listPlans(): Promise<StoredPlan[]> {
  const b = await backend();
  const plans = await b.getAll<StoredPlan>("plans");
  return plans.sort((a, z) => z.updatedAt.localeCompare(a.updatedAt));
}

export async function deletePlan(id: string): Promise<void> {
  const b = await backend();
  await b.delete("plans", id);
}

export async function logSession(log: SessionLog): Promise<void> {
  const b = await backend();
  await b.put<SessionLog>("sessionLogs", log);
}

export async function getLogs(planId: string): Promise<SessionLog[]> {
  const b = await backend();
  const logs = await b.getAllByIndex<SessionLog>("sessionLogs", "planId", planId);
  return logs.sort((a, z) => {
    const dateCompare = a.date.localeCompare(z.date);
    if (dateCompare !== 0) return dateCompare;
    // Missing loggedAt (pre-F5 data) sorts first since "" < any ISO string.
    return (a.loggedAt ?? "").localeCompare(z.loggedAt ?? "");
  });
}

export async function logProtocolDone(protocolName: string, date: string): Promise<void> {
  const b = await backend();
  await b.put<ProtocolLog>("protocolDays", { key: `${protocolName}|${date}`, protocolName, date });
}

export async function getProtocolDates(protocolName: string): Promise<string[]> {
  const b = await backend();
  const days = await b.getAll<ProtocolLog>("protocolDays");
  return days
    .filter((d) => d.protocolName === protocolName)
    .map((d) => d.date)
    .sort();
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDayNumber(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / MS_PER_DAY);
}

function fromDayNumber(dayNumber: number): string {
  return new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10);
}

/**
 * Pure: counts consecutive calendar days (UTC) ending at `today` or, if
 * today hasn't been logged yet, ending at `today - 1` (a streak isn't
 * broken until a full day is missed). `dates` may be unsorted or contain
 * duplicates.
 */
export function protocolStreak(dates: string[], today: string): number {
  const daySet = new Set(dates);
  const todayNum = toDayNumber(today);

  let cursor: number;
  if (daySet.has(today)) {
    cursor = todayNum;
  } else if (daySet.has(fromDayNumber(todayNum - 1))) {
    cursor = todayNum - 1;
  } else {
    return 0;
  }

  let count = 0;
  while (daySet.has(fromDayNumber(cursor))) {
    count += 1;
    cursor -= 1;
  }
  return count;
}

type ExportPayload = {
  exportVersion: 2;
  plans: StoredPlan[];
  sessionLogs: SessionLog[];
  protocolDays: ProtocolLog[];
};

// v1 backups stored one date-only row per day, shared across every
// protocol in the plan.
type LegacyProtocolLog = { date: string };
const LEGACY_PROTOCOL_NAME = "Daily Protocol";

type ImportPayload = {
  exportVersion?: number;
  plans?: StoredPlan[];
  sessionLogs?: SessionLog[];
  protocolDays?: (ProtocolLog | LegacyProtocolLog)[];
};

export async function exportAll(): Promise<string> {
  const b = await backend();
  const [plans, sessionLogs, protocolDays] = await Promise.all([
    b.getAll<StoredPlan>("plans"),
    b.getAll<SessionLog>("sessionLogs"),
    b.getAll<ProtocolLog>("protocolDays"),
  ]);
  const payload: ExportPayload = { exportVersion: 2, plans, sessionLogs, protocolDays };
  return JSON.stringify(payload);
}

export async function importAll(json: string): Promise<void> {
  const data = JSON.parse(json) as ImportPayload;
  const plans = data.plans ?? [];
  const sessionLogs = data.sessionLogs ?? [];
  const rawProtocolDays = data.protocolDays ?? [];

  // v1 backups have date-only entries with no protocolName; map them onto a
  // single synthetic "Daily Protocol" bucket so old backups still restore
  // something sensible instead of silently losing the streak data.
  const protocolDays: ProtocolLog[] =
    data.exportVersion === 1
      ? rawProtocolDays.map((d) => {
          const date = (d as LegacyProtocolLog).date;
          return { key: `${LEGACY_PROTOCOL_NAME}|${date}`, protocolName: LEGACY_PROTOCOL_NAME, date };
        })
      : (rawProtocolDays as ProtocolLog[]);

  // Validate every plan up front so a single bad plan aborts the whole
  // import before anything is written.
  const validatedPlans = plans.map((p) => ({ ...p, doc: migratePlan(p.doc) }));

  const b = await backend();
  for (const plan of validatedPlans) {
    await b.put<StoredPlan>("plans", plan);
  }
  for (const log of sessionLogs) {
    await b.put<SessionLog>("sessionLogs", log);
  }
  for (const day of protocolDays) {
    await b.put<ProtocolLog>("protocolDays", day);
  }
}
