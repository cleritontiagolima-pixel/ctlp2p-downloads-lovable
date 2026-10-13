// Device-side cache for big lists (thousands of channels/movies) in IndexedDB.
// localStorage is too small (~5 MB) for these lists.
const DB = "ctl-cache", STORE = "kv";

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => {
    const q = fn(db.transaction(STORE, mode).objectStore(STORE));
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
  });
}

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  try { return (await tx("readonly", (s) => s.get(key))) as T | undefined; } catch { return undefined; }
}

export async function cacheSet(key: string, value: unknown): Promise<void> {
  try { await tx("readwrite", (s) => s.put(value, key)); } catch { /* full or unavailable: skip */ }
}

// Stale-while-revalidate: answers from the saved copy at once (instant open,
// works on weak internet) and refreshes the copy in the background for next time.
// Without a saved copy it waits for the network.
export async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const saved = await cacheGet<T>(key);
  if (saved !== undefined) {
    load().then((v) => cacheSet(key, v)).catch(() => {});
    return saved;
  }
  const v = await load();
  void cacheSet(key, v);
  return v;
}
