import { createLogger } from '@/services/logger'
const DB_NAME = 'neko-music'
const DB_VERSION = 3
const STORE = 'kv'
const BLOB_STORE = 'blobs'
const logger = createLogger('IndexedDB')
const LS_KEY_PLAYLISTS = 'neko.playlists.v1'
const LS_KEY_LIBRARY = 'neko.library.v1'
const LS_KEY_CURRENT_ID = 'neko.currentPlaylistId.v1'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      logger.info('onupgradeneeded', { version: DB_VERSION })
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
      if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE)
    }
    req.onsuccess = () => { logger.info('open success'); resolve(req.result) }
    req.onerror = () => { logger.error('open error', req.error); reject(req.error) }
  })
}

async function withStore(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => void) {
  const db = await openDb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const store = tx.objectStore(STORE)
    logger.info('transaction begin', { mode })
    fn(store)
    tx.oncomplete = () => { logger.info('transaction complete', { mode }); resolve() }
    tx.onerror = () => { logger.error('transaction error', tx.error); reject(tx.error) }
  })
}

export async function setLibrary(data: unknown) {
  const plain = (() => { try { return JSON.parse(JSON.stringify(data as any)) } catch { return data } })()
  const info = Array.isArray(plain) ? { type: 'array', length: plain.length } : { type: typeof plain }
  logger.info('setLibrary', info)
  try {
    await withStore('readwrite', store => { store.put(plain, 'library') })
  } catch (e) {
    logger.warn('setLibrary fallback to localStorage', e)
    try { localStorage.setItem(LS_KEY_LIBRARY, JSON.stringify(plain)) } catch (err) { logger.error('localStorage set error', err) }
  }
}

export async function getLibrary<T>(): Promise<T | undefined> {
  try {
    const db = await openDb()
    return new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const store = tx.objectStore(STORE)
      const req = store.get('library')
      req.onsuccess = () => {
        const r = req.result as T | undefined
        logger.info('getLibrary result', r ? (Array.isArray(r) ? { type: 'array', length: (r as unknown as []).length } : { type: typeof r }) : 'undefined')
        if (r === undefined) {
          try {
            const raw = localStorage.getItem(LS_KEY_LIBRARY)
            if (raw) {
              const parsed = JSON.parse(raw) as T
              logger.info('getLibrary localStorage fallback', Array.isArray(parsed) ? { type: 'array', length: (parsed as unknown as []).length } : { type: typeof parsed })
              resolve(parsed)
              return
            }
          } catch (err) { logger.error('localStorage fallback parse error', err) }
        }
        resolve(r)
      }
      req.onerror = () => { logger.error('getLibrary error', req.error); reject(req.error) }
    })
  } catch (e) {
    logger.warn('getLibrary fallback to localStorage', e)
    try {
      const raw = localStorage.getItem(LS_KEY_LIBRARY)
      if (!raw) return undefined
      const parsed = JSON.parse(raw) as T
      logger.info('getLibrary localStorage parsed', Array.isArray(parsed) ? { type: 'array', length: (parsed as unknown as []).length } : { type: typeof parsed })
      return parsed
    } catch (err) {
      logger.error('localStorage get error', err)
      return undefined
    }
  }
}

export async function setPlaylists(data: unknown) {
  const plain = (() => { try { return JSON.parse(JSON.stringify(data as any)) } catch { return data } })()
  const info = Array.isArray(plain) ? { type: 'array', length: plain.length } : { type: typeof plain }
  logger.info('setPlaylists', info)
  try {
    await withStore('readwrite', store => { store.put(plain, 'playlists') })
  } catch (e) {
    logger.warn('setPlaylists fallback to localStorage', e)
    try { localStorage.setItem(LS_KEY_PLAYLISTS, JSON.stringify(plain)) } catch (err) { logger.error('localStorage set error', err) }
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
        logger.info('getPlaylists result', r ? (Array.isArray(r) ? { type: 'array', length: (r as unknown as []).length } : { type: typeof r }) : 'undefined')
        if (r === undefined) {
          try {
            const raw = localStorage.getItem(LS_KEY_PLAYLISTS)
            if (raw) {
              const parsed = JSON.parse(raw) as T
              logger.info('getPlaylists localStorage fallback', Array.isArray(parsed) ? { type: 'array', length: (parsed as unknown as []).length } : { type: typeof parsed })
              resolve(parsed)
              return
            }
          } catch (err) { logger.error('localStorage fallback parse error', err) }
        }
        resolve(r)
      }
      req.onerror = () => { logger.error('getPlaylists error', req.error); reject(req.error) }
    })
  } catch (e) {
    logger.warn('getPlaylists fallback to localStorage', e)
    try {
      const raw = localStorage.getItem(LS_KEY_PLAYLISTS)
      if (!raw) return undefined
      const parsed = JSON.parse(raw) as T
      logger.info('getPlaylists localStorage parsed', Array.isArray(parsed) ? { type: 'array', length: (parsed as unknown as []).length } : { type: typeof parsed })
      return parsed
    } catch (err) {
      logger.error('localStorage get error', err)
      return undefined
    }
  }
}

export async function setCurrentPlaylistId(id: string) {
  try {
    await withStore('readwrite', store => { store.put(id, 'currentId') })
  } catch (e) {
    logger.warn('setCurrentPlaylistId fallback to localStorage', e)
    try { localStorage.setItem(LS_KEY_CURRENT_ID, id) } catch (err) { logger.error('localStorage set currentId error', err) }
  }
}

export async function getCurrentPlaylistId(): Promise<string | undefined> {
  try {
    const db = await openDb()
    return new Promise<string | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const store = tx.objectStore(STORE)
      const req = store.get('currentId')
      req.onsuccess = () => {
        const r = req.result as string | undefined
        if (r === undefined) {
          try {
            const raw = localStorage.getItem(LS_KEY_CURRENT_ID)
            if (raw) { resolve(raw); return }
          } catch (err) { logger.error('localStorage get currentId parse error', err) }
        }
        resolve(r)
      }
      req.onerror = () => { logger.error('getCurrentPlaylistId error', req.error); reject(req.error) }
    })
  } catch (e) {
    logger.warn('getCurrentPlaylistId fallback to localStorage', e)
    try {
      const raw = localStorage.getItem(LS_KEY_CURRENT_ID)
      return raw ?? undefined
    } catch (err) {
      logger.error('localStorage get currentId error', err)
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