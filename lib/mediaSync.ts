import { fetchItemDetails, fetchTVExternalIds, buildPosterUrlSync, getTMDBConfig, formatRating, resolveMediaPath } from './tmdb'
import { fetchOmdbByImdbId } from './omdb'
import type { LibraryItem } from './types'

export interface HydratedFields {
  poster?: string; tmdbRating?: string; title?: string; year?: string
  imdbId?: string; imdbRating?: string; rottenTomatoes?: string
  metacritic?: string; rated?: string; runtime?: string; director?: string
}

export async function hydrateItem(mediaType: string, id: number, currentPoster?: string | null): Promise<HydratedFields> {
  const fields: HydratedFields = {}
  const isTv = resolveMediaPath(mediaType) === 'tv'
  const details = await fetchItemDetails(mediaType, id)
  if (!details || details.id !== id) return fields
  if (details.title || details.name) fields.title = details.title || details.name
  if (details.release_date || details.first_air_date) fields.year = (details.release_date || details.first_air_date || '').slice(0,4)
  if (details.vote_average) fields.tmdbRating = formatRating(details.vote_average)
  if (details.poster_path && (!currentPoster || !currentPoster.startsWith('http')))
    fields.poster = buildPosterUrlSync(details.poster_path, 'w500')
  let imdbId: string | undefined = details.imdb_id ?? undefined
  if (isTv) {
    try { const ext = await fetchTVExternalIds(id); if (ext?.imdb_id) imdbId = ext.imdb_id } catch {}
  }
  if (!imdbId || !imdbId.startsWith('tt')) return fields
  fields.imdbId = imdbId
  const omdb = await fetchOmdbByImdbId(imdbId)
  if (!omdb) return fields
  if (omdb.imdbRating)     fields.imdbRating     = omdb.imdbRating
  if (omdb.rottenTomatoes) fields.rottenTomatoes = omdb.rottenTomatoes
  if (omdb.metacritic)     fields.metacritic     = omdb.metacritic
  if (omdb.rated)          fields.rated          = omdb.rated
  if (omdb.runtime)        fields.runtime        = omdb.runtime
  if (omdb.director)       fields.director       = omdb.director
  return fields
}

export async function syncItemFull(item: LibraryItem, tmdbId: number): Promise<LibraryItem> {
  const ownId = tmdbId
  const fields = await hydrateItem(item.mediaType || item.type, ownId, item.poster)
  return {
    ...item, id: ownId,
    ...(fields.poster         && { poster:         fields.poster         }),
    ...(fields.tmdbRating     && { tmdbRating:     fields.tmdbRating     }),
    ...(fields.title && !item.title && { title:    fields.title          }),
    ...(fields.year  && !item.year  && { year:     fields.year           }),
    ...(fields.imdbId         && { imdbId:         fields.imdbId         }),
    ...(fields.imdbRating     && { imdbRating:     fields.imdbRating     }),
    ...(fields.rottenTomatoes && { rottenTomatoes: fields.rottenTomatoes }),
    ...(fields.metacritic     && { metacritic:     fields.metacritic     }),
    ...(fields.rated          && { rated:          fields.rated          }),
    ...(fields.runtime        && { runtime:        fields.runtime        }),
    ...(fields.director       && { director:       fields.director       }),
    updatedAt: Date.now(),
  }
}

export async function prewarmConfig(): Promise<void> { try { await getTMDBConfig() } catch {} }

export function combinedScore(tmdbRating: string, imdbRating?: string): string | null {
  const tmdb = parseFloat(tmdbRating)
  if (isNaN(tmdb)) return null
  if (imdbRating) { const imdb = parseFloat(imdbRating); if (!isNaN(imdb) && imdb > 0) return ((tmdb+imdb)/2).toFixed(1) }
  return tmdb.toFixed(1)
}
