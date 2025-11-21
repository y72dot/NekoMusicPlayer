import type { Track } from '../models/track'

export interface SourceAdapter {
  id: string
  name: string
  canResolve(input: unknown): boolean
  resolve(input: unknown): Promise<Track[]>
  load(track: Track): Promise<{ url: string | Blob }>
  serialize?(track: Track): unknown
  deserialize?(ref: unknown): Track
}

export interface AdapterRegistry {
  register(adapter: SourceAdapter): void
  list(): SourceAdapter[]
  get(id: string): SourceAdapter | undefined
  findByInput(input: unknown): SourceAdapter | undefined
}