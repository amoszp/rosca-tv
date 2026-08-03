'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { fetchItemDetails, buildPosterUrlSync, formatRating } from '@/lib/tmdb'
import { prewarmConfig } from '@/lib/mediaSync'
import type { LibraryItem } from '@/lib/types'

export function resolveId(item: LibraryItem): number {
  if (typeof item.id === 'number' && item.id > 0) return item.id
  const alt = (item as unknown as Record<string,unknown>)['tmdb_id']
  if (typeof alt === 'number' && alt > 0) return alt
  if (typeof alt === 'string' && !isNaN(Number(alt))) return Number(alt)
  const p = parseInt(String(item.id), 10); return isNaN(p) ? 0 : p
}

async function posterOnly(item: LibraryItem, upsertItem: (i: LibraryItem) => Promise<void>, inFlight: Set<number>, finished: Set<number>): Promise<void> {
  const ownId = resolveId(item); const ownTitle = item.title ?? ''
  if (!ownId) return
  inFlight.add(ownId)
  try {
    const details = await fetchItemDetails(item.mediaType || item.type, ownId)
    if (!details || details.id !== ownId || !details.poster_path) { finished.add(ownId); return }
    const responseTitle = (details.title || details.name || '').toLowerCase()
    const storedFirst = ownTitle.split(' ')[0].toLowerCase()
    if (ownTitle && storedFirst.length > 2 && !responseTitle.includes(storedFirst)) return
    const fullUrl = buildPosterUrlSync(details.poster_path, 'w500')
    const updated: LibraryItem = {
      ...item, id: ownId, poster: fullUrl,
      tmdbRating: (!item.tmdbRating || item.tmdbRating === '—') && details.vote_average ? formatRating(details.vote_average) : item.tmdbRating,
      title: item.title || details.title || details.name || '',
      year:  item.year  || (details.release_date || details.first_air_date || '').slice(0,4),
      updatedAt: Date.now(),
    }
    if (updated.id !== ownId) return
    await upsertItem(updated); finished.add(ownId)
  } catch {} finally { inFlight.delete(ownId) }
}

export function usePosterSync() {
  const { library, upsertItem } = useStore()
  const inFlight = useRef(new Set<number>())
  const finished = useRef(new Set<number>())

  const runSync = useCallback(async (items: LibraryItem[]) => {
    const missing = items.filter(it => { const id = resolveId(it); return id > 0 && (!it.poster || it.poster === '') && !inFlight.current.has(id) && !finished.current.has(id) })
    if (missing.length === 0) return
    try { await prewarmConfig() } catch {}
    const BATCH = 3
    for (let i = 0; i < missing.length; i += BATCH) {
      await Promise.all(missing.slice(i, i+BATCH).map(item => posterOnly(item, upsertItem, inFlight.current, finished.current)))
      if (i+BATCH < missing.length) await new Promise<void>(r => setTimeout(r, 300))
    }
  }, [upsertItem])

  useEffect(() => { const items = Object.values(library); if (items.length === 0) return; runSync(items) }, [library, runSync])
}
