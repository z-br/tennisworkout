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
};

export type ProtocolLog = { date: string }; // one per day the daily protocol was done

const DB_NAME = "tennisworkout";
const DB_VERSION = 1;

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

function keyPathFor(store: StoreName): "id" | "date" {
  return store === "protocolDays" ? "date" : "id";
}

function openDatabase(): Promise<IDBPDatabase> {
  // Opened fresh on every call rather than cached at module scope: caching a
  // connection (or a rejected open promise) would keep pointing at a stale
  // database after tests swap out globalThis.indexedDB for isolation.
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("plans")) {
        db.createObjectStore("plans", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("sessionLogs")) {
        const store = db.createObjectStore("sessionLogs", { keyPath: "id" });
        store.createIndex("planId", "planId");
      }
      if (!db.objectStoreNames.contains("protocolDays")) {
        db.createObjectStore("protocolDays", { keyPath: "date" });
      }
    },
  });
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
  return logs.sort((a, z) => a.date.localeCompare(z.date));
}

export async function logProtocolDone(date: string): Promise<void> {
  const b = await backend();
  await b.put<ProtocolLog>("protocolDays", { date });
}

export async function getProtocolDates(): Promise<string[]> {
  const b = await backend();
  const days = await b.getAll<ProtocolLog>("protocolDays");
  return days.map((d) => d.date).sort();
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
  exportVersion: 1;
  plans: StoredPlan[];
  sessionLogs: SessionLog[];
  protocolDays: ProtocolLog[];
};

export async function exportAll(): Promise<string> {
  const b = await backend();
  const [plans, sessionLogs, protocolDays] = await Promise.all([
    b.getAll<StoredPlan>("plans"),
    b.getAll<SessionLog>("sessionLogs"),
    b.getAll<ProtocolLog>("protocolDays"),
  ]);
  const payload: ExportPayload = { exportVersion: 1, plans, sessionLogs, protocolDays };
  return JSON.stringify(payload);
}

export async function importAll(json: string): Promise<void> {
  const data = JSON.parse(json) as Partial<ExportPayload>;
  const plans = data.plans ?? [];
  const sessionLogs = data.sessionLogs ?? [];
  const protocolDays = data.protocolDays ?? [];

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
