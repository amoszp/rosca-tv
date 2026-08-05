export type MediaType    = 'movie' | 'tv'
export type LibraryType  = 'movies' | 'series' | 'anime'
export type Status       = 'pending' | 'watching' | 'watched'
export type Tab          = 'movies' | 'series' | 'anime' | 'search' | 'settings'
export type SubTab       = 'all' | Status
export type DrawerTab    = 'overview' | 'tracking' | 'seasons'

export type SortKey =
  | 'status'
  | 'myRating-desc' | 'myRating-asc'
  | 'score-desc'    | 'score-asc'
  | 'title-asc'     | 'title-desc'
  | 'added-desc'

export interface TMDBResult {
  id: number; media_type: MediaType
  title?: string; name?: string; poster_path?: string | null
  release_date?: string; first_air_date?: string; vote_average?: number
  genre_ids?: number[]; origin_country?: string[]
}
export interface TMDBProvider {
  provider_id: number; provider_name: string; logo_path: string; display_priority?: number
}
export interface TMDBSeason { season_number: number; episode_count: number; name: string }
export type DecimalRating = number | undefined
export interface SeasonRating { rating?: DecimalRating; episodes: Record<string, boolean> }

export interface LibraryItem {
  id: number; mediaType: MediaType; type: LibraryType
  title: string; year: string; poster: string | null
  tmdbRating: string
  status: Status | null        // null = no status assigned yet
  userRating?: DecimalRating
  seasonData?: Record<string, SeasonRating>
  notes?: string
  addedAt: number; updatedAt?: number
  imdbId?: string; imdbRating?: string; rottenTomatoes?: string
  metacritic?: string; rated?: string; runtime?: string; director?: string
}

export interface AppSettings { region: string; sortKey: SortKey }
export interface Library { [id: number]: LibraryItem }
export interface ExportData { version: number; exportedAt: string; library: Library }
