export async function enrichByMusicBrainz(params: { title?: string; artist?: string; album?: string }) {
  const { title, artist } = params
  if (!title && !artist) return {}
  const pieces: string[] = []
  if (title) pieces.push(`recording:"${String(title).replace(/"/g, '\\"')}"`)
  if (artist) pieces.push(`artist:"${String(artist).replace(/"/g, '\\"')}"`)
  const q = pieces.join(' AND ')
  const url = `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(q)}&fmt=json&limit=1`
  const res = await fetch(url)
  if (!res.ok) return {}
  const data = await res.json()
  const rec = data.recordings?.[0]
  if (!rec) return {}
  const title2 = rec.title
  const artist2 = rec['artist-credit']?.[0]?.name
  const release = rec.releases?.[0]
  const album2 = release?.title
  const date = release?.date
  const year = date ? parseInt(String(date).slice(0, 4)) : undefined
  return { title: title2, artist: artist2, album: album2, year }
}
