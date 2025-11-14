export async function computeUid(blob: Blob): Promise<string> {
  if ((crypto as any)?.subtle?.digest) {
    const buf = await blob.arrayBuffer()
    const hash = await crypto.subtle.digest('SHA-256', buf)
    const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
    return `sha256:${hex}`
  }
  return `size:${blob.size}`
}

export function fallbackUid(providerId: string, locator: string): string {
  return `${providerId}:${locator}`
}