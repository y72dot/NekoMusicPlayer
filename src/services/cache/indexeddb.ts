import { openDB, IDBPDatabase } from 'idb'
import { devlog, devwarn } from '@/utils/devlog'

type Stores = 'audioBlobs' | 'covers' | 'json'

let dbPromise: Promise<IDBPDatabase<any>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB('music-player-db', 1, {
      upgrade(db) {
        db.createObjectStore('audioBlobs')
        db.createObjectStore('covers')
        db.createObjectStore('json')
      }
    })
  }
  return dbPromise
}

export async function putBlob(store: Stores, key: string, blob: Blob) {
  const db = await getDB()
  await db.put(store, blob, key)
  devlog('cache', 'putBlob', { store, key, size: blob.size })
}

export async function getBlob(store: Stores, key: string) {
  const db = await getDB()
  try {
    const v = await db.get(store, key)
    devlog('cache', 'getBlob', { store, key, hit: !!v })
    return v as Blob | undefined
  } catch (e) { devwarn('cache', 'getBlob failed', { store, key, err: String(e) }); return undefined }
}

export async function putJSON<T>(key: string, value: T) {
  const db = await getDB()
  await db.put('json', value, key)
  devlog('cache', 'putJSON', { key })
}

export async function getJSON<T>(key: string) {
  const db = await getDB()
  try {
    const v = await db.get('json', key)
    devlog('cache', 'getJSON', { key, hit: !!v })
    return v as T | undefined
  } catch (e) { devwarn('cache', 'getJSON failed', { key, err: String(e) }); return undefined }
}
