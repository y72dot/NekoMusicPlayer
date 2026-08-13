import { setBlob, getBlob, deleteBlob, getBlobStatsByPrefix, clearBlobsByPrefix, getKv, setKv } from '@/services/db'
import { createLogger } from '@/services/logger'

const CACHE_PREFIX = 'audio:'
const DEFAULT_MAX_TOTAL_SIZE = 500 * 1024 * 1024
const MAX_ENTRIES = 100
const TTL_MS = 7 * 24 * 60 * 60 * 1000    // 7 days
const META_KEY = 'audio-cache-meta'

const logger = createLogger('AudioCache')

export interface CacheEntry {
  size: number
  cachedAt: number
  lastAccess: number
  sourceId: string
}

export interface CacheMeta {
  entries: Record<string, CacheEntry>
  totalSize: number
}

function emptyMeta(): CacheMeta {
  return { entries: {}, totalSize: 0 }
}

async function loadMeta(): Promise<CacheMeta> {
  try {
    return (await getKv<CacheMeta>(META_KEY)) || emptyMeta()
  } catch {
    return emptyMeta()
  }
}

async function saveMeta(meta: CacheMeta): Promise<void> {
  try {
    await setKv(META_KEY, meta)
  } catch (e) {
    logger.warn('saveMeta error', e)
  }
}

async function evictIfNeeded(meta: CacheMeta, maxTotalSize = DEFAULT_MAX_TOTAL_SIZE): Promise<void> {
  let { entries, totalSize } = meta
  let count = Object.keys(entries).length

  if (totalSize <= maxTotalSize && count <= MAX_ENTRIES) return

  // Sort by lastAccess ascending (oldest first)
  const sorted = Object.entries(entries).sort((a, b) => a[1].lastAccess - b[1].lastAccess)

  for (const [key, entry] of sorted) {
    if (totalSize <= maxTotalSize && count <= MAX_ENTRIES) break

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

  async set(uri: string, blob: Blob, sourceId: string, maxTotalSize = DEFAULT_MAX_TOTAL_SIZE): Promise<void> {
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
    await evictIfNeeded(meta, maxTotalSize)
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
    await clearBlobsByPrefix(CACHE_PREFIX)
    await saveMeta(emptyMeta())
  },

  async getStats(): Promise<{ count: number; size: number }> {
    return getBlobStatsByPrefix(CACHE_PREFIX)
  },

  async getStatsBySource(): Promise<Record<string, { count: number; size: number }>> {
    const meta = await loadMeta()
    const result: Record<string, { count: number; size: number }> = {}
    for (const entry of Object.values(meta.entries)) {
      const item = result[entry.sourceId] ||= { count: 0, size: 0 }
      item.count++
      item.size += entry.size
    }
    return result
  },

  async clearSource(sourceId: string): Promise<void> {
    const meta = await loadMeta()
    for (const [key, entry] of Object.entries(meta.entries)) {
      if (entry.sourceId !== sourceId) continue
      await deleteBlob(key).catch(() => {})
      meta.totalSize = Math.max(0, meta.totalSize - entry.size)
      delete meta.entries[key]
    }
    await saveMeta(meta)
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
