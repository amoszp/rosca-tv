'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useStore } from '@/lib/store'
import {
  posterUrl, getTitle, getYear, formatRating,
  getWatchProviders, getTVSeasons, getLibraryType,
} from '@/lib/tmdb'
import type { TMDBProvider, TMDBSeason, LibraryItem, Status } from '@/lib/types'
import FluidSlider from './FluidSlider'
import StatusBadge from '../ui/StatusBadge'

/* ─── Augmented item type for neutral-state tracking ───────── */
type LocalItem = LibraryItem & { _isNew?: boolean }

/* ─── Status options ──────────────────────────────────────── */
const STATUS_OPTS: { id: Status; label: string; idle: string; active: string }[] = [
  { id: 'pending',  label: 'Pending',  idle: 'text-white/30 border-white/10 bg-transparent', active: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/40 font-bold' },
  { id: 'watching', label: 'Watching', idle: 'text-white/30 border-white/10 bg-transparent', active: 'bg-blue-500/20   text-blue-200   border-blue-500/40   font-bold' },
  { id: 'watched',  label: 'Watched',  idle: 'text-white/30 border-white/10 bg-transparent', active: 'bg-green-500/20  text-green-200  border-green-500/40  font-bold' },
]

/* ─── Shared atoms ─────────────────────────────────────────── */
const Divider = () => (
  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
)

function Spinner() {
  return (
    <span className="inline-block rounded-full border-2 border-white/10 border-t-orange-400"
      style={{ width: 14, height: 14, animation: 'spin 0.7s linear infinite' }} />
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth={2.5}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s ease', flexShrink: 0 }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function SectionHeader({ label, open, onToggle, right }: {
  label: string; open: boolean; onToggle: () => void; right?: string
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 active:opacity-60 transition-opacity"
    >
      <div className="flex items-center gap-2">
        <span className="font-black text-white uppercase tracking-widest" style={{ fontSize: 11 }}>{label}</span>
        {right && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{right}</span>}
      </div>
      <ChevronIcon open={open} />
    </button>
  )
}

function Collapsible({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div style={{
      overflow: 'hidden',
      maxHeight: open ? 9999 : 0,
      opacity: open ? 1 : 0,
      transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease',
    }}>
      {children}
    </div>
  )
}

/* ─── Episode grid with "Show More" pagination ─────────────── */
const EP_PAGE = 40

interface EpisodeGridProps {
  total:     number
  episodes:  Record<string, boolean>
  onToggle:  (ep: number) => void
  onAutoFill:(ep: number) => void
}

function EpisodeGrid({ total, episodes, onToggle, onAutoFill }: EpisodeGridProps) {
  const [shown, setShown] = useState(Math.min(total, EP_PAGE))
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  /* Reset pagination if total changes (different season opening) */
  useEffect(() => { setShown(Math.min(total, EP_PAGE)) }, [total])

  const handleClick = (ep: number) => {
    if (timers.current[ep]) {
      clearTimeout(timers.current[ep])
      delete timers.current[ep]
      onAutoFill(ep)
    } else {
      timers.current[ep] = setTimeout(() => {
        delete timers.current[ep]
        onToggle(ep)
      }, 230)
    }
  }

  const remaining = total - shown

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: shown }, (_, i) => i + 1).map(ep => {
          const watched = Boolean(episodes[String(ep)])
          return (
            <button
              key={ep}
              onClick={() => handleClick(ep)}
              className="ep-btn rounded-[6px] border font-bold tabular-nums"
              style={{
                width: 28, height: 28, fontSize: 10,
                background: watched ? 'rgba(59,130,246,0.28)' : 'rgba(255,255,255,0.04)',
                borderColor: watched ? 'rgba(96,165,250,0.5)' : 'rgba(255,255,255,0.10)',
                color: watched ? '#93c5fd' : 'rgba(255,255,255,0.38)',
              }}
            >
              {ep}
            </button>
          )
        })}
      </div>

      {/* Show More button */}
      {remaining > 0 && (
        <button
          onClick={() => setShown(total)}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-[8px] active:opacity-60 transition-opacity"
          style={{
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.5)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
            Show More (+{remaining} episode{remaining !== 1 ? 's' : ''})
          </span>
        </button>
      )}

      {shown > EP_PAGE && total > EP_PAGE && (
        <button
          onClick={() => setShown(EP_PAGE)}
          className="mt-1.5 w-full text-center active:opacity-60"
          style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', padding: '4px' }}
        >
          Show less ↑
        </button>
      )}
    </div>
  )
}

/* ─── Season accordion: episodes (uncapped) + season slider ── */
interface SeasonAccordionProps {
  season:      TMDBSeason
  episodes:    Record<string, boolean>
  rating:      number | undefined
  defaultOpen: boolean
  onToggleEp:  (ep: number) => void
  onAutoFill:  (ep: number) => void
  onRating:    (v: number | undefined) => void
}

function SeasonAccordion({
  season, episodes, rating, defaultOpen,
  onToggleEp, onAutoFill, onRating,
}: SeasonAccordionProps) {
  const [open, setOpen] = useState(defaultOpen)
  useEffect(() => { setOpen(defaultOpen) }, [defaultOpen])

  const done  = Object.values(episodes).filter(Boolean).length
  const label = season.name || `Season ${season.season_number}`

  return (
    <div
      className="rounded-[12px] overflow-hidden"
      style={{ background: 'var(--dp-red)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Season header row */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 active:opacity-70"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="font-bold text-white truncate" style={{ fontSize: 13 }}>{label}</span>
          <span className="tabular-nums font-medium flex-shrink-0" style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>
            {done}/{season.episode_count}
          </span>
          {rating !== undefined && (
            <span className="font-bold tabular-nums flex-shrink-0" style={{ fontSize: 10, color: 'var(--orange)' }}>
              ★ {rating.toFixed(1)}
            </span>
          )}
        </div>
        <ChevronIcon open={open} />
      </button>

      <Collapsible open={open}>
        <div className="px-4 pb-4 flex flex-col gap-4">
          {/* Episode grid — uncapped with Show More */}
          <div>
            <p className="font-bold uppercase tracking-widest mb-2" style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
              Episodes · double-tap to fill up to
            </p>
            <EpisodeGrid
              total={season.episode_count}
              episodes={episodes}
              onToggle={onToggleEp}
              onAutoFill={onAutoFill}
            />
          </div>

          {/* Season fluid slider */}
          <div
            className="rounded-[10px] p-3"
            style={{ background: 'var(--dp-brown-2)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <FluidSlider
              value={rating}
              onChange={onRating}
              label={`${label} rating`}
              compact
            />
          </div>
        </div>
      </Collapsible>
    </div>
  )
}

/* ─── Main BottomSheet ────────────────────────────────────── */
export default function BottomSheet() {
  const { sheet, closeSheet, upsertItem, removeItem, showToast, settings, library } = useStore()

  const [localItem, setLocalItem]     = useState<LocalItem | null>(null)
  const [providers, setProviders]     = useState<TMDBProvider[]>([])
  const [seasons, setSeasons]         = useState<TMDBSeason[]>([])
  const [loadingData, setLoadingData] = useState(false)

  /* Section collapse states */
  const [providersOpen, setProvidersOpen] = useState(false)
  const [myRatingsOpen, setMyRatingsOpen] = useState(true)
  const [seasonsOpen,   setSeasonsOpen]   = useState(true)
  const [notesOpen,     setNotesOpen]     = useState(false)

  const prevStatus = useRef<Status | null>(null)

  /* ── Open: build scaffold + fetch remote data ───────────── */
  useEffect(() => {
    if (!sheet) { setLocalItem(null); setProviders([]); setSeasons([]); return }
    const { result, item } = sheet

    const existingItem = item ?? library[result.id] ?? null
    const isNewItem    = !existingItem

    const scaffold: LocalItem = existingItem
      ? { ...existingItem, seasonData: existingItem.seasonData ?? {} }
      : {
          id:         result.id,
          mediaType:  result.media_type,
          type:       getLibraryType(result),
          title:      getTitle(result),
          year:       getYear(result),
          poster:     result.poster_path || null,
          tmdbRating: formatRating(result.vote_average),
          status:     'pending',
          seasonData: {},
          addedAt:    Date.now(),
          _isNew:     true,
        }

    setLocalItem(scaffold)
    prevStatus.current = scaffold.status

    /* Default collapsibles */
    setMyRatingsOpen(true)
    setSeasonsOpen((scaffold.status ?? 'pending') !== 'watched')
    setProvidersOpen(false)
    setNotesOpen(Boolean(scaffold.notes))

    setLoadingData(true)
    Promise.all([
      getWatchProviders(result.media_type, result.id, settings.region),
      result.media_type === 'tv'
        ? getTVSeasons(result.id)
        : Promise.resolve<TMDBSeason[]>([]),
    ]).then(([prov, seas]) => {
      setProviders(prov)
      setSeasons(seas)
    }).finally(() => setLoadingData(false))
  }, [sheet, settings.region, library])

  const update = useCallback((patch: Partial<LibraryItem>) => {
    setLocalItem(p => {
      if (!p) return p
      const next: LocalItem = { ...p, ...patch }
      if (patch.status) {
        delete next._isNew
        setSeasonsOpen(patch.status !== 'watched')
        prevStatus.current = patch.status
      }
      return next
    })
  }, [])

  const updateSeasonRating = useCallback((sNum: number, rating: number | undefined) => {
    setLocalItem(p => {
      if (!p) return p
      const sd = { ...(p.seasonData ?? {}) }
      sd[String(sNum)] = { ...(sd[String(sNum)] ?? { episodes: {} }), rating }
      return { ...p, seasonData: sd }
    })
  }, [])

  const toggleEpisode = useCallback((sNum: number, ep: number) => {
    setLocalItem(p => {
      if (!p) return p
      const sd  = { ...(p.seasonData ?? {}) }
      const old = sd[String(sNum)] ?? { episodes: {} }
      sd[String(sNum)] = { ...old, episodes: { ...old.episodes, [String(ep)]: !old.episodes[String(ep)] } }
      return { ...p, seasonData: sd }
    })
  }, [])

  const autoFillUpTo = useCallback((sNum: number, ep: number) => {
    setLocalItem(p => {
      if (!p) return p
      const sd  = { ...(p.seasonData ?? {}) }
      const old = sd[String(sNum)] ?? { episodes: {} }
      const eps = { ...old.episodes }
      const allWatched = Array.from({ length: ep }, (_, i) => i + 1).every(n => eps[String(n)])
      for (let i = 1; i <= ep; i++) eps[String(i)] = !allWatched
      sd[String(sNum)] = { ...old, episodes: eps }
      return { ...p, seasonData: sd }
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!localItem) return
    const toSave: LibraryItem = { ...localItem }
    delete (toSave as LocalItem)._isNew
    await upsertItem({ ...toSave, updatedAt: Date.now() })
    showToast('Saved to library')
    closeSheet()
  }, [localItem, upsertItem, showToast, closeSheet])

  const handleRemove = useCallback(async () => {
    if (!localItem) return
    await removeItem(localItem.id)
    showToast('Removed from library')
    closeSheet()
  }, [localItem, removeItem, showToast, closeSheet])

  if (!sheet || !localItem) return null

  const { result } = sheet
  const inLibrary  = Boolean(library[localItem.id])
  const isNew      = Boolean(localItem._isNew)
  const isTV       = result.media_type === 'tv'
  const posterSrc  = posterUrl(localItem.poster, 'w185')
  const typeLabel  = result.media_type === 'movie' ? 'Movie' : localItem.type === 'anime' ? 'Anime' : 'Series'

  /* Season accordion default: open when watching/pending */
  const accordionDefault = (localItem.status ?? 'pending') !== 'watched'

  /* Season average for informational display */
  const seasonRatings = Object.values(localItem.seasonData ?? {})
    .map(s => s.rating).filter((r): r is number => r !== undefined)
  const seasonAvg = seasonRatings.length
    ? seasonRatings.reduce((a, b) => a + b, 0) / seasonRatings.length
    : undefined

  return (
    <div
      className="absolute inset-0 z-50 flex items-end animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.82)' }}
      onClick={closeSheet}
    >
      <div
        className="w-full rounded-t-[22px] overflow-y-auto animate-slide-up"
        style={{
          background: 'var(--sheet-bg)',
          maxHeight: '91dvh',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '12px auto 0' }} />

        {/* ── Item header ── */}
        <div className="flex gap-3 px-4 pt-3 pb-3">
          <div
            className="flex-shrink-0 rounded-[9px] overflow-hidden flex items-center justify-center"
            style={{ width: 58, height: 86, background: 'var(--dp-red)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {posterSrc
              ? <Image src={posterSrc} alt={localItem.title} width={58} height={86} className="w-full h-full object-cover" unoptimized />
              : <span style={{ fontSize: 26 }}>{localItem.type === 'movies' ? '🎬' : localItem.type === 'anime' ? '⛩️' : '📺'}</span>
            }
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h2 className="font-black text-white leading-snug pr-6" style={{ fontSize: 16 }}>{localItem.title}</h2>
            <div className="flex items-center gap-1.5 mt-1.5 mb-2">
              <span style={{ color: '#fbbf24', fontSize: 13 }}>★</span>
              <span className="font-black tabular-nums" style={{ color: '#fde68a', fontSize: 14 }}>{localItem.tmdbRating}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>/10 TMDB</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {inLibrary && !isNew && <StatusBadge status={localItem.status || 'pending'} />}
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>
                {localItem.year}{localItem.year ? ' · ' : ''}{typeLabel}
              </span>
            </div>
          </div>
          <button
            onClick={closeSheet}
            className="self-start flex items-center justify-center rounded-full"
            style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)', fontSize: 18, marginTop: 2 }}
          >
            ×
          </button>
        </div>

        <Divider />

        {/* ── Status ── */}
        <div className="px-4 py-3">
          <p className="font-black text-white uppercase tracking-widest mb-2.5" style={{ fontSize: 10 }}>Status</p>
          <div className="flex gap-2">
            {STATUS_OPTS.map(opt => {
              const isActive = !isNew && localItem.status === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => update({ status: opt.id })}
                  className={`flex-1 py-2.5 rounded-[10px] border text-[12px] transition-all duration-150 ${isActive ? opt.active : opt.idle}`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <Divider />

        {/* ── Watch providers (collapsible) ── */}
        <div style={{ background: 'var(--dp-brown)' }}>
          <SectionHeader
            label={`Watch in ${settings.region}`}
            open={providersOpen}
            onToggle={() => setProvidersOpen(v => !v)}
            right={loadingData ? 'loading…' : providers.length > 0 ? `${providers.length} services` : 'none found'}
          />
          <Collapsible open={providersOpen}>
            <div className="px-4 pb-4">
              {loadingData
                ? <div className="flex items-center gap-2 text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}><Spinner /> Loading…</div>
                : providers.length === 0
                  ? <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Not available in {settings.region}.</p>
                  : <div className="flex flex-wrap gap-1.5">
                      {providers.map(p => (
                        <div key={p.provider_id} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                          style={{ background: 'var(--dp-red)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {p.logo_path && (
                            <Image src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
                              alt={p.provider_name} width={18} height={18}
                              className="rounded-[3px]" unoptimized />
                          )}
                          <span style={{ fontSize: 11, color: '#fff' }}>{p.provider_name}</span>
                        </div>
                      ))}
                    </div>
              }
            </div>
          </Collapsible>
        </div>

        <Divider />

        {/* ── MY RATINGS — global slider, independent section ── */}
        <div style={{ background: 'var(--dp-red)' }}>
          <SectionHeader
            label="My Ratings"
            open={myRatingsOpen}
            onToggle={() => setMyRatingsOpen(v => !v)}
            right={localItem.userRating !== undefined ? `Global: ${localItem.userRating.toFixed(1)}` : undefined}
          />
          <Collapsible open={myRatingsOpen}>
            <div className="px-4 pb-5">
              <div
                className="rounded-[14px] p-4"
                style={{ background: 'var(--dp-brown-2)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <FluidSlider
                  value={localItem.userRating}
                  onChange={v => update({ userRating: v })}
                  label={isTV ? 'Global Show Rating (manual)' : 'Your Rating'}
                />
                {isTV && seasonAvg !== undefined && (
                  <p className="mt-2" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                    Season avg: {seasonAvg.toFixed(1)} — your global rating is independent
                  </p>
                )}
              </div>
            </div>
          </Collapsible>
        </div>

        <Divider />

        {/* ── SEASONS — episodes + per-season ratings (TV only) ── */}
        {isTV && seasons.length > 0 && (
          <>
            <div style={{ background: 'var(--dp-brown)' }}>
              <SectionHeader
                label="Seasons — Episodes & Ratings"
                open={seasonsOpen}
                onToggle={() => setSeasonsOpen(v => !v)}
                right={localItem.status === 'watched' ? 'tap to expand' : undefined}
              />
              <Collapsible open={seasonsOpen}>
                <div className="px-4 pb-4 flex flex-col gap-3">
                  {seasons.slice(0, 15).map(season => {
                    const sd = localItem.seasonData?.[String(season.season_number)] ?? { episodes: {} }
                    return (
                      <SeasonAccordion
                        key={season.season_number}
                        season={season}
                        episodes={sd.episodes}
                        rating={sd.rating}
                        defaultOpen={accordionDefault}
                        onToggleEp={ep => toggleEpisode(season.season_number, ep)}
                        onAutoFill={ep => autoFillUpTo(season.season_number, ep)}
                        onRating={v => updateSeasonRating(season.season_number, v)}
                      />
                    )
                  })}
                  {seasons.length > 15 && (
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', textAlign: 'center', paddingBottom: 4 }}>
                      Showing 15 of {seasons.length} seasons
                    </p>
                  )}
                </div>
              </Collapsible>
            </div>
            <Divider />
          </>
        )}

        {/* ── Private notes (collapsible) ── */}
        <div>
          <SectionHeader
            label="Private Notes"
            open={notesOpen}
            onToggle={() => setNotesOpen(v => !v)}
            right={localItem.notes ? `${localItem.notes.length} chars` : 'tap to add'}
          />
          <Collapsible open={notesOpen}>
            <div className="px-4 pb-4">
              <textarea
                value={localItem.notes || ''}
                onChange={e => update({ notes: e.target.value })}
                placeholder="Your thoughts, spoilers, recommendations…"
                rows={4}
                className="w-full rounded-[10px] px-3 py-2.5 text-[13px] text-white placeholder:text-white/22 leading-relaxed resize-none"
                style={{ background: 'var(--dp-brown)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
          </Collapsible>
        </div>

        <Divider />

        {/* ── Action buttons — side by side ── */}
        <div className="px-4 pt-3 flex gap-2.5">
          <button
            onClick={handleSave}
            className="flex-1 rounded-[13px] font-black text-white active:opacity-75 transition-opacity"
            style={{ padding: '14px 0', fontSize: 15, background: 'linear-gradient(135deg,#b8761a 0%,var(--orange) 100%)' }}
          >
            Save
          </button>
          {inLibrary && (
            <button
              onClick={handleRemove}
              className="flex-1 rounded-[13px] font-bold active:opacity-75 transition-opacity border"
              style={{ padding: '14px 0', fontSize: 14, color: '#fca5a5', background: 'var(--dp-red-2)', borderColor: 'rgba(220,38,38,0.3)' }}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
