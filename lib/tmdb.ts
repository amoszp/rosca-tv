import type { TMDBResult, TMDBProvider, TMDBSeason } from './types'

const BASE = 'https://api.themoviedb.org/3'
export const IMG_BASE = 'https://image.tmdb.org/t/p'

const getHeaders = () => ({
  Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_TOKEN}`,
  'Content-Type': 'application/json',
})

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: getHeaders() })
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`)
  return res.json()
}

export async function searchMulti(query: string): Promise<TMDBResult[]> {
  if (!query.trim()) return []
  const data = await apiFetch<{ results: TMDBResult[] }>(
    `/search/multi?query=${encodeURIComponent(query)}&include_adult=false&page=1`
  )
  return (data.results || []).filter(
    (r) => r.media_type === 'movie' || r.media_type === 'tv'
  ).slice(0, 25)
}

export interface WatchProvidersResult {
  flatrate?: TMDBProvider[]
  rent?: TMDBProvider[]
  buy?: TMDBProvider[]
  free?: TMDBProvider[]
}

export async function getWatchProviders(
  mediaType: 'movie' | 'tv',
  id: number,
  region: string
): Promise<TMDBProvider[]> {
  try {
    const data = await apiFetch<{ results: Record<string, WatchProvidersResult> }>(
      `/${mediaType}/${id}/watch/providers`
    )
    const regionData = (data.results || {})[region] || {}
    const providers: TMDBProvider[] = [
      ...(regionData.flatrate || []),
      ...(regionData.free || []),
    ]
    // Deduplicate by provider_id
    const seen = new Set<number>()
    return providers.filter((p) => {
      if (seen.has(p.provider_id)) return false
      seen.add(p.provider_id)
      return true
    }).slice(0, 10)
  } catch {
    return []
  }
}

export async function getTVSeasons(id: number): Promise<TMDBSeason[]> {
  try {
    const data = await apiFetch<{ seasons: TMDBSeason[] }>(`/tv/${id}`)
    return (data.seasons || []).filter((s) => s.season_number > 0)
  } catch {
    return []
  }
}

export function posterUrl(path: string | null | undefined, size = 'w185'): string {
  if (!path) return ''
  return `${IMG_BASE}/${size}${path}`
}

export const ANIME_GENRE_ID = 16
export const ANIME_COUNTRIES = ['JP', 'KR']

export function detectAnime(result: TMDBResult): boolean {
  return (
    result.media_type === 'tv' &&
    Boolean(result.genre_ids?.includes(ANIME_GENRE_ID)) &&
    Boolean(result.origin_country?.some((c) => ANIME_COUNTRIES.includes(c)))
  )
}

export function getLibraryType(result: TMDBResult): 'movies' | 'series' | 'anime' {
  if (result.media_type === 'movie') return 'movies'
  if (detectAnime(result)) return 'anime'
  return 'series'
}

export function formatRating(vote: number | undefined): string {
  if (!vote) return '—'
  return (Math.round(vote * 10) / 10).toFixed(1)
}

export function getYear(result: TMDBResult): string {
  const date = result.release_date || result.first_air_date || ''
  return date.slice(0, 4)
}

export function getTitle(result: TMDBResult): string {
  return result.title || result.name || 'Unknown'
}
