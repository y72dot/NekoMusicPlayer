const DB_NAME = 'neko-music'
const DB_VERSION = 3
const STORE = 'kv'
const BLOB_STORE = 'blobs'
const log = (...args: unknown[]) => console.log('[IndexedDB]', ...args)
const LS_KEY_PLAYLISTS = 'neko.playlists.v1'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      log('onupgradeneeded', { version: DB_VERSION })
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
      if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE)
    }
    req.onsuccess = () => { log('open success'); resolve(req.result) }
    req.onerror = () => { log('open error', req.error); reject(req.error) }
  })
}

async function withStore(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => void) {
  const db = await openDb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const store = tx.objectStore(STORE)
    log('transaction begin', { mode })
    fn(store)
    tx.oncomplete = () => { log('transaction complete', { mode }); resolve() }
    tx.onerror = () => { log('transaction error', tx.error); reject(tx.error) }
  })
}

export async function setPlaylists(data: unknown) {
  const plain = (() => { try { return JSON.parse(JSON.stringify(data as any)) } catch { return data } })()
  const info = Array.isArray(plain) ? { type: 'array', length: plain.length } : { type: typeof plain }
  log('setPlaylists', info)
  try {
    await withStore('readwrite', store => { store.put(plain, 'playlists') })
  } catch (e) {
    log('setPlaylists fallback to localStorage', e)
    try { localStorage.setItem(LS_KEY_PLAYLISTS, JSON.stringify(plain)) } catch (err) { log('localStorage set error', err) }
  }
}

export async function getPlaylists<T>(): Promise<T | undefined> {
  try {
    const db = await openDb()
    return new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const store = tx.objectStore(STORE)
      const req = store.get('playlists')
      req.onsuccess = () => {
        const r = req.result as T | undefined
        log('getPlaylists result', r ? (Array.isArray(r) ? { type: 'array', length: (r as unknown as []).length } : { type: typeof r }) : 'undefined')
        if (r === undefined) {
          try {
            const raw = localStorage.getItem(LS_KEY_PLAYLISTS)
            if (raw) {
              const parsed = JSON.parse(raw) as T
              log('getPlaylists localStorage fallback', Array.isArray(parsed) ? { type: 'array', length: (parsed as unknown as []).length } : { type: typeof parsed })
              resolve(parsed)
              return
            }
          } catch (err) { log('localStorage fallback parse error', err) }
        }
        resolve(r)
      }
      req.onerror = () => { log('getPlaylists error', req.error); reject(req.error) }
    })
  } catch (e) {
    log('getPlaylists fallback to localStorage', e)
    try {
      const raw = localStorage.getItem(LS_KEY_PLAYLISTS)
      if (!raw) return undefined
      const parsed = JSON.parse(raw) as T
      log('getPlaylists localStorage parsed', Array.isArray(parsed) ? { type: 'array', length: (parsed as unknown as []).length } : { type: typeof parsed })
      return parsed
    } catch (err) {
      log('localStorage get error', err)
      return undefined
    }
  }
}

export async function setBlob(key: string, blob: Blob) {
  const db = await openDb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, 'readwrite')
    const store = tx.objectStore(BLOB_STORE)
    store.put(blob, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getBlob(key: string): Promise<Blob | undefined> {
  const db = await openDb()
  return new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, 'readonly')
    const store = tx.objectStore(BLOB_STORE)
    const req = store.get(key)
    req.onsuccess = () => resolve(req.result as Blob | undefined)
    req.onerror = () => reject(req.error)
  })
}