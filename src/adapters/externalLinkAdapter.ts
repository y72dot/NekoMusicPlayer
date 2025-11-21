import type { SourceAdapter } from './types'
import type { Track } from '../models/track'

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
  canResolve(input: unknown): boolean {
    if (typeof input === 'string') return /^https?:\/\//.test(input)
    if (Array.isArray(input)) return input.every(x => typeof x === 'string' && /^https?:\/\//.test(x))
    return false
  }
  async resolve(input: unknown): Promise<Track[]> {
    const urls = Array.isArray(input) ? input as string[] : [input as string]
    return urls.map(url => ({
      id: crypto.randomUUID(),
      title: toTitle(url),
      artist: undefined,
      album: undefined,
      coverUrl: undefined,
      duration: undefined,
      sourceId: this.id,
      sourceRef: { url },
      url,
      format: undefined,
    }))
  }
  async load(track: Track): Promise<{ url: string | Blob }> {
    const ref = track.sourceRef as { url: string }
    return { url: ref.url || track.url! }
  }
}

export const externalLinkAdapter = new ExternalLinkAdapter()