import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock localStorage for fallback
const ls = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => ls.get(key) ?? null),
  setItem: vi.fn((key: string, val: string) => { ls.set(key, val) }),
  removeItem: vi.fn(),
})

// Mock indexedDB with a working store
const store = new Map<string, any>()
const blobStore = new Map<string, Blob>()

vi.stubGlobal('indexedDB', {
  open: vi.fn().mockReturnValue({
    result: {
      objectStoreNames: { contains: () => true },
      transaction: vi.fn().mockReturnValue({
        objectStore: vi.fn((name: string) => {
          const s = name === 'blobs' ? blobStore : store
          return {
            get: vi.fn((key: string) => ({
              get result() { return s.get(key) },
              set onsuccess(cb: any) { cb() },
              set onerror(_: any) {},
            })),
            put: vi.fn((value: any, key?: string) => { s.set(key ?? '', value) }),
          }
        }),
        set oncomplete(cb: any) { cb() },
        set onerror(_: any) {},
      }),
    },
    set onupgradeneeded(_: any) {},
    set onsuccess(cb: any) { cb() },
    set onerror(_: any) {},
  }),
})

import { setLibrary, getLibrary, setBlob, getBlob, setPlaylists, getPlaylists } from '@/services/db'

describe('DB Service', () => {
  beforeEach(() => {
    store.clear()
    blobStore.clear()
    ls.clear()
  })

  it('should set and get library', async () => {
    const data = [{ id: '1', title: 'test' }]
    await setLibrary(data)
    const result = await getLibrary()
    expect(result).toEqual(data)
  })

  it('should set and get playlists', async () => {
    const data = [{ id: '1', name: 'test', tracks: [], createdAt: 0, updatedAt: 0 }]
    await setPlaylists(data)
    const result = await getPlaylists()
    expect(result).toEqual(data)
  })

  it('should set and get blob', async () => {
    const blob = new Blob(['test'], { type: 'text/plain' })
    await setBlob('key1', blob)
    const result = await getBlob('key1')
    expect(result).toBeInstanceOf(Blob)
  })

  it('should return undefined for missing key', async () => {
    const result = await getBlob('nonexistent')
    expect(result).toBeUndefined()
  })
})
