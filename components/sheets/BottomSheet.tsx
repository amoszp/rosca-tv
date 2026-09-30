'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useStore } from '@/lib/store'
import {
  posterUrl, getTitle, getYear, formatRating,
  getWatchProviders, getTVSeasons, getLibraryType, getRecommendations,
} from '@/lib/tmdb'
import { hydrateItem, combinedScore } from '@/lib/mediaSync'
import type { TMDBProvider, TMDBSeason, TMDBResult, LibraryItem, Status } from '@/lib/types'
import { STATUS_STYLES } from '@/lib/statusStyles'
import { useT, statusLabel, type Translations } from '@/lib/i18n'
import MediaTypeIcon from '@/components/ui/MediaTypeIcon'
import PosterCard from '@/components/home/PosterCard'
import CategorySheet from '@/components/home/CategorySheet'

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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="var(--text-faint)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s ease', flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function IconEdit() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
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

/* ── Header Status Pill + Dropdown ────────────────────────── */
function StatusPill({ status, onChange, t }: {
  status: Status | null
  onChange: (s: Status | null) => void
  t: Translations
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const c = status ? STATUS_STYLES[status] : null
  const pillStyle: React.CSSProperties = c
    ? { background: c.bg, color: c.text, border: `1px solid ${c.border}` }
    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.7)', border: '1px solid rgba(255,255,255,0.10)' }

  return (
    <div ref={ref} className="relative flex-shrink-0" style={{ zIndex: 20 }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className="flex items-center gap-1.5 rounded-full font-semibold cursor-pointer transition-opacity active:opacity-70"
        style={{ ...pillStyle, fontSize: 10, padding: '3px 10px 3px 8px', minHeight: 24 }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={status ? t.status.tapToChange(t.status[status]) : t.status.setStatus}
      >
        {c
          ? <>
              <span className="rounded-full flex-shrink-0" style={{ width: 5, height: 5, background: c.dot }} aria-hidden="true" />
              {t.status[status as Status]}
            </>
          : <>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              {t.status.none}
            </>
        }
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
          style={{ opacity: 0.6, marginLeft: 1, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s ease' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 rounded-2xl overflow-hidden animate-pop glass-strong"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.6)', minWidth: 148, zIndex: 99 }}
          role="listbox"
          aria-label={t.status.setStatus}
          onClick={e => e.stopPropagation()}
        >
          {(Object.entries(STATUS_STYLES) as [Status, typeof STATUS_STYLES[Status]][]).map(([id, sc]) => {
            const isActive = status === id
            return (
              <button
                key={id}
                role="option"
                aria-selected={isActive}
                onClick={e => {
                  e.stopPropagation()
                  onChange(isActive ? null : id)
                  setOpen(false)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors text-left"
                style={{ background: isActive ? sc.bg : 'transparent', borderBottom: '1px solid var(--border-dim)' }}
              >
                <span className="rounded-full flex-shrink-0" style={{ width: 7, height: 7, background: sc.dot }} aria-hidden="true" />
                <span className="font-semibold flex-1" style={{ fontSize: 12, color: isActive ? sc.text : 'var(--text-2)' }}>
                  {t.status[id]}
                </span>
                {isActive && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={sc.text} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
          <button
            role="option"
            aria-selected={status === null}
            onClick={e => { e.stopPropagation(); onChange(null); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors text-left"
            style={{ background: status === null ? 'rgba(255,255,255,0.04)' : 'transparent' }}
          >
            <span className="rounded-full flex-shrink-0" style={{ width: 7, height: 7, background: 'rgba(148,163,184,0.3)' }} aria-hidden="true" />
            <span className="font-semibold flex-1" style={{ fontSize: 12, color: 'rgba(148,163,184,0.6)' }}>{t.status.removeStatus}</span>
            {status === null && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(148,163,184,0.6)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Unsaved-changes modal ─────────────────────────────────── */
function DirtyModal({ onSave, onDiscard, onCancel, t }: {
  onSave: () => void; onDiscard: () => void; onCancel: (e: React.MouseEvent) => void; t: Translations
}) {
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center px-6 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.72)' }}>
      <div className="w-full max-w-sm rounded-3xl p-6 flex flex-col gap-4 glass-strong"
        style={{ boxShadow: 'var(--shadow-overlay)' }}>
        <div className="flex flex-col gap-1">
          <h3 className="font-black text-white" style={{ fontSize: 16 }}>{t.sheet.saveChangesTitle}</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{t.sheet.saveChangesBody}</p>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={onSave}
            className="w-full rounded-2xl font-black transition-opacity active:opacity-80"
            style={{ padding: '13px 0', fontSize: 14, background: 'var(--accent-grad)', color: '#1A1030', minHeight: 44, boxShadow: 'var(--glow-accent)' }}>
            {t.sheet.saveAndExit}
          </button>
          <button onClick={onDiscard}
            className="w-full rounded-2xl font-bold transition-opacity active:opacity-75"
            style={{ padding: '13px 0', fontSize: 14, color: '#fb7185', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.20)', minHeight: 44 }}>
            {t.sheet.discardChanges}
          </button>
          {/* CRITICAL: stopPropagation + preventDefault prevent backdrop from closing the drawer */}
          <button
            onClick={e => { e.stopPropagation(); e.preventDefault(); onCancel(e) }}
            className="w-full rounded-2xl font-semibold transition-opacity active:opacity-75"
            style={{ padding: '13px 0', fontSize: 14, color: 'var(--text-muted)', background: 'var(--surface-3)', border: '1px solid var(--border-dim)', minHeight: 44 }}>
            {t.sheet.cancelKeepEditing}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Critic ratings — equal-weight stat cards ────────────────── */
function CriticRatings({ tmdbRating, imdbRating, rottenTomatoes, metacritic, rated, runtime, loading, t }: {
  tmdbRating: string; imdbRating?: string; rottenTomatoes?: string
  metacritic?: string; rated?: string; runtime?: string; loading: boolean; t: Translations
}) {
  const rtNum  = rottenTomatoes ? rottenTomatoes.replace('%', '').trim() : null
  const mcNum  = metacritic ? metacritic.split('/')[0].trim() : null
  const hasAny = imdbRating || rottenTomatoes || metacritic
  return (
    <div className="flex flex-col gap-3">
      {loading && !hasAny && (
        <div className="flex items-center gap-2">
          <Spinner />
          <div className="flex gap-2 flex-1">
            {[1, 1, 1].map((_, i) => <div key={i} className="skeleton rounded-2xl flex-1" style={{ height: 58 }} aria-hidden="true" />)}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-1.5" role="list" aria-label={t.sheet.criticRatingsAria}>
        {/* TMDB #01B4E4 — preserved brand colour */}
        <div role="listitem" className="flex flex-col items-center gap-0.5 rounded-xl"
          style={{ padding: '7px 4px', background: 'rgba(1,180,228,0.10)', border: '1px solid rgba(1,180,228,0.25)' }}
          aria-label={`TMDB ${tmdbRating}`}>
          <span className="font-black uppercase tracking-wide" style={{ fontSize: 7.5, color: 'rgba(1,180,228,0.75)' }}>TMDB</span>
          <span className="font-black tabular-nums" style={{ fontSize: 13, color: '#01B4E4' }}>{tmdbRating}</span>
        </div>
        {/* IMDb #F5C518 — preserved brand colour */}
        {imdbRating && (
          <div role="listitem" className="flex flex-col items-center gap-0.5 rounded-xl"
            style={{ padding: '7px 4px', background: 'rgba(245,197,24,0.10)', border: '1px solid rgba(245,197,24,0.28)' }}
            aria-label={`IMDb ${imdbRating}`}>
            <span className="font-black uppercase tracking-wide" style={{ fontSize: 7.5, color: 'rgba(245,197,24,0.80)' }}>IMDb</span>
            <span className="font-black tabular-nums" style={{ fontSize: 13, color: '#F5C518' }}>
              {imdbRating}<span style={{ fontSize: 8, color: 'rgba(245,197,24,0.55)' }}>/10</span>
            </span>
          </div>
        )}
        {/* RT #FA320A — preserved brand colour */}
        {rtNum && (
          <div role="listitem" className="flex flex-col items-center gap-0.5 rounded-xl"
            style={{ padding: '7px 4px', background: 'rgba(250,50,10,0.10)', border: '1px solid rgba(250,50,10,0.25)' }}
            aria-label={`Rotten Tomatoes ${rtNum}%`}>
            <span className="font-black uppercase tracking-wide text-center" style={{ fontSize: 7.5, color: 'rgba(250,50,10,0.75)' }}>RT</span>
            <span className="font-black tabular-nums" style={{ fontSize: 13, color: '#FA320A' }}>
              {rtNum}<span style={{ fontSize: 8, color: 'rgba(250,50,10,0.55)' }}>%</span>
            </span>
          </div>
        )}
        {/* MC #6CCE23 — preserved brand colour */}
        {mcNum && (
          <div role="listitem" className="flex flex-col items-center gap-0.5 rounded-xl"
            style={{ padding: '7px 4px', background: 'rgba(108,206,35,0.10)', border: '1px solid rgba(108,206,35,0.25)' }}
            aria-label={`Metacritic ${mcNum}`}>
            <span className="font-black uppercase tracking-wide" style={{ fontSize: 7.5, color: 'rgba(108,206,35,0.75)' }}>MC</span>
            <span className="font-black tabular-nums" style={{ fontSize: 13, color: '#6CCE23' }}>{mcNum}</span>
          </div>
        )}
      </div>
      {(rated || runtime) && (
        <div className="flex items-center gap-2 flex-wrap">
          {rated && (
            <span className="rounded-lg font-bold uppercase"
              style={{ fontSize: 9, color: 'var(--text-muted)', background: 'var(--surface-3)', padding: '3px 8px', letterSpacing: '0.05em', border: '1px solid var(--border-dim)' }}>
              {rated}
            </span>
          )}
          {runtime && <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 600 }}>{runtime}</span>}
        </div>
      )}
      {!loading && !hasAny && <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>{t.sheet.noCriticScores}</p>}
    </div>
  )
}

/* Compact rating row — number + inline slider, shared by the overall rating
   (Overview tab) and each season's rating (inside its Episodes card). */
function RatingRow({ label, value, onChange, caption, onCollapse, t }: {
  label: string
  value: number | undefined
  onChange: (v: number | undefined) => void
  caption?: string
  onCollapse?: () => void
  t: Translations
}) {
  return (
    <div className="rounded-3xl p-4 flex flex-col gap-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-dim)' }}>
      {onCollapse && (
        <button onClick={onCollapse} className="self-end font-bold uppercase tracking-wide transition-opacity active:opacity-60"
          style={{ fontSize: 10, color: 'var(--text-faint)' }}>
          {t.sheet.done}
        </button>
      )}
      <div className="flex items-center gap-3.5">
        <span className="font-black tabular-nums flex-shrink-0 text-center" style={{ fontSize: 20, width: 44, color: value !== undefined ? 'var(--accent)' : 'var(--text-faint)' }}>
          {value !== undefined ? value.toFixed(1) : '—'}
        </span>
        <div className="flex-1">
          <SlimSeasonSlider value={value} onChange={onChange} label={label} t={t} />
        </div>
      </div>
      {caption && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{caption}</p>}
    </div>
  )
}

/* Slim slider for a rating row — inline with its Clear button; used for
   both the overall rating and each season's rating. */
function SlimSeasonSlider({ value, onChange, label, t }: {
  value: number | undefined
  onChange: (v: number | undefined) => void
  label: string
  t: Translations
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const cbRef    = useRef(onChange)
  useEffect(() => { cbRef.current = onChange }, [onChange])

  const MIN = 1.0; const MAX = 10.0; const STEP = 0.1
  const snap = (v: number) => Math.max(MIN, Math.min(MAX, Math.round(v / STEP) * STEP))
  const pct  = value !== undefined ? ((value - MIN) / (MAX - MIN)) * 100 : 0

  const applyRatio = useCallback((clientX: number) => {
    if (!trackRef.current) return
    const rect  = trackRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    cbRef.current(snap(MIN + ratio * (MAX - MIN)))
  }, [])

  // No inline "Clear" button anymore — it used to sit to the right of the
  // track and shrink it, making this bar visibly shorter than the episode
  // progress bar right below it. Clearing now happens by double-clicking the
  // numeric readout next to this slider instead (see SeasonEpisodeCard).
  return (
    <div
      className="relative flex items-center w-full"
      style={{ height: 24, touchAction: 'none', cursor: 'pointer' }}
      ref={trackRef}
      role="slider"
      aria-valuemin={MIN} aria-valuemax={MAX} aria-valuenow={value}
      aria-label={`${label} rating`}
      tabIndex={0}
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); dragging.current = true; applyRatio(e.clientX) }}
      onPointerMove={e => { if (!dragging.current) return; applyRatio(e.clientX) }}
      onPointerUp={() => { dragging.current = false }}
      onPointerCancel={() => { dragging.current = false }}
      onKeyDown={e => {
        if (e.key === 'ArrowRight') onChange(snap((value ?? MIN) + STEP))
        if (e.key === 'ArrowLeft')  onChange(snap((value ?? MIN) - STEP))
        if (e.key === 'Home') onChange(MIN)
        if (e.key === 'End')  onChange(MAX)
      }}
    >
      <div className="absolute w-full rounded-full" style={{ height: 6, background: 'var(--surface-4)' }} />
      {value !== undefined && (
        <div className="absolute rounded-full"
          style={{ height: 6, width: `${pct}%`, background: 'var(--accent-grad)', transition: dragging.current ? 'none' : 'width 0.06s ease' }} />
      )}
      {value !== undefined && (
        <div className="absolute rounded-full"
          style={{
            left: `${pct}%`, transform: 'translateX(-50%)',
            width: 16, height: 16, background: '#fff',
            boxShadow: '0 0 0 3px rgba(249,115,22,0.28), 0 1px 6px rgba(0,0,0,0.45)',
            transition: dragging.current ? 'none' : 'left 0.06s ease', zIndex: 2,
          }} />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   EPISODES TAB — now also owns each season's rating (see
   SeasonEpisodeCard below), since tracking and rating a season are
   the same "about this season" job and used to live in two tabs.
   ───────────────────────────────────────────────────────────── */

/* Compact episode toggle button. Single vs double click/tap is disambiguated
   entirely by SeasonEpisodeCard's handleEpClick (deferred-toggle pattern) —
   no native onDoubleClick/onContextMenu here, since layering the browser's
   own dblclick on top of that manual tracking used to fire the bulk-fill
   twice for one real double-click, which silently cancelled itself out. */
function EpButton({ ep, watched, onClick, t }: {
  ep: number
  watched: boolean
  onClick: () => void
  t: Translations
}) {
  return (
    <button
      onClick={onClick}
      className="ep-btn rounded-xl border font-bold tabular-nums transition-all select-none"
      aria-label={t.sheet.epAria(ep, watched)}
      aria-pressed={watched}
      style={{
        width: 34, height: 34, fontSize: 11,
        background:  watched ? 'var(--accent-grad)' : 'var(--surface-3)',
        borderColor: watched ? 'transparent' : 'var(--border-dim)',
        color:       watched ? '#1A1030' : 'var(--text-muted)',
        boxShadow:   watched ? 'var(--glow-accent)' : 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect:   'none',
      } as React.CSSProperties}
    >
      {ep}
    </button>
  )
}

/* Progress bar: watched / total */
function EpisodeProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? (done / total) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 rounded-full" style={{ height: 6, background: 'var(--surface-4)' }}>
        <div
          className="rounded-full"
          style={{
            height: 6,
            width: `${pct}%`,
            background: 'var(--accent-grad)',
            boxShadow: pct > 0 ? 'var(--glow-accent)' : 'none',
            transition: 'width 0.25s ease',
          }}
          aria-label={`${Math.round(pct)}% watched`}
        />
      </div>
      <span className="font-bold tabular-nums flex-shrink-0" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        {done}/{total}
      </span>
    </div>
  )
}

/* Season episode card — uniform surface style, accordion body */
function SeasonEpisodeCard({ season, episodes, onToggle, onAutoFill, rating, onRating, defaultOpen, t }: {
  season: TMDBSeason
  episodes: Record<string, boolean>
  onToggle: (ep: number) => void
  onAutoFill: (ep: number) => void
  rating: number | undefined
  onRating: (v: number | undefined) => void
  defaultOpen: boolean
  t: Translations
}) {
  // Only the first season starts expanded — having every season open at once
  // when a show has several looked messy; the rest start compact and expand
  // on tap like an accordion.
  const [open,  setOpen]  = useState(defaultOpen)
  const [shown, setShown] = useState(Math.min(season.episode_count, 40))

  const sNum  = season.season_number
  const label = season.name || t.sheet.season(sNum)
  const done  = Object.values(episodes).filter(Boolean).length
  const remaining = season.episode_count - shown
  const complete  = season.episode_count > 0 && done === season.episode_count

  // Double-tap detection: the first click's plain toggle is deferred briefly
  // so a fast second click on the same episode can still intercept it and
  // bulk-fill instead — computed against state as it was before this click
  // sequence, since the deferred toggle hasn't run yet. A slow second click
  // (past the window) just lets the first toggle apply and starts its own
  // fresh deferred toggle, so single clicks always work too.
  const pendingToggle = useRef<{ ep: number; timer: ReturnType<typeof setTimeout> } | null>(null)
  const DOUBLE_TAP_MS = 260

  useEffect(() => { setShown(Math.min(season.episode_count, 40)) }, [season.episode_count])
  useEffect(() => () => { if (pendingToggle.current) clearTimeout(pendingToggle.current.timer) }, [])

  const handleEpClick = (ep: number) => {
    if (pendingToggle.current && pendingToggle.current.ep === ep) {
      clearTimeout(pendingToggle.current.timer)
      pendingToggle.current = null
      onAutoFill(ep)
      return
    }
    if (pendingToggle.current) clearTimeout(pendingToggle.current.timer)
    const timer = setTimeout(() => { onToggle(ep); pendingToggle.current = null }, DOUBLE_TAP_MS)
    pendingToggle.current = { ep, timer }
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-dim)' }}>
      {/* Season accordion header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 transition-opacity active:opacity-70"
        aria-expanded={open}
        aria-controls={`ep-s-${sNum}`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="rounded-full flex-shrink-0" style={{ width: 7, height: 7, background: complete ? 'var(--accent)' : 'var(--border)' }} aria-hidden="true" />
          <span className="font-bold text-white truncate" style={{ fontSize: 13 }}>{label}</span>
          {!open && rating !== undefined && (
            <span className="font-bold tabular-nums flex-shrink-0" style={{ fontSize: 10, color: 'var(--accent)' }}>
              ★ {rating.toFixed(1)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <span className="font-bold tabular-nums" style={{ fontSize: 11, color: complete ? 'var(--accent)' : 'var(--text-faint)' }}>
            {done}/{season.episode_count}
          </span>
          <Chevron open={open} />
        </div>
      </button>

      {/* Collapsible episode content */}
      <div
        id={`ep-s-${sNum}`}
        style={{ overflow: 'hidden', maxHeight: open ? 9999 : 0, opacity: open ? 1 : 0, transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease' }}
      >
        <div className="px-4 pb-4 flex flex-col gap-3.5">
          {/* Season rating — the header's ★ badge only shows while collapsed
              (see !open above), so this readout is the only place the number
              appears while the season is expanded, no more duplication. Sized
              to match the episode-count number directly below it (11px) so
              the two don't visually clash the way 13px vs 11px did before. */}
          <div className="flex items-center gap-2.5">
            <div className="flex-1">
              <SlimSeasonSlider value={rating} onChange={onRating} label={label} t={t} />
            </div>
            <span onDoubleClick={() => rating !== undefined && onRating(undefined)}
              className="font-black tabular-nums flex-shrink-0 text-center select-none"
              style={{ fontSize: 11, width: 28, color: rating !== undefined ? 'var(--accent)' : 'var(--text-faint)', cursor: rating !== undefined ? 'pointer' : 'default' }}
              aria-label={rating !== undefined ? t.sheet.clearAria(label) : undefined}
              title={rating !== undefined ? t.sheet.clearAria(label) : undefined}>
              {rating !== undefined ? rating.toFixed(1) : '—'}
            </span>
          </div>

          {/* Progress bar */}
          <EpisodeProgressBar done={done} total={season.episode_count} />

          {/* Hint */}
          <p style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 600 }}>
            {t.sheet.tapToMarkHint}
          </p>

          {/* Episode grid
              · Single tap  → toggle that episode (handleEpClick double-tap-aware)
              · Fast double-click/tap on the same episode → bulk-fill up to that episode */}
          <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
            {Array.from({ length: shown }, (_, i) => i + 1).map(ep => (
              <EpButton
                key={ep}
                ep={ep}
                watched={Boolean(episodes[String(ep)])}
                onClick={() => handleEpClick(ep)}
                t={t}
              />
            ))}
          </div>

          {/* Show more */}
          {remaining > 0 && (
            <button
              onClick={() => setShown(season.episode_count)}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl transition-opacity active:opacity-70"
              style={{ padding: '9px 12px', background: 'var(--surface-3)', border: '1px solid var(--border-dim)' }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="var(--text-muted)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>
                {t.sheet.showMore(remaining)}
              </span>
            </button>
          )}

          {/* Show less */}
          {shown > 40 && (
            <button
              onClick={() => setShown(40)}
              className="w-full text-center transition-opacity active:opacity-60"
              style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 600, padding: '4px' }}
            >
              {t.sheet.showLess}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* Episodes tab root */
function EpisodesTab({
  localItem, seasons, loadingData, isTV,
  onToggleEp, onAutoFill, onSeasonRating, t,
}: {
  localItem: LocalItem
  seasons: TMDBSeason[]
  loadingData: boolean
  isTV: boolean
  onToggleEp: (sNum: number, ep: number) => void
  onAutoFill: (sNum: number, ep: number) => void
  onSeasonRating: (sNum: number, v: number | undefined) => void
  t: Translations
}) {
  if (!isTV) {
    return (
      <div id="dtab-episodes" role="tabpanel" aria-label={t.sheet.episodes} className="px-4 pb-4">
        <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-dim)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>
            {t.sheet.episodesUnavailable}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div id="dtab-episodes" role="tabpanel" aria-label={t.sheet.episodes} className="px-4 flex flex-col gap-3.5 pb-4">
      {loadingData && seasons.length === 0 && (
        <div className="flex items-center gap-2" style={{ color: 'var(--text-faint)', fontSize: 12 }}>
          <Spinner /> {t.sheet.loadingSeasons}
        </div>
      )}
      {!loadingData && seasons.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: '24px 0' }}>
          {t.sheet.noSeasonData}
        </p>
      )}
      {seasons.slice(0, 15).map((season, idx) => {
        const sd = localItem.seasonData?.[String(season.season_number)] ?? { episodes: {} }
        return (
          <SeasonEpisodeCard
            key={season.season_number}
            season={season}
            episodes={sd.episodes}
            rating={sd.rating}
            defaultOpen={idx === 0}
            onToggle={ep  => onToggleEp(season.season_number, ep)}
            onAutoFill={ep => onAutoFill(season.season_number, ep)}
            onRating={v => onSeasonRating(season.season_number, v)}
            t={t}
          />
        )
      })}
      {seasons.length > 15 && (
        <p style={{ fontSize: 10, color: 'var(--text-faint)', textAlign: 'center' }}>
          {t.sheet.showingNOfM(15, seasons.length)}
        </p>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   TAB NAV — Segmented control
   Active segment: gradient-filled pill, dark ink icon + label.
   Inactive: transparent, muted icon + label.
   ───────────────────────────────────────────────────────────── */
function IconInfo({ active }: { active: boolean }) {
  const c = active ? '#1A1030' : 'var(--text-muted)'
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}
function IconPlay({ active }: { active: boolean }) {
  const c = active ? '#1A1030' : 'var(--text-muted)'
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
      <polyline points="17 2 12 7 7 2" />
    </svg>
  )
}

type TabId = 'overview' | 'episodes'

const TAB_ICONS: Record<TabId, React.FC<{ active: boolean }>> = { overview: IconInfo, episodes: IconPlay }

function TabNav({ activeTab, onSelect, showEpisodes, t }: {
  activeTab: TabId
  onSelect: (id: TabId) => void
  showEpisodes: boolean
  t: Translations
}) {
  const navTabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: t.sheet.overview },
    { id: 'episodes', label: t.sheet.episodes },
  ]
  const tabs = navTabs.filter(nt => nt.id !== 'episodes' || showEpisodes)
  return (
    <div
      className="glass flex rounded-2xl"
      style={{ padding: 4, gap: 4 }}
      role="tablist"
      aria-label={t.sheet.drawerSectionsAria}
    >
      {tabs.map(nt => {
        const active = activeTab === nt.id
        const Icon = TAB_ICONS[nt.id]
        return (
          <button
            key={nt.id}
            role="tab"
            aria-selected={active}
            aria-controls={`dtab-${nt.id}`}
            onClick={() => onSelect(nt.id)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl transition-all duration-200 active:scale-95"
            style={{
              padding: '10px 0',
              background: active ? 'var(--accent-grad)' : 'transparent',
              boxShadow: active ? 'var(--glow-accent)' : 'none',
            }}
          >
            <Icon active={active} />
            <span className="font-bold" style={{ fontSize: 12.5, color: active ? '#1A1030' : 'var(--text-muted)' }}>
              {nt.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ── Main BottomSheet ──────────────────────────────────────── */
export default function BottomSheet() {
  const t = useT()
  const { sheet, closeSheet, openSheet, upsertItem, removeItem, showToast, settings, library } = useStore()

  const [localItem,   setLocalItem]   = useState<LocalItem | null>(null)
  const [providers,   setProviders]   = useState<TMDBProvider[]>([])
  const [seasons,     setSeasons]     = useState<TMDBSeason[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [loadingOmdb, setLoadingOmdb] = useState(false)
  const [activeTab,   setActiveTab]   = useState<TabId>('overview')
  const [isDirty,     setIsDirty]     = useState(false)
  const [showDirty,   setShowDirty]   = useState(false)
  // Ref mirrors isDirty so requestClose always reads current value from stale closures
  const isDirtyRef = useRef(false)
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(true)
  const [notesOpen,       setNotesOpen]       = useState(false)
  const [ratingExpanded,  setRatingExpanded]  = useState(false)
  const [recommendations, setRecommendations] = useState<TMDBResult[]>([])
  const [loadingRecs,     setLoadingRecs]     = useState(false)
  const [showAllRecs,     setShowAllRecs]     = useState(false)

  const touchStartY  = useRef<number | null>(null)
  const touchStartX  = useRef<number | null>(null)
  const pendingClose = useRef<(() => void) | null>(null)

  const requestClose = useCallback((afterClose?: () => void) => {
    if (isDirtyRef.current) {
      pendingClose.current = afterClose ?? null
      setShowDirty(true)
    } else {
      afterClose?.()
      closeSheet()
    }
  }, [closeSheet])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && sheet) requestClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [sheet, requestClose])

  useEffect(() => {
    if (!sheet) {
      setLocalItem(null); setProviders([]); setSeasons([]); setRecommendations([])
      setIsDirty(false); isDirtyRef.current = false; setShowDirty(false); setShowAllRecs(false)
      setNotesOpen(false); setRatingExpanded(false)
      return
    }
    const { result, item } = sheet
    const existingItem = item ?? library[result.id] ?? null

    const scaffold: LocalItem = existingItem
      ? { ...existingItem, seasonData: existingItem.seasonData ?? {} }
      : {
          id: result.id, mediaType: result.media_type, type: getLibraryType(result),
          title: getTitle(result), year: getYear(result), poster: result.poster_path || null,
          tmdbRating: formatRating(result.vote_average),
          status: null,   // always null for new items — NEVER default to 'pending'
          seasonData: {}, addedAt: Date.now(), _isNew: true,
        }

    setLocalItem(scaffold)
    setIsDirty(false); setShowDirty(false)
    setActiveTab('overview')
    setMoreDetailsOpen(true); setShowAllRecs(false)
    setNotesOpen(false); setRatingExpanded(false)

    setLoadingData(true)
    Promise.all([
      getWatchProviders(result.media_type, result.id, settings.region),
      result.media_type === 'tv' ? getTVSeasons(result.id) : Promise.resolve<TMDBSeason[]>([]),
    ]).then(([prov, seas]) => { setProviders(prov); setSeasons(seas) })
      .finally(() => setLoadingData(false))

    setRecommendations([]); setLoadingRecs(true)
    getRecommendations(result.media_type, result.id)
      .then(list => setRecommendations(list.filter(r => r.id !== result.id)))
      .finally(() => setLoadingRecs(false))

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

  const setStatus = useCallback((s: Status | null) => {
    setLocalItem(p => { if (!p) return p; return { ...p, status: s } })
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
    showToast(t.sheet.savedToLibrary)
  }, [localItem, upsertItem, showToast, t])

  const openRecommendation = useCallback((r: TMDBResult) => {
    openSheet(r, library[r.id] ?? null)
  }, [openSheet, library])

  const handleSave   = useCallback(async () => { await doSave(); closeSheet() }, [doSave, closeSheet])
  const handleRemove = useCallback(async () => {
    if (!localItem) return
    await removeItem(localItem.id); showToast(t.sheet.removedFromLibrary)
    setIsDirty(false); isDirtyRef.current = false; closeSheet()
  }, [localItem, removeItem, showToast, closeSheet, t])

  const handleDirtySave = useCallback(async () => {
    await doSave()
    setShowDirty(false)
    pendingClose.current?.(); pendingClose.current = null
    closeSheet()
  }, [doSave, closeSheet])

  const handleDirtyDiscard = useCallback(() => {
    setIsDirty(false); isDirtyRef.current = false
    setShowDirty(false)
    pendingClose.current?.(); pendingClose.current = null
    closeSheet()
  }, [closeSheet])

  /* CRITICAL FIX: hides modal only, preserves drawer + all edits */
  const handleDirtyCancel = useCallback(() => {
    setShowDirty(false)
    pendingClose.current = null
    // isDirty stays true — drawer stays open — all edits preserved
  }, [])

  if (!sheet || !localItem) return null

  const { result }       = sheet
  const inLibrary        = Boolean(library[localItem.id])
  const isTV             = result.media_type === 'tv'
  const posterSrc        = posterUrl(localItem.poster, 'w185')
  const typeLabel        = result.media_type === 'movie' ? t.type.movie : localItem.type === 'anime' ? t.type.anime : t.type.series
  const headerScore      = combinedScore(localItem.tmdbRating, localItem.imdbRating)
  const scoreIsAvg       = Boolean(localItem.imdbRating)

  const seasonRatings = Object.values(localItem.seasonData ?? {}).map(s => s.rating).filter((r): r is number => r !== undefined)
  const seasonAvg = seasonRatings.length ? seasonRatings.reduce((a, b) => a + b, 0) / seasonRatings.length : undefined

  return (
    <div className="absolute inset-0 z-50 flex items-end animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={() => requestClose()}
      role="dialog" aria-modal="true" aria-label={t.sheet.detailsFor(localItem.title)}>

      <div className="w-full overflow-y-auto animate-slide-up"
        style={{ background: 'var(--sheet-bg)', borderRadius: '28px 28px 0 0', maxHeight: '92dvh', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 16px)', boxShadow: 'var(--shadow-overlay)', borderTop: '1px solid var(--border-dim)' }}
        onClick={e => e.stopPropagation()}
        onTouchStart={e => { touchStartY.current = e.touches[0].clientY; touchStartX.current = e.touches[0].clientX }}
        onTouchEnd={e => {
          if (touchStartY.current === null) return
          const dy = e.changedTouches[0].clientY - touchStartY.current
          const dx = touchStartX.current !== null ? e.changedTouches[0].clientX - touchStartX.current : 0
          touchStartY.current = null; touchStartX.current = null
          // Require a clearly deliberate, mostly-vertical downward swipe — a
          // large distance, and at least three times as much vertical
          // movement as horizontal — so an accidental left/right gesture (or
          // a light scroll) while browsing the sheet's content never gets
          // misread as "swipe down to close" and pops the unsaved-changes
          // prompt unexpectedly. Raised twice already at Moe's request —
          // still too easy to trigger at 140px/2x, now 220px/3x.
          if (dy > 220 && dy > Math.abs(dx) * 3) requestClose()
        }}>

        {/* Drag handle */}
        <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '10px auto 0' }} aria-hidden="true" />

        {/* ══════════════════════════════════════════════════════
            HEADER: poster · title · scores · STATUS PILL
            ══════════════════════════════════════════════════════ */}
        <div className="flex gap-3.5 px-4 pt-4 pb-4">

          {/* Poster */}
          <div className="flex-shrink-0 rounded-2xl overflow-hidden flex items-center justify-center"
            style={{ width: 56, height: 82, background: 'var(--surface-2)', border: '1px solid var(--border-dim)' }}>
            {posterSrc
              ? <Image src={posterSrc} alt={`${localItem.title} poster`} width={56} height={82} className="w-full h-full object-cover" unoptimized />
              : <MediaTypeIcon type={localItem.type} size={24} color="var(--text-faint)" />}
          </div>

          {/* Title row → plain meta line → scores + status, top to bottom */}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5 pt-0.5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-black text-white leading-snug" style={{ fontSize: 15 }}>{localItem.title}</h2>
              <button onClick={() => requestClose()} aria-label={t.sheet.close}
                className="flex-shrink-0 flex items-center justify-center rounded-full transition-opacity active:opacity-50"
                style={{ width: 30, height: 30, background: 'var(--surface-3)', color: 'var(--text-muted)', fontSize: 17, border: '1px solid var(--border-dim)' }}>
                ×
              </button>
            </div>

            <span style={{ fontSize: 10.5, color: 'var(--text-faint)', fontWeight: 600 }}>
              {localItem.year}{localItem.year ? ' · ' : ''}{typeLabel}{localItem.director ? ` · ${localItem.director}` : ''}
            </span>

            <div className="flex items-center gap-2 flex-wrap">
              {headerScore && (
                <div className="flex items-center gap-1 rounded-full px-2.5 py-1"
                  style={{
                    background: scoreIsAvg ? 'rgba(249,115,22,0.10)' : 'rgba(255,255,255,0.06)',
                    border:     scoreIsAvg ? '1px solid rgba(249,115,22,0.25)' : '1px solid rgba(255,255,255,0.10)',
                  }}>
                  <span style={{ color: scoreIsAvg ? 'var(--sun)' : 'var(--text-muted)', fontSize: 11 }} aria-hidden="true">★</span>
                  <span className="font-black tabular-nums" style={{ color: scoreIsAvg ? 'var(--sun)' : 'var(--text-2)', fontSize: 12 }}>{headerScore}</span>
                  {scoreIsAvg
                    ? <span className="font-black uppercase" style={{ fontSize: 7, color: 'rgba(249,115,22,0.55)', letterSpacing: '0.06em' }} aria-label="avg">{t.sheet.avg}</span>
                    : <span style={{ fontSize: 8, color: 'var(--text-faint)' }}>{t.sheet.tmdb}</span>}
                </div>
              )}

              {localItem.userRating !== undefined && (
                <div className="flex items-center gap-1 rounded-full px-2.5 py-1"
                  style={{ background: 'var(--my-rating-bg)', border: '1px solid var(--my-rating-border)' }}
                  aria-label={`My rating ${localItem.userRating.toFixed(1)}`}>
                  <span style={{ color: 'var(--my-rating-text)', fontSize: 11 }} aria-hidden="true">♥</span>
                  <span className="font-black tabular-nums" style={{ color: 'var(--my-rating-text)', fontSize: 12 }}>{localItem.userRating.toFixed(1)}</span>
                  <span className="font-black uppercase" style={{ fontSize: 7, color: 'rgba(59,130,246,0.55)', letterSpacing: '0.06em' }}>{t.sheet.my}</span>
                </div>
              )}

              <StatusPill status={localItem.status} onChange={setStatus} t={t} />
            </div>
          </div>
        </div>

        <Divider />

        {/* ══════════════════════════════════════════════════════
            TAB NAV — segmented control
            ══════════════════════════════════════════════════════ */}
        <div className="px-4 pt-3 pb-1">
          <TabNav
            activeTab={activeTab}
            onSelect={setActiveTab}
            showEpisodes={isTV}
            t={t}
          />
        </div>

        {/* ── Tab content ── */}
        <div style={{ minHeight: '50vh' }} className="pt-3">

          {/* OVERVIEW TAB — rating, notes, keep-watching, then everything you
              only check once (providers + critic scores) behind one shared
              disclosure, then similar titles at the bottom. */}
          {activeTab === 'overview' && (
            <div id="dtab-overview" role="tabpanel" aria-label={t.sheet.overview} className="px-4 flex flex-col gap-3.5 pb-4">

              {/* ── Rating + Keep-watching — side by side compact, tap Rating to bring it forward for precise dragging ── */}
              <div className={ratingExpanded ? 'flex flex-col gap-3' : 'grid grid-cols-2 gap-3'}>
                {ratingExpanded ? (
                  <RatingRow
                    label={isTV ? t.sheet.overallRating : t.sheet.myScore}
                    value={localItem.userRating}
                    onChange={v => update({ userRating: v })}
                    caption={isTV && seasonAvg !== undefined ? t.sheet.seasonAverage(seasonAvg.toFixed(1)) : undefined}
                    onCollapse={() => setRatingExpanded(false)}
                    t={t}
                  />
                ) : (
                  <button onClick={() => setRatingExpanded(true)}
                    className={`rounded-3xl p-4 flex flex-col items-center justify-center gap-1 transition-opacity active:opacity-80 ${!isTV ? 'col-span-2' : ''}`}
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border-dim)', minHeight: 84 }}>
                    <span className="font-black tabular-nums" style={{ fontSize: 22, color: localItem.userRating !== undefined ? 'var(--accent)' : 'var(--text-faint)' }}>
                      {localItem.userRating !== undefined ? localItem.userRating.toFixed(1) : '—'}
                    </span>
                    <span className="font-bold uppercase tracking-wide" style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                      {isTV ? t.sheet.overallRating : t.sheet.myScore}
                    </span>
                  </button>
                )}

                {isTV && !ratingExpanded && (
                  <button
                    onClick={() => update({ keepWatching: !localItem.keepWatching })}
                    aria-pressed={Boolean(localItem.keepWatching)}
                    className="rounded-3xl p-4 flex flex-col items-center justify-center gap-1 transition-opacity active:opacity-80"
                    style={{
                      background: localItem.keepWatching ? 'rgba(249,115,22,0.12)' : 'var(--surface-2)',
                      border: `1px solid ${localItem.keepWatching ? 'rgba(249,115,22,0.35)' : 'var(--border-dim)'}`,
                      minHeight: 84,
                    }}>
                    <span className="flex items-center justify-center rounded-xl flex-shrink-0"
                      style={{ width: 26, height: 26, background: localItem.keepWatching ? 'var(--accent-grad)' : 'var(--surface-3)' }}
                      aria-hidden="true">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke={localItem.keepWatching ? '#1A1030' : 'var(--text-muted)'}
                        strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    </span>
                    <span className="font-bold text-center" style={{ fontSize: 11, color: localItem.keepWatching ? 'var(--text)' : 'var(--text-faint)', lineHeight: 1.3 }}>
                      {localItem.keepWatching ? t.sheet.watchingForThis : t.sheet.keepAnEyeOnThis}
                    </span>
                  </button>
                )}
              </div>

              {/* ── More details — where to watch (left) + critic scores (right), one disclosure ── */}
              <div className="rounded-3xl overflow-hidden" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-dim)' }}>
                <button onClick={() => setMoreDetailsOpen(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3.5 transition-opacity active:opacity-70"
                  aria-expanded={moreDetailsOpen} aria-controls="more-details">
                  <span className="font-bold text-white" style={{ fontSize: 13 }}>{t.sheet.moreDetails}</span>
                  <Chevron open={moreDetailsOpen} />
                </button>
                <Collapse open={moreDetailsOpen} id="more-details">
                  <div className="px-4 pb-4 grid grid-cols-2 gap-4">
                    <div style={{ borderRight: '1px solid var(--border-dim)', paddingRight: 16 }}>
                      <p className="font-black uppercase tracking-wide" style={{ fontSize: 9.5, color: 'var(--text-faint)', marginBottom: 10 }}>
                        {t.sheet.watchIn(settings.region)}
                      </p>
                      {loadingData
                        ? <div className="flex items-center gap-2" style={{ color: 'var(--text-faint)', fontSize: 12 }}><Spinner /> {t.sheet.loading}</div>
                        : providers.length === 0
                          ? <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>{t.sheet.notAvailable}</p>
                          : <div className="flex flex-wrap gap-2.5">
                              {providers.map(p => (
                                <button key={p.provider_id}
                                  onClick={() => showToast(p.provider_name)}
                                  className="rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0 transition-opacity active:opacity-70"
                                  style={{ width: 40, height: 40, background: '#fff' }}
                                  title={p.provider_name} aria-label={p.provider_name}>
                                  {p.logo_path && <Image src={`https://image.tmdb.org/t/p/w45${p.logo_path}`} alt={p.provider_name} width={40} height={40} className="w-full h-full object-cover" unoptimized />}
                                </button>
                              ))}
                            </div>}
                    </div>
                    <div>
                      <p className="font-black uppercase tracking-wide" style={{ fontSize: 9.5, color: 'var(--text-faint)', marginBottom: 10 }}>
                        {t.sheet.criticRatings}
                      </p>
                      <CriticRatings
                        tmdbRating={localItem.tmdbRating} imdbRating={localItem.imdbRating}
                        rottenTomatoes={localItem.rottenTomatoes} metacritic={localItem.metacritic}
                        rated={localItem.rated} runtime={localItem.runtime} loading={loadingOmdb} t={t} />
                    </div>
                  </div>
                </Collapse>
              </div>

              {/* ── Private Notes — hidden by default ── */}
              <div className="rounded-3xl overflow-hidden" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-dim)' }}>
                <button onClick={() => setNotesOpen(v => !v)}
                  className="w-full flex items-center gap-2.5 px-4 py-3.5 transition-opacity active:opacity-70"
                  aria-expanded={notesOpen} aria-controls="notes-panel">
                  <span className="flex items-center justify-center rounded-xl flex-shrink-0"
                    style={{ width: 30, height: 30, background: 'rgba(249,115,22,0.12)', color: 'var(--accent)' }} aria-hidden="true">
                    <IconEdit />
                  </span>
                  <span className="flex-1 text-left font-bold text-white" style={{ fontSize: 13 }}>{t.sheet.privateNotes}</span>
                  <Chevron open={notesOpen} />
                </button>
                <Collapse open={notesOpen} id="notes-panel">
                  <div className="px-4 pb-4">
                    <textarea
                      value={localItem.notes || ''}
                      onChange={e => update({ notes: e.target.value })}
                      placeholder={t.sheet.notesPlaceholder}
                      aria-label={t.sheet.notesAria}
                      rows={4}
                      className="w-full rounded-2xl px-3.5 py-3 text-[13px] text-white resize-none"
                      style={{ background: 'var(--surface-3)', border: '1px solid var(--border-dim)', lineHeight: 1.6 }}
                    />
                  </div>
                </Collapse>
              </div>

              {/* ── More Like This ── */}
              {(loadingRecs || recommendations.length > 0) && (
                <div>
                  <div className="flex items-center justify-between px-1 mb-2.5">
                    <p className="font-bold uppercase tracking-wide" style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                      {t.sheet.moreLikeThis}
                    </p>
                    {recommendations.length > 6 && (
                      <button onClick={() => setShowAllRecs(true)}
                        className="font-bold uppercase tracking-wide"
                        style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {t.sheet.allCount(recommendations.length)}
                      </button>
                    )}
                  </div>
                  {loadingRecs ? (
                    <div className="flex items-center gap-2 px-1" style={{ color: 'var(--text-faint)', fontSize: 12 }}>
                      <Spinner /> {t.sheet.findingSimilar}
                    </div>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {recommendations.slice(0, 6).map(r => (
                        <div key={r.id} style={{ width: 112, flexShrink: 0 }}>
                          <PosterCard posterPath={r.poster_path ?? null} title={getTitle(r)}
                            meta={r.vote_average ? `★ ${formatRating(r.vote_average)}` : undefined}
                            onPress={() => openRecommendation(r)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* EPISODES TAB */}
          {activeTab === 'episodes' && (
            <EpisodesTab
              localItem={localItem}
              seasons={seasons}
              loadingData={loadingData}
              isTV={isTV}
              onToggleEp={toggleEpisode}
              onAutoFill={autoFillUpTo}
              onSeasonRating={updateSeasonRating}
              t={t}
            />
          )}
        </div>

        <Divider />

        {/* ── Action buttons — gradient accent ONLY on primary Save ── */}
        <div className="px-4 pt-3 flex gap-2.5">
          <button onClick={handleSave}
            className="flex-1 rounded-2xl font-black transition-opacity active:opacity-80"
            style={{ padding: '14px 0', fontSize: 15, background: 'var(--accent-grad)', color: '#1A1030', minHeight: 44, boxShadow: 'var(--glow-accent-lg)' }}>
            {isDirty ? t.sheet.saveDirty : t.sheet.save}
          </button>
          {inLibrary && (
            <button onClick={handleRemove}
              className="flex-1 rounded-2xl font-bold transition-opacity active:opacity-75"
              style={{ padding: '14px 0', fontSize: 14, color: '#fb7185', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.20)', minHeight: 44 }}>
              {t.sheet.remove}
            </button>
          )}
        </div>
      </div>

      {/* ── Unsaved-changes modal ── */}
      {showDirty && (
        <DirtyModal
          onSave={handleDirtySave}
          onDiscard={handleDirtyDiscard}
          onCancel={handleDirtyCancel}
          t={t}
        />
      )}

      {/* ── More Like This — full list ── */}
      {showAllRecs && (
        <CategorySheet
          title={t.sheet.moreLikeThis}
          items={recommendations}
          onClose={() => setShowAllRecs(false)}
          onSelect={r => { setShowAllRecs(false); openRecommendation(r) }}
        />
      )}
    </div>
  )
}
