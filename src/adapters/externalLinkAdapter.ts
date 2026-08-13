import type { SourceAdapter } from '@/adapters/types'
import type { Track } from '@/models/track'
import { UriResolver } from '@/core/uriResolver'
import { AdapterError } from '@/adapters/adapterError'

function toTitle(url: string) {
  try {
    const u = new URL(url)
    const path = u.pathname.split('/')
    const last = path[path.length - 1]
    return decodeURIComponent(last || url)
  } catch { return url }
}

class ExternalLinkAdapter implements SourceAdapter {
  id = 'external'
  name = 'External Link'
  capabilities = { local: false, authentication: 'none', batchResolve: true, cacheable: false } as const
  async checkHealth() { return { status: navigator.onLine ? 'available' : 'degraded', authenticated: true, checkedAt: Date.now(), message: navigator.onLine ? undefined : 'Browser is offline' } as const }
  
  canResolve(input: unknown): boolean {
    if (typeof input === 'string') return /^https?:\/\//.test(input)
    if (Array.isArray(input)) return input.every(x => typeof x === 'string' && /^https?:\/\//.test(x))
    return false
  }

  async resolve(input: unknown): Promise<Track[]> {
    const urls = Array.isArray(input) ? input as string[] : [input as string]
    
    return urls.map(url => {
      // For external links, we use the URL itself as the resource ID (base64 encoded maybe? or just raw)
      // But resourceId in neko:// should be path safe.
      // Let's use 'remote' as resourceId and put real URL in params, 
      // OR use a hash of the URL as resourceId.
      // Simple approach: resourceId = 'stream', param url = ...
      
      const title = toTitle(url)
      const uri = UriResolver.generate(this.id, 'track', 'stream', {
        url: url,
        title: title
      })

      return {
        id: crypto.randomUUID(),
        uri,
        title,
        artist: undefined,
        album: undefined,
        coverUrl: undefined,
        duration: undefined,
        sourceId: this.id,
        sourceRef: { url },
        url,
        format: undefined,
      }
    })
  }

  async loadByUri(resourceId: string, params: Record<string, string>): Promise<{ url: string | Blob }> {
    if (!params.url) {
      throw new AdapterError('INVALID_INPUT', 'External link URI missing url parameter', this.id)
    }
    return { url: params.url }
  }
}

export const externalLinkAdapter = new ExternalLinkAdapter()
