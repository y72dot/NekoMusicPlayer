import { registry } from '@/adapters/registry'
import type { LoadByUriMetadata } from '@/adapters/types'

export interface ParsedUri {
  sourceId: string
  type: 'track' | 'playlist' | 'album' | string
  resourceId: string
  params: Record<string, string>
}

export class UriResolver {
  /**
   * Parse a neko:// URI into its components
   */
  static parse(uri: string): ParsedUri {
    try {
      const url = new URL(uri)
      if (url.protocol !== 'neko:') {
        throw new Error('Invalid protocol: must be neko:')
      }

      const sourceId = url.hostname
      // pathname is like /track/123
      const parts = url.pathname.split('/').filter(Boolean)
      const type = parts[0] || 'track'
      // resourceId might contain slashes if encoded, decode it
      const resourceId = decodeURIComponent(parts.slice(1).join('/'))
      const params = Object.fromEntries(url.searchParams.entries())

      return { sourceId, type, resourceId, params }
    } catch (e) {
      throw new Error(`Failed to parse URI: ${uri} - ${String(e)}`)
    }
  }

  /**
   * Generate a standard neko:// URI
   */
  static generate(sourceId: string, type: string, resourceId: string, params: Record<string, string> = {}): string {
    // We encode resourceId to handle special characters
    const path = `/${type}/${encodeURIComponent(resourceId)}`
    // Use dummy base for URL construction then replace protocol
    const url = new URL(`neko://${sourceId}${path}`)
    
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v))
      }
    })

    return url.toString()
  }

  /**
   * Resolve a URI to a playable URL or Blob
   */
  static async load(uri: string): Promise<{ url: string | Blob; metadata?: LoadByUriMetadata }> {
    const { sourceId, resourceId, params } = this.parse(uri)
    const adapter = registry.get(sourceId)

    if (!adapter) {
      throw new Error(`Adapter not found for source: ${sourceId}`)
    }

    if (!adapter.loadByUri) {
      throw new Error(`Adapter ${sourceId} does not support URI loading`)
    }

    return adapter.loadByUri(resourceId, params)
  }
}
