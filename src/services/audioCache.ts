import { setBlob, getBlob, deleteBlob } from '@/services/db'
import { createLogger } from '@/services/logger'

const CACHE_PREFIX = 'audio:'
const MAX_TOTAL_SIZE = 500 * 1024 * 1024  // 500MB
const MAX_ENTRIES = 100
const TTL_MS = 7 * 24 * 60 * 60 * 1000    // 7 days
const META_KEY = 'audio-cache-meta'

const logger = createLogger('AudioCache')

interface CacheEntry {
  size: number
  cachedAt: number
  lastAccess: number
  sourceId: string
}

interface CacheMeta {
  entries: Record<string, CacheEntry>
  totalSize: number
}

function emptyMeta(): CacheMeta {
  return { entries: {}, totalSize: 0 }
}

async function loadMeta(): Promise<CacheMeta> {
  try {
    const db = await openDb()
    return new Promise<CacheMeta>((resolve) => {
      const tx = db.transaction('kv', 'readonly')
      const store = tx.objectStore('kv')
      const req = store.get(META_KEY)
      req.onsuccess = () => {
        const result = req.result as CacheMeta | undefined
        resolve(result || emptyMeta())
      }
      req.onerror = () => {
        logger.warn('loadMeta error', req.error)
        resolve(emptyMeta())
      }
    })
  } catch {
    return emptyMeta()
  }
}

async function saveMeta(meta: CacheMeta): Promise<void> {
  try {
    await withKvStore('readwrite', store => { store.put(meta, META_KEY) })
  } catch (e) {
    logger.warn('saveMeta error', e)
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('neko-music', 3)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
      if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withKvStore(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => void): Promise<void> {
  const db = await openDb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('kv', mode)
    const store = tx.objectStore('kv')
    fn(store)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function evictIfNeeded(meta: CacheMeta): Promise<void> {
  let { entries, totalSize } = meta
  let count = Object.keys(entries).length

  if (totalSize <= MAX_TOTAL_SIZE && count <= MAX_ENTRIES) return

  // Sort by lastAccess ascending (oldest first)
  const sorted = Object.entries(entries).sort((a, b) => a[1].lastAccess - b[1].lastAccess)

  for (const [key, entry] of sorted) {
    if (totalSize <= MAX_TOTAL_SIZE && count <= MAX_ENTRIES) break

    // Delete blob from IndexedDB
    try {
      await deleteBlob(key)
    } catch (e) {
      logger.warn('evict deleteBlob error', e)
    }

    totalSize -= entry.size
    count--
    delete entries[key]
  }

  meta.totalSize = totalSize
  await saveMeta(meta)
}

export const audioCache = {
  async get(uri: string): Promise<Blob | undefined> {
    const key = CACHE_PREFIX + uri
    const meta = await loadMeta()
    const entry = meta.entries[key]

    if (!entry) {
      // Self-healing: metadata may have been lost (saveMeta failed after setBlob succeeded).
      // Try to read blob directly and restore metadata.
      try {
        const orphanBlob = await getBlob(key)
        if (orphanBlob) {
          logger.info('Self-healing: restoring metadata for orphan blob', { key })
          meta.entries[key] = {
            size: orphanBlob.size,
            cachedAt: Date.now(),
            lastAccess: Date.now(),
            sourceId: 'unknown',
          }
          meta.totalSize += orphanBlob.size
          await saveMeta(meta)
          return orphanBlob
        }
      } catch {
        // IndexedDB unavailable (e.g. test environment), skip self-healing
      }
      return undefined
    }

    // TTL check (FileSystem entries never expire)
    if (entry.sourceId !== 'fs' && Date.now() - entry.cachedAt > TTL_MS) {
      logger.info('TTL expired, removing', { key })
      await this.remove(uri)
      return undefined
    }

    const blob = await getBlob(key)
    if (blob) {
      meta.entries[key].lastAccess = Date.now()
      await saveMeta(meta)
    } else {
      // Blob missing, clean up metadata
      delete meta.entries[key]
      meta.totalSize = Math.max(0, meta.totalSize - entry.size)
      await saveMeta(meta)
    }
    return blob
  },

  async set(uri: string, blob: Blob, sourceId: string): Promise<void> {
    const key = CACHE_PREFIX + uri
    await setBlob(key, blob)
    const meta = await loadMeta()

    // If entry already exists, subtract old size first
    const existing = meta.entries[key]
    if (existing) {
      meta.totalSize -= existing.size
    }

    meta.entries[key] = {
      size: blob.size,
      cachedAt: Date.now(),
      lastAccess: Date.now(),
      sourceId,
    }
    meta.totalSize += blob.size
    await saveMeta(meta)
    await evictIfNeeded(meta)
  },

  async remove(uri: string): Promise<void> {
    const key = CACHE_PREFIX + uri
    const meta = await loadMeta()
    const entry = meta.entries[key]
    if (entry) {
      meta.totalSize = Math.max(0, meta.totalSize - entry.size)
      delete meta.entries[key]
    }
    try {
      await deleteBlob(key)
    } catch (e) {
      logger.warn('remove deleteBlob error', e)
    }
    await saveMeta(meta)
  },

  async clear(): Promise<void> {
    const meta = await loadMeta()
    for (const key of Object.keys(meta.entries)) {
      try {
        await deleteBlob(key)
      } catch (e) {
        logger.warn('clear deleteBlob error', e)
      }
    }
    await saveMeta(emptyMeta())
  },

  async getStats(): Promise<{ count: number; size: number }> {
    const meta = await loadMeta()
    return {
      count: Object.keys(meta.entries).length,
      size: meta.totalSize,
    }
  },

  async trackExisting(key: string, size: number, sourceId: string): Promise<void> {
    const prefixedKey = CACHE_PREFIX + key
    const meta = await loadMeta()

    const existing = meta.entries[prefixedKey]
    if (existing) {
      meta.totalSize -= existing.size
    }

    meta.entries[prefixedKey] = {
      size,
      cachedAt: Date.now(),
      lastAccess: Date.now(),
      sourceId,
    }
    meta.totalSize += size
    await saveMeta(meta)
    await evictIfNeeded(meta)
  },
}
