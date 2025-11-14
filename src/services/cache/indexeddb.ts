import { openDB, IDBPDatabase } from 'idb'

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
}

export async function getBlob(store: Stores, key: string) {
  const db = await getDB()
  return db.get(store, key) as Promise<Blob | undefined>
}

export async function putJSON<T>(key: string, value: T) {
  const db = await getDB()
  await db.put('json', value, key)
}

export async function getJSON<T>(key: string) {
  const db = await getDB()
  return db.get('json', key) as Promise<T | undefined>
}

