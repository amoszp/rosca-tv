'use client'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { useStore } from '@/lib/store'
import type { LibraryItem, SeasonRating, TMDBResult } from '@/lib/types'
import { getTVNextEpisode, getRecommendations, getTitle, formatRating, getLibraryType } from '@/lib/tmdb'
import PosterCard from '@/components/home/PosterCard'
import CategorySheet from '@/components/home/CategorySheet'

type LibraryTypeKey = 'series' | 'anime' | 'movies'
const CATEGORY_ORDER: LibraryTypeKey[] = ['series', 'anime', 'movies']
const CATEGORY_LABEL: Record<LibraryTypeKey, string> = { series: 'Series', anime: 'Anime', movies: 'Movies' }

/* Section label — a colour-coded dot keeps Watching / Coming Soon / Interests
   visually distinct at a glance, with an optional action (e.g. "All") on the right. */
function SectionLabel({ label, accent, action }: { label: string; accent: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-2">
        <span className="rounded-full flex-shrink-0" style={{ width: 6, height: 6, background: accent }} aria-hidden="true" />
        <p className="font-black uppercase tracking-widest" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{label}</p>
      </div>
      {action}
    </div>
  )
}

function EmptySection({ text }: { text: string }) {
  return (
    <div className="rounded-3xl flex items-center justify-center text-center px-6" style={{ minHeight: 84, background: 'var(--surface-2)', border: '1px solid var(--border-dim)' }}>
      <p style={{ fontSize: 12.5, color: 'var(--text-faint)', lineHeight: 1.6 }}>{text}</p>
    </div>
  )
}

function LoadingRow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 px-1" style={{ color: 'var(--text-faint)', fontSize: 12 }}>
      <span className="inline-block rounded-full" aria-hidden="true"
        style={{ width: 14, height: 14, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
      {text}
    </div>
  )
}

function formatAirDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface ArrivedEntry { item: LibraryItem; airDate: string; seasonNumber: number; episodeNumber: number }

export default function HomeScreen() {
  const { library, openSheet } = useStore()

  const [arrived, setArrived] = useState<ArrivedEntry[]>([])
  const [loadingArrived, setLoadingArrived] = useState(true)
  const [showAllWatching, setShowAllWatching] = useState(false)
  const [interestPool, setInterestPool] = useState<TMDBResult[]>([])
  const [loadingInterests, setLoadingInterests] = useState(true)
  const [openCategory, setOpenCategory] = useState<LibraryTypeKey | null>(null)

  const all = useMemo(() => Object.values(library), [library])

  /* Watching — items in progress, most recently touched first */
  const continueWatching = useMemo(() => {
    return all
      .filter(i => i.status === 'watching')
      .sort((a, b) => (b.updatedAt ?? b.addedAt) - (a.updatedAt ?? a.addedAt))
      .slice(0, 24)
  }, [all])
  const watchingVisible = showAllWatching ? continueWatching : continueWatching.slice(0, 4)

  /* Coming Soon — series flagged "keep an eye on", already finished, or rated above 8
     (item or any season), checked against TMDB's next_episode_to_air.
     TV-only: TMDB has no equivalent per-item signal for standalone movies/sagas. */
  const watchCandidates = useMemo(() => {
    return all.filter(i => {
      if (i.mediaType !== 'tv') return false
      if (i.keepWatching) return true
      if (i.status === 'watched') return true
      if ((i.userRating ?? 0) > 8) return true
      const seasonData: Record<string, SeasonRating> = i.seasonData ?? {}
      const seasonRatings = Object.values(seasonData).map(s => s.rating ?? 0)
      return seasonRatings.some(r => r > 8)
    })
  }, [all])

  useEffect(() => {
    let cancelled = false
    setLoadingArrived(true)
    const targets = watchCandidates.slice(0, 30)
    Promise.all(targets.map(async item => {
      const next = await getTVNextEpisode(item.id)
      return next ? { item, airDate: next.airDate, seasonNumber: next.seasonNumber, episodeNumber: next.episodeNumber } : null
    })).then(results => {
      if (cancelled) return
      const entries = results.filter((r): r is ArrivedEntry => r !== null)
        .sort((a, b) => a.airDate.localeCompare(b.airDate))
      setArrived(entries)
      setLoadingArrived(false)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchCandidates.map(i => i.id).join(',')])

  /* Watching items that also have a scheduled next episode show that
     episode's label instead of a redundant "Watching" tag — the section
     header already says Watching. */
  const arrivedById = useMemo(() => {
    const map = new Map<number, ArrivedEntry>()
    for (const e of arrived) map.set(e.item.id, e)
    return map
  }, [arrived])

  /* Based on Your Interests — TMDB recommendations seeded from everything you
     rated highly or marked watched (movies, series, and anime alike), pooled,
     de-duped against the library, ranked by how many seeds recommended each
     title, then split by type below so one category can't drown the others. */
  const interestSources = useMemo(() => {
    return all
      .filter(i => i.status === 'watched' || (i.userRating ?? 0) > 8)
      .sort((a, b) => (b.userRating ?? 0) - (a.userRating ?? 0))
      .slice(0, 20)
  }, [all])

  useEffect(() => {
    let cancelled = false
    setLoadingInterests(true)
    const libraryIds = new Set(all.map(i => i.id))
    Promise.all(interestSources.map(i => getRecommendations(i.mediaType, i.id))).then(lists => {
      if (cancelled) return
      const pool = new Map<number, { result: TMDBResult; count: number }>()
      for (const list of lists) {
        for (const r of list) {
          if (libraryIds.has(r.id)) continue
          const existing = pool.get(r.id)
          if (existing) existing.count += 1
          else pool.set(r.id, { result: r, count: 1 })
        }
      }
      const ranked = Array.from(pool.values())
        .sort((a, b) => b.count - a.count || (b.result.vote_average ?? 0) - (a.result.vote_average ?? 0))
        .map(e => e.result)
      setInterestPool(ranked)
      setLoadingInterests(false)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interestSources.map(i => i.id).join(',')])

  /* Split the pool by its own media type — a title lands in Anime/Series/Movies
     based on what it is, not on what category seeded it. */
  const interestsByType = useMemo(() => {
    const buckets: Record<LibraryTypeKey, TMDBResult[]> = { series: [], anime: [], movies: [] }
    for (const r of interestPool) buckets[getLibraryType(r)].push(r)
    return buckets
  }, [interestPool])

  const openItem = useCallback((item: LibraryItem) => {
    openSheet({
      id: item.id, media_type: item.mediaType, title: item.title, name: item.title,
      poster_path: item.poster?.startsWith('http') ? null : item.poster,
      release_date: item.year ? `${item.year}-01-01` : '',
      first_air_date: item.year ? `${item.year}-01-01` : '',
      vote_average: parseFloat(item.tmdbRating) || 0,
    }, item)
  }, [openSheet])

  const openRecommendation = useCallback((r: TMDBResult) => {
    openSheet(r, library[r.id] ?? null)
  }, [openSheet, library])

  return (
    <div className="h-full relative" role="main" aria-label="Home">
      <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-7 px-3.5 pt-4 pb-8">

        {/* ── Watching ── */}
        <div className="flex flex-col gap-2.5">
          <SectionLabel label="Watching" accent="var(--watching-dot)" action={
            continueWatching.length > 4 ? (
              <button onClick={() => setShowAllWatching(v => !v)}
                className="font-bold uppercase tracking-wide"
                style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {showAllWatching ? 'Show less' : `All · ${continueWatching.length}`}
              </button>
            ) : undefined
          } />
          {continueWatching.length === 0 ? (
            <EmptySection text="Nothing marked as Watching yet — set a status from any title's detail sheet." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 92px))', columnGap: 12, rowGap: 16 }}>
              {watchingVisible.map(item => {
                const next = arrivedById.get(item.id)
                return (
                  <PosterCard key={item.id} posterPath={item.poster} title={item.title}
                    episodeLabel={next ? `S${next.seasonNumber} E${next.episodeNumber} · ${formatAirDate(next.airDate)}` : undefined}
                    onPress={() => openItem(item)} />
                )
              })}
            </div>
          )}
        </div>

        {/* ── Coming Soon ── */}
        <div className="flex flex-col gap-2.5">
          <SectionLabel label="Coming Soon" accent="var(--accent)" />
          {loadingArrived ? (
            <LoadingRow text="Checking for new episodes…" />
          ) : arrived.length === 0 ? (
            <EmptySection text="No new episodes scheduled for anything you're keeping an eye on." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 92px))', columnGap: 12, rowGap: 16 }}>
              {arrived.map(({ item, airDate, seasonNumber, episodeNumber }) => (
                <PosterCard key={item.id} posterPath={item.poster} title={item.title}
                  episodeLabel={`S${seasonNumber} E${episodeNumber} · ${formatAirDate(airDate)}`} onPress={() => openItem(item)} />
              ))}
            </div>
          )}
        </div>

        {/* ── Based on Your Interests ── */}
        <div className="flex flex-col gap-5">
          <SectionLabel label="Based on Your Interests" accent="#C084FC" />
          {loadingInterests ? (
            <LoadingRow text="Finding picks for you…" />
          ) : interestPool.length === 0 ? (
            <EmptySection text="Rate or mark a few titles as watched to get personalized picks." />
          ) : (
            CATEGORY_ORDER.map(cat => {
              const items = interestsByType[cat]
              if (items.length === 0) return null
              return (
                <div key={cat} className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between px-1">
                    <p className="font-bold" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{CATEGORY_LABEL[cat]}</p>
                    {items.length > 3 && (
                      <button onClick={() => setOpenCategory(cat)}
                        className="font-bold uppercase tracking-wide"
                        style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        All · {items.length}
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 92px))', columnGap: 12, rowGap: 16 }}>
                    {items.slice(0, 3).map(r => (
                      <PosterCard key={r.id} posterPath={r.poster_path ?? null} title={getTitle(r)}
                        meta={r.vote_average ? `★ ${formatRating(r.vote_average)}` : undefined}
                        onPress={() => openRecommendation(r)} />
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>

      </div>
      </div>

      {openCategory && (
        <CategorySheet
          title={CATEGORY_LABEL[openCategory]}
          items={interestsByType[openCategory]}
          onClose={() => setOpenCategory(null)}
          onSelect={r => { setOpenCategory(null); openRecommendation(r) }}
        />
      )}
    </div>
  )
}
