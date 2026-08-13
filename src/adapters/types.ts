import type { Track } from '@/models/track'

export type LoadByUriMetadata = Partial<Pick<Track, 'sampleRate' | 'bitrate' | 'bitDepth' | 'channels' | 'codec' | 'container' | 'lossless'>>

export interface AdapterCapabilities {
  local: boolean
  authentication: 'none' | 'optional' | 'required'
  batchResolve: boolean
  cacheable: boolean
}

export interface AdapterHealth {
  status: 'available' | 'degraded' | 'unavailable'
  authenticated: boolean
  checkedAt: number
  message?: string
}

export interface SourceAdapter {
  id: string
  name: string
  capabilities: AdapterCapabilities
  canResolve(input: unknown): boolean
  resolve(input: unknown): Promise<Track[]>
  /**
   * Load resource directly from URI params
   * @param resourceId The ID part of the URI
   * @param params Query parameters
   */
  loadByUri(resourceId: string, params: Record<string, string>): Promise<{ url: string | Blob; metadata?: LoadByUriMetadata }>
  serialize?(track: Track): unknown
  deserialize?(ref: unknown): Track
  checkHealth(): Promise<AdapterHealth>
}

export interface AdapterRegistry {
  register(adapter: SourceAdapter): void
  list(): SourceAdapter[]
  get(id: string): SourceAdapter | undefined
  findByInput(input: unknown): SourceAdapter | undefined
  checkHealth(): Promise<Record<string, AdapterHealth>>
}
