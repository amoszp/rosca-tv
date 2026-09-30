'use client'
import { useRef, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { searchMulti, getTitle, getYear, formatRating, getLibraryType } from '@/lib/tmdb'
import { syncItemFull } from '@/lib/mediaSync'
import { resolveId } from '@/hooks/usePosterSync'
import { useT } from '@/lib/i18n'
import type { TMDBResult, LibraryItem } from '@/lib/types'

/* Shared TMDB search + instant-add, used by the dedicated Search tab and by
   LibraryScreen's "not in your list" fallback, so both stay in sync instead
   of carrying two copies of the same debounce/add logic. */
export function useTmdbSearch() {
  const { library, upsertItem, showToast } = useStore()
  const t = useT()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const search = useCallback((q: string, onResults: (r: TMDBResult[]) => void, onLoading: (v: boolean) => void) => {
    clearTimeout(debounceRef.current)
    if (!q.trim()) { onResults([]); onLoading(false); return }
    onLoading(true)
    debounceRef.current = setTimeout(async () => {
      try { onResults(await searchMulti(q)) } catch { onResults([]) } finally { onLoading(false) }
    }, 360)
  }, [])

  const instantAdd = useCallback(async (result: TMDBResult) => {
    if (library[result.id]) { showToast(t.search.alreadyInLibrary(getTitle(result))); return }
    const base: LibraryItem = {
      id: result.id, mediaType: result.media_type, type: getLibraryType(result),
      title: getTitle(result), year: getYear(result), poster: result.poster_path || null,
      tmdbRating: formatRating(result.vote_average), status: null, seasonData: {}, addedAt: Date.now(),
    }
    await upsertItem(base); showToast(t.search.addedToast(base.title))
    const ownId = resolveId(base)
    if (ownId) syncItemFull(base, ownId).then(u => upsertItem(u)).catch(() => {})
  }, [library, upsertItem, showToast, t])

  return { search, instantAdd }
}
