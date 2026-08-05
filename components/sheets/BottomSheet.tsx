'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useStore } from '@/lib/store'
import {
  posterUrl, getTitle, getYear, formatRating,
  getWatchProviders, getTVSeasons, getLibraryType,
} from '@/lib/tmdb'
import { hydrateItem, combinedScore } from '@/lib/mediaSync'
import type { TMDBProvider, TMDBSeason, LibraryItem, Status, DrawerTab } from '@/lib/types'
import FluidSlider from './FluidSlider'
import StatusBadge from '../ui/StatusBadge'

type LocalItem = LibraryItem & { _isNew?: boolean }

/* ── Atoms ─────────────────────────────────────────────────── */
const Divider = () => <div style={{ height: 1, background: 'var(--border-dim)' }} />

function Spinner() {
  return (
    <span className="inline-block rounded-full" aria-hidden="true"
      style={{ width: 14, height: 14, border: '2px solid var(--border)', borderTopColor: 'rgba(255,255,255,0.5)', animation: 'spin 0.7s linear infinite' }} />
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="rgba(148,163,184,0.7)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s ease', flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function SectionHead({ label, open, onToggle, right, id }: {
  label: string; open: boolean; onToggle: () => void; right?: string; id: string
}) {
  return (
    <button onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 transition-opacity active:opacity-60"
      aria-expanded={open} aria-controls={id}>
      <div className="flex items-center gap-2">
        <span className="font-black text-white uppercase tracking-widest" style={{ fontSize: 11 }}>{label}</span>
        {right && <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{right}</span>}
      </div>
      <Chevron open={open} />
    </button>
  )
}

function Collapse({ open, id, children }: { open: boolean; id: string; children: React.ReactNode }) {
  return (
    <div id={id} role="region"
      style={{ overflow: 'hidden', maxHeight: open ? 9999 : 0, opacity: open ? 1 : 0, transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease' }}>
      {children}
    </div>
  )
}

/* ── Unsaved-changes modal ─────────────────────────────────── */
function DirtyModal({ onSave, onDiscard, onCancel }: {
  onSave: () => void; onDiscard: () => void; onCancel: () => void
}) {
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center px-6 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.72)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-overlay)' }}>
        <div className="flex flex-col gap-1">
          <h3 className="font-black text-white" style={{ fontSize: 16 }}>¿Guardar cambios?</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>Tienes cambios sin guardar en este título.</p>
        </div>
        <div className="flex flex-col gap-2">
          {/* Primary action — ONLY place sun yellow is used here */}
          <button onClick={onSave}
            className="w-full rounded-xl font-black text-black transition-opacity active:opacity-75"
            style={{ padding: '13px 0', fontSize: 14, background: 'var(--sun)', minHeight: 44 }}>
            Guardar y Salir
          </button>
          <button onClick={onDiscard}
            className="w-full rounded-xl font-bold transition-opacity active:opacity-75"
            style={{ padding: '13px 0', fontSize: 14, color: '#ef8c86', background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.20)', minHeight: 44 }}>
            Descartar cambios
          </button>
          {/* Cancel — only hides modal, leaves drawer open */}
          <button onClick={onCancel}
            className="w-full rounded-xl font-semibold transition-opacity active:opacity-75"
            style={{ padding: '13px 0', fontSize: 14, color: 'rgba(148,163,184,0.8)', background: 'var(--surface-3)', border: '1px solid var(--border-dim)', minHeight: 44 }}>
            Cancelar y seguir editando
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Critic ratings — third-party brand colours PRESERVED ─── */
function CriticRatings({ tmdbRating, imdbRating, rottenTomatoes, metacritic, rated, runtime, loading }: {
  tmdbRating: string; imdbRating?: string; rottenTomatoes?: string
  metacritic?: string; rated?: string; runtime?: string; loading: boolean
}) {
  const rtNum  = rottenTomatoes ? rottenTomatoes.replace('%', '').trim() : null
  const mcNum  = metacritic ? metacritic.split('/')[0].trim() : null
  const hasAny = imdbRating || rottenTomatoes || metacritic
  return (
    <div className="flex flex-col gap-3">
      {loading && !hasAny && (
        <div className="flex items-center gap-2">
          <Spinner />
          <div className="flex gap-2">
            {[60, 52, 56].map((w, i) => <div key={i} className="skeleton rounded-lg" style={{ width: w, height: 28 }} aria-hidden="true" />)}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2" role="list" aria-label="Critic ratings">
        {/* TMDB #01B4E4 — preserved */}
        <div role="listitem" className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
          style={{ background: 'rgba(1,180,228,0.12)', border: '1px solid rgba(1,180,228,0.28)' }}
          aria-label={`TMDB ${tmdbRating}`}>
          <span style={{ fontSize: 11, color: '#01B4E4' }} aria-hidden="true">★</span>
          <span className="font-bold tabular-nums" style={{ fontSize: 12, color: '#01B4E4' }}>{tmdbRating}</span>
          <span style={{ fontSize: 9, color: 'rgba(1,180,228,0.55)', fontWeight: 700 }}>TMDB</span>
        </div>
        {/* IMDb #F5C518 — preserved */}
        {imdbRating && (
          <div role="listitem" className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
            style={{ background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.30)' }}
            aria-label={`IMDb ${imdbRating}`}>
            <div className="flex items-center justify-center rounded font-black select-none"
              style={{ width: 26, height: 13, background: '#F5C518', color: '#000', fontSize: 7 }} aria-hidden="true">IMDb</div>
            <span className="font-bold tabular-nums" style={{ fontSize: 12, color: '#F5C518' }}>
              {imdbRating}<span style={{ fontSize: 9, color: 'rgba(245,197,24,0.55)' }}>/10</span>
            </span>
          </div>
        )}
        {/* RT #FA320A — preserved */}
        {rtNum && (
          <div role="listitem" className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
            style={{ background: 'rgba(250,50,10,0.12)', border: '1px solid rgba(250,50,10,0.28)' }}
            aria-label={`Rotten Tomatoes ${rtNum}%`}>
            <span style={{ fontSize: 12, lineHeight: 1 }} aria-hidden="true">🍅</span>
            <span className="font-bold tabular-nums" style={{ fontSize: 12, color: '#FA320A' }}>
              {rtNum}<span style={{ fontSize: 9, color: 'rgba(250,50,10,0.55)' }}>%</span>
            </span>
          </div>
        )}
        {/* MC #6CCE23 — preserved */}
        {mcNum && (
          <div role="listitem" className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
            style={{ background: 'rgba(108,206,35,0.10)', border: '1px solid rgba(108,206,35,0.28)' }}
            aria-label={`Metacritic ${mcNum}`}>
            <div className="flex items-center justify-center rounded font-black select-none"
              style={{ width: 13, height: 13, background: '#6CCE23', color: '#000', fontSize: 7 }} aria-hidden="true">M</div>
            <span className="font-bold tabular-nums" style={{ fontSize: 12, color: '#6CCE23' }}>{mcNum}</span>
            <span style={{ fontSize: 9, color: 'rgba(108,206,35,0.55)', fontWeight: 700 }}>MC</span>
          </div>
        )}
      </div>
      {(rated || runtime) && (
        <div className="flex items-center gap-2 flex-wrap">
          {rated && (
            <span className="rounded font-bold uppercase"
              style={{ fontSize: 9, color: 'var(--text-muted)', background: 'var(--surface-3)', padding: '2px 6px', letterSpacing: '0.05em', border: '1px solid var(--border-dim)' }}>
              {rated}
            </span>
          )}
          {runtime && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{runtime}</span>}
        </div>
      )}
      {!loading && !hasAny && <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>No critic scores available.</p>}
    </div>
  )
}

/* ── Episode grid ──────────────────────────────────────────── */
function EpisodeGrid({ total, episodes, onToggle, onAutoFill }: {
  total: number; episodes: Record<string, boolean>
  onToggle: (ep: number) => void; onAutoFill: (ep: number) => void
}) {
  const [shown, setShown] = useState(Math.min(total, 40))
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  useEffect(() => { setShown(Math.min(total, 40)) }, [total])

  const handleClick = (ep: number) => {
    if (timers.current[ep]) {
      clearTimeout(timers.current[ep]); delete timers.current[ep]; onAutoFill(ep)
    } else {
      timers.current[ep] = setTimeout(() => { delete timers.current[ep]; onToggle(ep) }, 230)
    }
  }
  const remaining = total - shown
  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Episode checklist">
        {Array.from({ length: shown }, (_, i) => i + 1).map(ep => {
          const w = Boolean(episodes[String(ep)])
          return (
            <button key={ep} onClick={() => handleClick(ep)} className="ep-btn rounded-md border font-bold tabular-nums"
              aria-label={`Ep ${ep}${w ? ' (watched)' : ''}`} aria-pressed={w}
              style={{
                width: 28, height: 28, fontSize: 10,
                /* Watched eps: white pill; unwatched: dark neutral */
                background:  w ? 'rgba(255,255,255,0.14)' : 'var(--surface-3)',
                borderColor: w ? 'rgba(255,255,255,0.30)' : 'var(--border-dim)',
                color:       w ? '#FFFFFF'                : 'var(--text-faint)',
              }}>
              {ep}
            </button>
          )
        })}
      </div>
      {remaining > 0 && (
        <button onClick={() => setShown(total)}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg transition-opacity active:opacity-60"
          style={{ padding: '8px 12px', background: 'var(--surface-3)', border: '1px solid var(--border-dim)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-muted)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
            Show More (+{remaining} episode{remaining !== 1 ? 's' : ''})
          </span>
        </button>
      )}
      {shown > 40 && (
        <button onClick={() => setShown(40)} className="mt-1 w-full text-center transition-opacity active:opacity-60"
          style={{ fontSize: 10, color: 'var(--text-faint)', padding: '4px' }}>Show less ↑</button>
      )}
    </div>
  )
}

/* ── Season accordion ──────────────────────────────────────── */
function SeasonAccordion({ season, episodes, rating, defaultOpen, onToggleEp, onAutoFill, onRating }: {
  season: TMDBSeason; episodes: Record<string, boolean>; rating: number | undefined; defaultOpen: boolean
  onToggleEp: (ep: number) => void; onAutoFill: (ep: number) => void; onRating: (v: number | undefined) => void
}) {
  const [open, setOpen] = useState(defaultOpen)
  useEffect(() => { setOpen(defaultOpen) }, [defaultOpen])
  const done  = Object.values(episodes).filter(Boolean).length
  const label = season.name || `Season ${season.season_number}`
  const id    = `s-${season.season_number}`
  return (
    <div className="rounded-lg overflow-hidden"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-dim)' }}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 transition-opacity active:opacity-70"
        aria-expanded={open} aria-controls={id}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="font-bold text-white truncate" style={{ fontSize: 13 }}>{label}</span>
          <span className="tabular-nums font-medium flex-shrink-0"
            style={{ fontSize: 10, color: 'var(--text-faint)' }}>{done}/{season.episode_count}</span>
          {rating !== undefined && (
            /* Season rating — sun yellow because it IS a rating number */
            <span className="font-bold tabular-nums flex-shrink-0"
              style={{ fontSize: 10, color: 'var(--sun)' }}>★ {rating.toFixed(1)}</span>
          )}
        </div>
        <Chevron open={open} />
      </button>
      <Collapse open={open} id={id}>
        <div className="px-4 pb-4 flex flex-col gap-4">
          <div>
            <p className="font-bold uppercase tracking-widest mb-2"
              style={{ fontSize: 9, color: 'var(--text-faint)' }}>Episodes · double-tap to fill up to</p>
            <EpisodeGrid total={season.episode_count} episodes={episodes}
              onToggle={onToggleEp} onAutoFill={onAutoFill} />
          </div>
          <div className="rounded-lg p-3"
            style={{ background: 'var(--surface-3)', border: '1px solid var(--border-dim)' }}>
            <FluidSlider value={rating} onChange={onRating} label={`${label} rating`} compact />
          </div>
        </div>
      </Collapse>
    </div>
  )
}

/* ── Drawer tab config ─────────────────────────────────────── */
const DRAWER_TABS: { id: DrawerTab; label: string }[] = [
  { id: 'overview',  label: 'Overview'    },
  { id: 'tracking',  label: 'Mi Tracking' },
  { id: 'seasons',   label: 'Temporadas'  },
]

/* Nordic Minimal status toggle button styles */
const STATUS_BTNS: { id: Status; label: string }[] = [
  { id: 'watching', label: 'Viendo'    },
  { id: 'pending',  label: 'Pendiente' },
  { id: 'watched',  label: 'Visto'     },
]
const STATUS_ACTIVE: Record<Status, React.CSSProperties> = {
  watching: { background: 'rgba(16,185,129,0.18)',  color: '#34d399', borderColor: 'rgba(16,185,129,0.40)',  fontWeight: 700 },
  pending:  { background: 'rgba(180,83,9,0.22)',    color: '#fca56a', borderColor: 'rgba(180,83,9,0.38)',   fontWeight: 700 },
  watched:  { background: 'rgba(99,102,241,0.20)', color: '#a5b4fc', borderColor: 'rgba(99,102,241,0.35)', fontWeight: 700 },
}
const STATUS_IDLE: React.CSSProperties = {
  background: '#141D38',
  color:      'rgba(148,163,184,0.65)',
  borderColor: 'rgba(30,43,74,0.9)',
}

/* ── Main BottomSheet ──────────────────────────────────────── */
export default function BottomSheet() {
  const { sheet, closeSheet, upsertItem, removeItem, showToast, settings, library } = useStore()

  const [localItem,   setLocalItem]   = useState<LocalItem | null>(null)
  const [providers,   setProviders]   = useState<TMDBProvider[]>([])
  const [seasons,     setSeasons]     = useState<TMDBSeason[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [loadingOmdb, setLoadingOmdb] = useState(false)
  const [activeTab,   setActiveTab]   = useState<DrawerTab>('overview')
  const [isDirty,     setIsDirty]     = useState(false)
  const [showDirty,   setShowDirty]   = useState(false)
  // Ref mirrors isDirty so requestClose always reads the current value
  // even when called from stale closures (backdrop onClick, ESC handler)
  const isDirtyRef = useRef(false)
  const [providersOpen, setProvidersOpen] = useState(true)
  const [criticOpen,    setCriticOpen]    = useState(true)

  const touchStartY  = useRef<number | null>(null)
  const pendingClose = useRef<(() => void) | null>(null)

  // Use isDirtyRef (not isDirty state) so backdrop/ESC closures always
  // read the current value regardless of when they were created.
  const requestClose = useCallback((afterClose?: () => void) => {
    if (isDirtyRef.current) {
      pendingClose.current = afterClose ?? null
      setShowDirty(true)
    } else {
      afterClose?.()
      closeSheet()
    }
  }, [closeSheet])  // isDirtyRef is a ref — stable, no dep needed

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && sheet) requestClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [sheet, requestClose])

  useEffect(() => {
    if (!sheet) { setLocalItem(null); setProviders([]); setSeasons([]); setIsDirty(false); isDirtyRef.current = false; setShowDirty(false); return }
    const { result, item } = sheet
    const existingItem = item ?? library[result.id] ?? null

    const scaffold: LocalItem = existingItem
      ? { ...existingItem, seasonData: existingItem.seasonData ?? {} }
      : {
          id: result.id, mediaType: result.media_type, type: getLibraryType(result),
          title: getTitle(result), year: getYear(result), poster: result.poster_path || null,
          tmdbRating: formatRating(result.vote_average),
          status: null,   // always null for new items
          seasonData: {}, addedAt: Date.now(), _isNew: true,
        }

    setLocalItem(scaffold)
    setIsDirty(false); setShowDirty(false)
    setActiveTab('overview')
    setProvidersOpen(true); setCriticOpen(true)

    setLoadingData(true)
    Promise.all([
      getWatchProviders(result.media_type, result.id, settings.region),
      result.media_type === 'tv' ? getTVSeasons(result.id) : Promise.resolve<TMDBSeason[]>([]),
    ]).then(([prov, seas]) => { setProviders(prov); setSeasons(seas) })
      .finally(() => setLoadingData(false))

    if (!scaffold.imdbRating && !scaffold.imdbId) {
      setLoadingOmdb(true)
      hydrateItem(result.media_type, result.id, scaffold.poster)
        .then(async fields => {
          if (!fields.imdbRating && !fields.imdbId) return
          setLocalItem(prev => {
            if (!prev) return prev
            return { ...prev,
              ...(fields.poster         && { poster:         fields.poster         }),
              ...(fields.tmdbRating     && { tmdbRating:     fields.tmdbRating     }),
              ...(fields.imdbId         && { imdbId:         fields.imdbId         }),
              ...(fields.imdbRating     && { imdbRating:     fields.imdbRating     }),
              ...(fields.rottenTomatoes && { rottenTomatoes: fields.rottenTomatoes }),
              ...(fields.metacritic     && { metacritic:     fields.metacritic     }),
              ...(fields.rated          && { rated:          fields.rated          }),
              ...(fields.runtime        && { runtime:        fields.runtime        }),
              ...(fields.director       && { director:       fields.director       }),
            }
          })
          const enriched: LibraryItem = { ...scaffold,
            ...(fields.poster         && { poster:         fields.poster         }),
            ...(fields.tmdbRating     && { tmdbRating:     fields.tmdbRating     }),
            ...(fields.imdbId         && { imdbId:         fields.imdbId         }),
            ...(fields.imdbRating     && { imdbRating:     fields.imdbRating     }),
            ...(fields.rottenTomatoes && { rottenTomatoes: fields.rottenTomatoes }),
            ...(fields.metacritic     && { metacritic:     fields.metacritic     }),
            ...(fields.rated          && { rated:          fields.rated          }),
            ...(fields.runtime        && { runtime:        fields.runtime        }),
            ...(fields.director       && { director:       fields.director       }),
            updatedAt: Date.now(),
          }
          delete (enriched as LocalItem)._isNew
          await upsertItem(enriched)
        })
        .catch(() => {})
        .finally(() => setLoadingOmdb(false))
    }
  }, [sheet, settings.region, library])

  const markDirty = useCallback(() => {
    setIsDirty(true)
    isDirtyRef.current = true
  }, [])

  const update = useCallback((patch: Partial<LibraryItem>) => {
    setLocalItem(p => p ? { ...p, ...patch } : p)
    markDirty()
  }, [markDirty])

  const toggleStatus = useCallback((s: Status) => {
    setLocalItem(p => { if (!p) return p; return { ...p, status: p.status === s ? null : s } })
    markDirty()
  }, [markDirty])

  const updateSeasonRating = useCallback((sNum: number, rating: number | undefined) => {
    setLocalItem(p => {
      if (!p) return p
      const sd = { ...(p.seasonData ?? {}) }
      sd[String(sNum)] = { ...(sd[String(sNum)] ?? { episodes: {} }), rating }
      return { ...p, seasonData: sd }
    })
    markDirty()
  }, [markDirty])

  const toggleEpisode = useCallback((sNum: number, ep: number) => {
    setLocalItem(p => {
      if (!p) return p
      const sd = { ...(p.seasonData ?? {}) }
      const old = sd[String(sNum)] ?? { episodes: {} }
      sd[String(sNum)] = { ...old, episodes: { ...old.episodes, [String(ep)]: !old.episodes[String(ep)] } }
      return { ...p, seasonData: sd }
    })
    markDirty()
  }, [markDirty])

  const autoFillUpTo = useCallback((sNum: number, ep: number) => {
    setLocalItem(p => {
      if (!p) return p
      const sd = { ...(p.seasonData ?? {}) }
      const old = sd[String(sNum)] ?? { episodes: {} }
      const eps = { ...old.episodes }
      const allWatched = Array.from({ length: ep }, (_, i) => i + 1).every(n => eps[String(n)])
      for (let i = 1; i <= ep; i++) eps[String(i)] = !allWatched
      sd[String(sNum)] = { ...old, episodes: eps }
      return { ...p, seasonData: sd }
    })
    markDirty()
  }, [markDirty])

  const doSave = useCallback(async () => {
    if (!localItem) return
    const toSave: LibraryItem = { ...localItem }
    delete (toSave as LocalItem)._isNew
    await upsertItem({ ...toSave, updatedAt: Date.now() })
    setIsDirty(false)
    isDirtyRef.current = false
    showToast('Saved to library')
  }, [localItem, upsertItem, showToast])

  const handleSave    = useCallback(async () => { await doSave(); closeSheet() }, [doSave, closeSheet])
  const handleRemove  = useCallback(async () => {
    if (!localItem) return
    await removeItem(localItem.id); showToast('Removed from library')
    setIsDirty(false)
    isDirtyRef.current = false
    closeSheet()
  }, [localItem, removeItem, showToast, closeSheet])

  const handleDirtySave = useCallback(async () => {
    await doSave()
    setShowDirty(false)
    pendingClose.current?.(); pendingClose.current = null
    closeSheet()
  }, [doSave, closeSheet])

  const handleDirtyDiscard = useCallback(() => {
    setIsDirty(false)
    isDirtyRef.current = false
    setShowDirty(false)
    pendingClose.current?.(); pendingClose.current = null
    closeSheet()
  }, [closeSheet])

  /* Cancel — hides the modal, leaves drawer open with all edits intact.
     isDirtyRef is NOT reset here so a future close attempt re-triggers the modal. */
  const handleDirtyCancel = useCallback(() => {
    setShowDirty(false)      // close modal
    pendingClose.current = null  // discard queued close action
    // isDirty stays true — drawer stays open — edits preserved
  }, [])

  if (!sheet || !localItem) return null

  const { result }       = sheet
  const inLibrary        = Boolean(library[localItem.id])
  const isTV             = result.media_type === 'tv'
  const posterSrc        = posterUrl(localItem.poster, 'w185')
  const typeLabel        = result.media_type === 'movie' ? 'Movie' : localItem.type === 'anime' ? 'Anime' : 'Series'
  const accordionDefault = localItem.status !== 'watched'
  const headerScore      = combinedScore(localItem.tmdbRating, localItem.imdbRating)
  const scoreIsAvg       = Boolean(localItem.imdbRating)

  const seasonRatings = Object.values(localItem.seasonData ?? {}).map(s => s.rating).filter((r): r is number => r !== undefined)
  const seasonAvg = seasonRatings.length ? seasonRatings.reduce((a, b) => a + b, 0) / seasonRatings.length : undefined

  return (
    <div className="absolute inset-0 z-50 flex items-end animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={() => requestClose()}
      role="dialog" aria-modal="true" aria-label={`Details for ${localItem.title}`}>

      <div className="w-full overflow-y-auto animate-slide-up"
        style={{ background: 'var(--sheet-bg)', borderRadius: '20px 20px 0 0', maxHeight: '92dvh', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 16px)', boxShadow: 'var(--shadow-overlay)' }}
        onClick={e => e.stopPropagation()}
        onTouchStart={e => { touchStartY.current = e.touches[0].clientY }}
        onTouchEnd={e => {
          if (touchStartY.current === null) return
          const dy = e.changedTouches[0].clientY - touchStartY.current
          touchStartY.current = null
          if (dy > 80) requestClose()
        }}>

        {/* Handle */}
        <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '10px auto 0' }} aria-hidden="true" />

        {/* ── HEADER: poster + title + scores ── */}
        <div className="flex gap-3 px-4 pt-3 pb-0">
          <div className="flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
            style={{ width: 52, height: 76, background: 'var(--surface-2)', border: '1px solid var(--border-dim)' }}>
            {posterSrc
              ? <Image src={posterSrc} alt={`${localItem.title} poster`} width={52} height={76} className="w-full h-full object-cover" unoptimized />
              : <span style={{ fontSize: 24 }} aria-hidden="true">{localItem.type === 'movies' ? '🎬' : localItem.type === 'anime' ? '⛩️' : '📺'}</span>}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h2 className="font-black text-white leading-snug pr-8" style={{ fontSize: 15 }}>{localItem.title}</h2>

            {/* Score row — sun ONLY for AVG, neutral for TMDB-only, blue for MY */}
            <div className="flex items-center gap-2 mt-1 mb-1.5 flex-wrap">
              {headerScore && (
                <div className="flex items-center gap-1 rounded-lg px-2 py-0.5"
                  style={{
                    background: scoreIsAvg ? 'rgba(252,219,50,0.10)' : 'rgba(255,255,255,0.06)',
                    border:     scoreIsAvg ? '1px solid rgba(252,219,50,0.25)' : '1px solid rgba(255,255,255,0.10)',
                  }}>
                  <span style={{ color: scoreIsAvg ? 'var(--sun)' : 'var(--text-muted)', fontSize: 11 }} aria-hidden="true">★</span>
                  <span className="font-black tabular-nums" style={{ color: scoreIsAvg ? 'var(--sun)' : 'var(--text-2)', fontSize: 12 }}>{headerScore}</span>
                  {scoreIsAvg
                    ? <span className="font-black uppercase" style={{ fontSize: 7, color: 'rgba(252,219,50,0.55)', letterSpacing: '0.06em' }} aria-label="avg">AVG</span>
                    : <span style={{ fontSize: 8, color: 'var(--text-faint)' }}>TMDB</span>}
                </div>
              )}

              {localItem.userRating !== undefined && (
                <>
                  {headerScore && <span style={{ color: 'var(--border)', fontSize: 11 }} aria-hidden="true">|</span>}
                  <div className="flex items-center gap-1 rounded-lg px-2 py-0.5"
                    style={{ background: 'rgba(125,164,199,0.10)', border: '1px solid rgba(125,164,199,0.22)' }}
                    aria-label={`My rating ${localItem.userRating.toFixed(1)}`}>
                    <span style={{ color: '#7da4c7', fontSize: 11 }} aria-hidden="true">♥</span>
                    <span className="font-black tabular-nums" style={{ color: '#7da4c7', fontSize: 12 }}>{localItem.userRating.toFixed(1)}</span>
                    <span className="font-black uppercase" style={{ fontSize: 7, color: 'rgba(125,164,199,0.55)', letterSpacing: '0.06em' }}>MY</span>
                  </div>
                </>
              )}

              {localItem.director && (
                <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>· {localItem.director}</span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={localItem.status} />
              <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{localItem.year}{localItem.year ? ' · ' : ''}{typeLabel}</span>
            </div>
          </div>

          <button onClick={() => requestClose()} aria-label="Close"
            className="self-start flex items-center justify-center rounded-full flex-shrink-0 transition-opacity active:opacity-50"
            style={{ width: 28, height: 28, background: 'var(--surface-3)', color: 'var(--text-muted)', fontSize: 18, border: '1px solid var(--border-dim)', marginTop: 2 }}>
            ×
          </button>
        </div>

        {/* ── Status toggles — Nordic Minimal ── */}
        <div className="flex gap-2 px-4 py-3">
          {STATUS_BTNS.map(btn => {
            const isActive = localItem.status === btn.id
            const style    = isActive ? STATUS_ACTIVE[btn.id] : STATUS_IDLE
            return (
              <button key={btn.id} onClick={() => toggleStatus(btn.id)} aria-pressed={isActive}
                className="flex-1 py-2 rounded-lg border text-[11px] transition-all duration-150 active:scale-95"
                style={{ ...style, borderWidth: 1, borderStyle: 'solid' }}>
                {btn.label}
              </button>
            )
          })}
        </div>

        {/* ── Segmented tab control ──
            Active tab: sun yellow bg (PRIMARY ACTION — the tab is what you're acting on)
            Inactive tabs: dark elevated, clearly readable, no yellow
        ── */}
        <div className="px-4 pb-3" role="tablist" aria-label="Drawer sections">
          <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: '#0D1628' }}>
            {DRAWER_TABS.map(t => {
              if (t.id === 'seasons' && !isTV) return null
              const active = activeTab === t.id
              return (
                <button key={t.id} role="tab" aria-selected={active} aria-controls={`dtab-${t.id}`}
                  onClick={() => setActiveTab(t.id)}
                  className="flex-1 rounded-lg py-2 text-[12px] font-bold transition-all duration-150 active:scale-95"
                  style={{
                    background:  active ? 'var(--sun)' : '#1A2542',
                    color:       active ? '#000'       : 'rgba(148,163,184,0.70)',
                    border:      active ? 'none'       : '1px solid rgba(255,255,255,0.07)',
                    boxShadow:   active ? '0 2px 8px rgba(252,219,50,0.30)' : 'none',
                  }}>
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Tab content — min-height prevents layout jumps ── */}
        <div style={{ minHeight: '52vh' }}>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div id="dtab-overview" role="tabpanel" aria-label="Overview" className="px-4 flex flex-col gap-4 pb-4">
              <div style={{ background: 'var(--surface-2)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-dim)' }}>
                <SectionHead label={`Watch in ${settings.region}`} open={providersOpen}
                  onToggle={() => setProvidersOpen(v => !v)} id="prov"
                  right={loadingData ? 'loading…' : providers.length > 0 ? `${providers.length} services` : 'none'} />
                <Collapse open={providersOpen} id="prov">
                  <div className="px-4 pb-4">
                    {loadingData
                      ? <div className="flex items-center gap-2" style={{ color: 'var(--text-faint)', fontSize: 12 }}><Spinner /> Loading…</div>
                      : providers.length === 0
                        ? <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>Not available in {settings.region}.</p>
                        : <div className="flex flex-wrap gap-1.5">
                            {providers.map(p => (
                              <div key={p.provider_id} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                                style={{ background: 'var(--surface-3)', border: '1px solid var(--border-dim)' }}>
                                {p.logo_path && <Image src={`https://image.tmdb.org/t/p/w45${p.logo_path}`} alt={p.provider_name} width={18} height={18} className="rounded" unoptimized />}
                                <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{p.provider_name}</span>
                              </div>
                            ))}
                          </div>}
                  </div>
                </Collapse>
              </div>

              <div style={{ background: 'var(--surface-2)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-dim)' }}>
                <SectionHead label="Critic Ratings" open={criticOpen}
                  onToggle={() => setCriticOpen(v => !v)} id="cr"
                  right={loadingOmdb ? 'loading…' : localItem.imdbRating ? `IMDb ${localItem.imdbRating}` : undefined} />
                <Collapse open={criticOpen} id="cr">
                  <div className="px-4 pb-4">
                    <CriticRatings
                      tmdbRating={localItem.tmdbRating} imdbRating={localItem.imdbRating}
                      rottenTomatoes={localItem.rottenTomatoes} metacritic={localItem.metacritic}
                      rated={localItem.rated} runtime={localItem.runtime} loading={loadingOmdb} />
                  </div>
                </Collapse>
              </div>
            </div>
          )}

          {/* TAB 2: MI TRACKING */}
          {activeTab === 'tracking' && (
            <div id="dtab-tracking" role="tabpanel" aria-label="Mi Tracking" className="px-4 flex flex-col gap-4 pb-4">
              <div className="rounded-xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-dim)' }}>
                <p className="font-black text-white uppercase tracking-widest mb-3" style={{ fontSize: 10 }}>
                  {isTV ? 'Global Show Rating' : 'My Rating'}
                </p>
                <FluidSlider value={localItem.userRating} onChange={v => update({ userRating: v })}
                  label={isTV ? 'Overall score (independent of seasons)' : undefined} />
                {isTV && seasonAvg !== undefined && (
                  <p className="mt-2" style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                    Season avg: {seasonAvg.toFixed(1)} — your global is set independently
                  </p>
                )}
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-dim)' }}>
                <p className="font-black text-white uppercase tracking-widest mb-3" style={{ fontSize: 10 }}>Private Notes</p>
                <textarea value={localItem.notes || ''} onChange={e => update({ notes: e.target.value })}
                  placeholder="Your thoughts, spoilers, recommendations…" aria-label="Private notes" rows={5}
                  className="w-full rounded-lg px-3 py-2.5 text-[13px] text-white resize-none"
                  style={{ background: 'var(--surface-3)', border: '1px solid var(--border-dim)', lineHeight: 1.6 }} />
              </div>
            </div>
          )}

          {/* TAB 3: TEMPORADAS */}
          {activeTab === 'seasons' && isTV && (
            <div id="dtab-seasons" role="tabpanel" aria-label="Temporadas y Episodios" className="px-4 flex flex-col gap-3 pb-4">
              {seasons.length === 0 && loadingData && (
                <div className="flex items-center gap-2" style={{ color: 'var(--text-faint)', fontSize: 12 }}>
                  <Spinner /> Loading seasons…
                </div>
              )}
              {seasons.length === 0 && !loadingData && (
                <p style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: '24px 0' }}>No season data available.</p>
              )}
              {seasons.slice(0, 15).map(season => {
                const sd = localItem.seasonData?.[String(season.season_number)] ?? { episodes: {} }
                return (
                  <SeasonAccordion key={season.season_number} season={season}
                    episodes={sd.episodes} rating={sd.rating} defaultOpen={accordionDefault}
                    onToggleEp={ep => toggleEpisode(season.season_number, ep)}
                    onAutoFill={ep => autoFillUpTo(season.season_number, ep)}
                    onRating={v => updateSeasonRating(season.season_number, v)} />
                )
              })}
              {seasons.length > 15 && (
                <p style={{ fontSize: 10, color: 'var(--text-faint)', textAlign: 'center' }}>
                  Showing 15 of {seasons.length} seasons
                </p>
              )}
            </div>
          )}
        </div>

        <Divider />

        {/* ── Action buttons — sun ONLY on Save (primary action) ── */}
        <div className="px-4 pt-3 flex gap-2.5">
          <button onClick={handleSave}
            className="flex-1 rounded-xl font-black text-black transition-opacity active:opacity-75"
            style={{ padding: '14px 0', fontSize: 15, background: 'var(--sun)', minHeight: 44 }}>
            {isDirty ? 'Guardar ●' : 'Guardar'}
          </button>
          {inLibrary && (
            <button onClick={handleRemove}
              className="flex-1 rounded-xl font-bold transition-opacity active:opacity-75"
              style={{ padding: '14px 0', fontSize: 14, color: '#ef8c86', background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.20)', minHeight: 44 }}>
              Eliminar
            </button>
          )}
        </div>
      </div>

      {showDirty && (
        <DirtyModal
          onSave={handleDirtySave}
          onDiscard={handleDirtyDiscard}
          onCancel={handleDirtyCancel}
        />
      )}
    </div>
  )
}
