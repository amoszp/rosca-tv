import type { Library, AppSettings, ExportData, LibraryItem } from './types'

const LS_LIB = 'rosca_lib'
const LS_SET = 'rosca_settings'
let dbp: Promise<IDBDatabase> | null = null

function getDB(): Promise<IDBDatabase> {
  if (dbp) return dbp
  dbp = new Promise((res, rej) => {
    const req = indexedDB.open('rosca-db', 3)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('library')) db.createObjectStore('library', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings')
    }
    req.onsuccess = () => res(req.result)
    req.onerror   = () => rej(req.error)
  })
  return dbp
}

async function idbGet<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await getDB()
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key)
    req.onsuccess = () => res(req.result as T)
    req.onerror   = () => rej(req.error)
  })
}
async function idbPut(store: string, value: unknown, key?: IDBValidKey): Promise<void> {
  const db = await getDB()
  return new Promise((res, rej) => {
    const req = key !== undefined
      ? db.transaction(store, 'readwrite').objectStore(store).put(value, key)
      : db.transaction(store, 'readwrite').objectStore(store).put(value)
    req.onsuccess = () => res()
    req.onerror   = () => rej(req.error)
  })
}
async function idbDelete(store: string, key: IDBValidKey): Promise<void> {
  const db = await getDB()
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).delete(key)
    req.onsuccess = () => res()
    req.onerror   = () => rej(req.error)
  })
}
async function idbGetAll<T>(store: string): Promise<T[]> {
  const db = await getDB()
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll()
    req.onsuccess = () => res(req.result as T[])
    req.onerror   = () => rej(req.error)
  })
}

export async function loadLibrary(): Promise<Library> {
  try {
    const items = await idbGetAll<LibraryItem>('library')
    const lib: Library = {}
    for (const item of items) if (item && typeof item.id === 'number') lib[item.id] = item
    try {
      const lsLib: Library = JSON.parse(localStorage.getItem(LS_LIB) || '{}')
      for (const [k, v] of Object.entries(lsLib)) {
        const id = Number(k)
        if (!lib[id] && v) lib[id] = v as LibraryItem
      }
    } catch { /* ignore */ }
    return lib
  } catch {
    try { return JSON.parse(localStorage.getItem(LS_LIB) || '{}') } catch { return {} }
  }
}

export async function saveItem(item: LibraryItem): Promise<void> {
  if (!item || typeof item.id !== 'number' || !item.title || !item.type) return
  const clean: LibraryItem = { ...item, id: item.id, mediaType: item.mediaType || 'movie',
    type: item.type, title: item.title, year: item.year || '', poster: item.poster ?? null,
    tmdbRating: item.tmdbRating || '—', status: item.status ?? null,
    seasonData: item.seasonData ?? {}, notes: item.notes ?? '',
    addedAt: item.addedAt || Date.now(), updatedAt: item.updatedAt || Date.now() }
  try { await idbPut('library', clean) } catch { /* ignore */ }
  try {
    const lib: Library = JSON.parse(localStorage.getItem(LS_LIB) || '{}')
    lib[clean.id] = clean
    localStorage.setItem(LS_LIB, JSON.stringify(lib))
  } catch { /* ignore */ }
}

export async function deleteItem(id: number): Promise<void> {
  try { await idbDelete('library', id) } catch { /* ignore */ }
  try {
    const lib: Library = JSON.parse(localStorage.getItem(LS_LIB) || '{}')
    delete lib[id]; localStorage.setItem(LS_LIB, JSON.stringify(lib))
  } catch { /* ignore */ }
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const s = await idbGet<AppSettings>('settings', 'cfg')
    return s ?? { region: 'ES', sortKey: 'status' }
  } catch {
    try { return JSON.parse(localStorage.getItem(LS_SET) || '{"region":"ES","sortKey":"status"}') }
    catch { return { region: 'ES', sortKey: 'status' } }
  }
}
export async function saveSettings(s: AppSettings): Promise<void> {
  try { await idbPut('settings', s, 'cfg') } catch { /* ignore */ }
  localStorage.setItem(LS_SET, JSON.stringify(s))
}
export async function exportLibrary(): Promise<ExportData> {
  const library = await loadLibrary()
  return { version: 3, exportedAt: new Date().toISOString(), library }
}
export async function importLibrary(data: ExportData): Promise<number> {
  const lib = data.library ?? {}
  let count = 0
  for (const item of Object.values(lib))
    if (item && typeof (item as LibraryItem).id === 'number') { await saveItem(item as LibraryItem); count++ }
  return count
}
