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

type LocalItem = LibraryItem & { _isNew?: boolean }

/* ─────────────────────────────────────────────────────────────
   SEASON OPACITY SCALE
   Shared token used identically in both Rating and Episodes tabs
   to guarantee visual consistency across views.
   ───────────────────────────────────────────────────────────── */
function getSeasonStyle(seasonNumber: number): React.CSSProperties {
  if (seasonNumber === 1) return {
    background: 'rgba(252,219,50,0.20)',
    border:     '1px solid rgba(252,219,50,0.40)',
  }
  if (seasonNumber === 2) return {
    background: 'rgba(252,219,50,0.12)',
    border:     '1px solid rgba(252,219,50,0.25)',
  }
  if (seasonNumber === 3) return {
    background: 'rgba(252,219,50,0.06)',
    border:     '1px solid rgba(252,219,50,0.15)',
  }
  return {
    background: 'rgba(252,219,50,0.03)',
    border:     '1px solid rgba(252,219,50,0.10)',
  }
}

/* Text colour for season headings — fades with the card opacity */
function getSeasonTextColor(seasonNumber: number): string {
  if (seasonNumber === 1) return '#FCDB32'
  if (seasonNumber === 2) return 'rgba(252,219,50,0.80)'
  if (seasonNumber === 3) return 'rgba(252,219,50,0.60)'
  return 'rgba(252,219,50,0.45)'
}

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

/* ── Status colour map ─────────────────────────────────────── */
const STATUS_COLORS: Record<Status, { bg: string; text: string; dot: string; border: string; label: string }> = {
  pending: {
    bg:     'rgba(180,83,9,0.20)',
    text:   '#fca56a',
    dot:    '#d97706',
    border: 'rgba(180,83,9,0.30)',
    label:  'Pending',
  },
  watching: {
    bg:     'rgba(16,185,129,0.15)',
    text:   '#34d399',
    dot:    '#10b981',
    border: 'rgba(16,185,129,0.30)',
    label:  'Watching',
  },
  watched: {
    bg:     'rgba(99,102,241,0.20)',
    text:   '#a5b4fc',
    dot:    '#6366f1',
    border: 'rgba(99,102,241,0.30)',
    label:  'Watched',
  },
}

/* ── Header Status Pill + Dropdown ────────────────────────── */
function StatusPill({ status, onChange }: {
  status: Status | null
  onChange: (s: Status | null) => void
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

  const c = status ? STATUS_COLORS[status] : null
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
        aria-label={status ? `Status: ${STATUS_COLORS[status].label}` : 'Set status'}
      >
        {c
          ? <>
              <span className="rounded-full flex-shrink-0" style={{ width: 5, height: 5, background: c.dot }} aria-hidden="true" />
              {c.label}
            </>
          : <>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              No status
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
          className="absolute right-0 top-full mt-1.5 rounded-xl overflow-hidden animate-pop"
          style={{ background: '#111829', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.6)', minWidth: 148, zIndex: 99 }}
          role="listbox"
          aria-label="Select status"
          onClick={e => e.stopPropagation()}
        >
          {(Object.entries(STATUS_COLORS) as [Status, typeof STATUS_COLORS[Status]][]).map(([id, sc]) => {
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
                  {sc.label}
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
            <span className="font-semibold flex-1" style={{ fontSize: 12, color: 'rgba(148,163,184,0.6)' }}>Remove Status</span>
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
function DirtyModal({ onSave, onDiscard, onCancel }: {
  onSave: () => void; onDiscard: () => void; onCancel: (e: React.MouseEvent) => void
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
          {/* CRITICAL: stopPropagation + preventDefault prevent backdrop from closing the drawer */}
          <button
            onClick={e => { e.stopPropagation(); e.preventDefault(); onCancel(e) }}
            className="w-full rounded-xl font-semibold transition-opacity active:opacity-75"
            style={{ padding: '13px 0', fontSize: 14, color: 'rgba(148,163,184,0.8)', background: 'var(--surface-3)', border: '1px solid var(--border-dim)', minHeight: 44 }}>
            Cancelar y seguir editando
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Critic ratings ────────────────────────────────────────── */
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
        {/* TMDB #01B4E4 — preserved brand colour */}
        <div role="listitem" className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
          style={{ background: 'rgba(1,180,228,0.12)', border: '1px solid rgba(1,180,228,0.28)' }}
          aria-label={`TMDB ${tmdbRating}`}>
          <span style={{ fontSize: 11, color: '#01B4E4' }} aria-hidden="true">★</span>
          <span className="font-bold tabular-nums" style={{ fontSize: 12, color: '#01B4E4' }}>{tmdbRating}</span>
          <span style={{ fontSize: 9, color: 'rgba(1,180,228,0.55)', fontWeight: 700 }}>TMDB</span>
        </div>
        {/* IMDb #F5C518 — preserved brand colour */}
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
        {/* RT #FA320A — preserved brand colour */}
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
        {/* MC #6CCE23 — preserved brand colour */}
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

/* ─────────────────────────────────────────────────────────────
   TAB 2: RATING TAB
   ───────────────────────────────────────────────────────────── */

/* Hero Overall Rating Card — dark slate base, yellow accent border */
function HeroRatingCard({ value, onChange, seasonAvg, isTV }: {
  value: number | undefined
  onChange: (v: number | undefined) => void
  seasonAvg?: number
  isTV: boolean
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: '#0D1326',
        border: '2px solid rgba(252,219,50,0.60)',
        boxShadow: '0 4px 20px rgba(252,219,50,0.10), 0 2px 8px rgba(0,0,0,0.50)',
      }}
      aria-label="Overall rating card"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-black uppercase tracking-widest" style={{ fontSize: 10, color: 'rgba(252,219,50,0.70)' }}>
          {isTV ? 'Rating General' : 'Mi Puntuación'}
        </span>
        {value !== undefined ? (
          <span
            className="font-black tabular-nums rounded-lg px-3 py-1"
            style={{ background: '#FCDB32', color: '#0D1326', fontSize: 16, lineHeight: 1 }}
            aria-label={`Score ${value.toFixed(1)}`}
          >
            {value.toFixed(1)}
          </span>
        ) : (
          <span
            className="font-black tabular-nums rounded-lg px-3 py-1"
            style={{ background: 'rgba(252,219,50,0.10)', color: 'rgba(252,219,50,0.35)', fontSize: 16, lineHeight: 1, border: '1px solid rgba(252,219,50,0.20)' }}
            aria-label="No score set"
          >
            —
          </span>
        )}
      </div>

      {/* Slider with dark track and yellow fill/thumb */}
      <HeroSlider value={value} onChange={onChange} />

      {isTV && seasonAvg !== undefined && (
        <p className="mt-2.5 font-semibold" style={{ fontSize: 10, color: 'rgba(252,219,50,0.40)' }}>
          Promedio por temporada: {seasonAvg.toFixed(1)} · tu puntuación global es independiente
        </p>
      )}
    </div>
  )
}

/* Custom slider with dark track for use inside the yellow hero card */
function HeroSlider({ value, onChange }: {
  value: number | undefined
  onChange: (v: number | undefined) => void
}) {
  const trackRef  = useRef<HTMLDivElement>(null)
  const dragging  = useRef(false)
  const cbRef     = useRef(onChange)
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

  return (
    <div>
      <div
        className="relative flex items-center w-full"
        style={{ height: 34, touchAction: 'none', cursor: 'pointer' }}
        ref={trackRef}
        role="slider"
        aria-valuemin={MIN} aria-valuemax={MAX} aria-valuenow={value} aria-label="Overall rating"
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
        {/* Dark track rail */}
        <div className="absolute w-full rounded-full"
          style={{ height: 8, background: '#1E2942', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.50)' }} />

        {/* Yellow glowing fill */}
        {value !== undefined && (
          <div className="absolute rounded-full"
            style={{
              height: 8,
              width: `${pct}%`,
              background: 'linear-gradient(90deg, rgba(252,219,50,0.65) 0%, #FCDB32 100%)',
              boxShadow: '0 0 8px rgba(252,219,50,0.45)',
              transition: dragging.current ? 'none' : 'width 0.06s ease',
            }} />
        )}

        {/* Yellow thumb knob */}
        {value !== undefined && (
          <div className="absolute rounded-full"
            style={{
              left: `${pct}%`,
              transform: 'translateX(-50%)',
              width: 22, height: 22,
              background: '#FCDB32',
              boxShadow: '0 0 0 3px rgba(252,219,50,0.25), 0 2px 8px rgba(0,0,0,0.60)',
              transition: dragging.current ? 'none' : 'left 0.06s ease',
              zIndex: 2,
            }} />
        )}
      </div>

      {/* Min/max labels */}
      <div className="flex justify-between mt-0.5" aria-hidden="true">
        <span style={{ fontSize: 9, color: 'rgba(252,219,50,0.35)', fontWeight: 600 }}>1.0</span>
        <span style={{ fontSize: 9, color: 'rgba(252,219,50,0.35)', fontWeight: 600 }}>10.0</span>
      </div>

      {value !== undefined && (
        <button
          onClick={() => onChange(undefined)}
          className="mt-1 transition-opacity active:opacity-50"
          style={{ fontSize: 9, color: 'rgba(252,219,50,0.40)', fontWeight: 600 }}
          aria-label="Clear rating"
        >
          Borrar ✕
        </button>
      )}
    </div>
  )
}

/* ── SlimSeasonSlider ──────────────────────────────────────────
   Custom slim slider for season rating cards:
   · 6px track height, 18px thumb
   · NO "drag to rate" / placeholder text (Fix 3)
   · Dark rail (#1E2942), yellow glowing fill, yellow thumb
   ─────────────────────────────────────────────────────────── */
function SlimSeasonSlider({ value, onChange, label }: {
  value: number | undefined
  onChange: (v: number | undefined) => void
  label: string
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

  return (
    <div className="flex flex-col gap-1">
      {/* Track area */}
      <div
        className="relative flex items-center w-full"
        style={{ height: 28, touchAction: 'none', cursor: 'pointer' }}
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
        {/* Dark rail — always visible, clean, no text */}
        <div className="absolute w-full rounded-full"
          style={{ height: 6, background: '#1E2942', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.40)' }} />

        {/* Yellow glowing fill */}
        {value !== undefined && (
          <div className="absolute rounded-full"
            style={{
              height: 6,
              width: `${pct}%`,
              background: 'linear-gradient(90deg, rgba(252,219,50,0.55) 0%, #FCDB32 100%)',
              boxShadow: '0 0 6px rgba(252,219,50,0.40)',
              transition: dragging.current ? 'none' : 'width 0.06s ease',
            }} />
        )}

        {/* Yellow thumb — 18px, appears only when value is set */}
        {value !== undefined && (
          <div className="absolute rounded-full"
            style={{
              left: `${pct}%`,
              transform: 'translateX(-50%)',
              width: 18, height: 18,
              background: '#FCDB32',
              boxShadow: '0 0 0 2px rgba(252,219,50,0.22), 0 1px 6px rgba(0,0,0,0.55)',
              transition: dragging.current ? 'none' : 'left 0.06s ease',
              zIndex: 2,
            }} />
        )}
        {/* No placeholder text — clean empty rail when unrated (Fix 3) */}
      </div>

      {/* Min/max + clear */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1" aria-hidden="true">
          <span style={{ fontSize: 8, color: 'rgba(252,219,50,0.30)', fontWeight: 600 }}>1.0</span>
          <span style={{ fontSize: 8, color: 'rgba(252,219,50,0.15)' }}>·</span>
          <span style={{ fontSize: 8, color: 'rgba(252,219,50,0.30)', fontWeight: 600 }}>10.0</span>
        </div>
        {value !== undefined && (
          <button
            onClick={() => onChange(undefined)}
            className="transition-opacity active:opacity-50"
            style={{ fontSize: 8, color: 'rgba(252,219,50,0.35)', fontWeight: 600 }}
            aria-label={`Clear ${label} rating`}
          >
            Borrar ✕
          </button>
        )}
      </div>
    </div>
  )
}

/* Season Rating Card — slim (p-3), single score in header, no duplicate badge beside slider */
function SeasonRatingCard({ season, rating, onRating }: {
  season: TMDBSeason
  rating: number | undefined
  onRating: (v: number | undefined) => void
}) {
  const sNum      = season.season_number
  const label     = season.name || `Temporada ${sNum}`
  const textColor = getSeasonTextColor(sNum)

  return (
    <div className="rounded-xl p-3" style={getSeasonStyle(sNum)}>
      {/* Header: label + episode count on left, single score badge on right */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="font-black uppercase tracking-widest" style={{ fontSize: 9, color: textColor }}>
            {label}
          </span>
          {season.episode_count > 0 && (
            <span style={{ fontSize: 9, color: 'rgba(252,219,50,0.30)' }}>
              · {season.episode_count} ep
            </span>
          )}
        </div>
        {/* Single score display — ★ N.N when rated, — when not. Never duplicated. */}
        <span
          className="font-black tabular-nums rounded-md px-2 py-0.5"
          style={{
            fontSize: 10,
            color:      rating !== undefined ? textColor : 'rgba(252,219,50,0.25)',
            background: rating !== undefined ? 'rgba(252,219,50,0.10)' : 'transparent',
            border:     rating !== undefined ? `1px solid rgba(252,219,50,0.20)` : 'none',
          }}
        >
          {rating !== undefined ? `★ ${rating.toFixed(1)}` : '—'}
        </span>
      </div>
      {/* Slim FluidSlider — compact prop keeps track at 6px and thumb at 18px */}
      <SlimSeasonSlider value={rating} onChange={onRating} label={label} />
    </div>
  )
}

/* Rating tab root */
function RatingTab({
  localItem, seasons, loadingData, isTV, seasonAvg,
  onGlobalRating, onSeasonRating,
}: {
  localItem: LocalItem
  seasons: TMDBSeason[]
  loadingData: boolean
  isTV: boolean
  seasonAvg: number | undefined
  onGlobalRating: (v: number | undefined) => void
  onSeasonRating: (sNum: number, v: number | undefined) => void
}) {
  return (
    <div id="dtab-rating" role="tabpanel" aria-label="Rating" className="px-4 flex flex-col gap-3 pb-4">

      {/* ── SECTION A: Hero Overall Rating ── */}
      <HeroRatingCard
        value={localItem.userRating}
        onChange={onGlobalRating}
        seasonAvg={seasonAvg}
        isTV={isTV}
      />

      {/* ── SECTION B: Season Ratings (TV only) — decreasing opacity scale ── */}
      {isTV && (
        <>
          {loadingData && seasons.length === 0 && (
            <div className="flex items-center gap-2" style={{ color: 'var(--text-faint)', fontSize: 12 }}>
              <Spinner /> Cargando temporadas…
            </div>
          )}
          {!loadingData && seasons.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: '16px 0' }}>
              Sin datos de temporadas.
            </p>
          )}
          {seasons.slice(0, 15).map(season => {
            const sd = localItem.seasonData?.[String(season.season_number)] ?? { episodes: {} }
            return (
              <SeasonRatingCard
                key={season.season_number}
                season={season}
                rating={sd.rating}
                onRating={v => onSeasonRating(season.season_number, v)}
              />
            )
          })}
          {seasons.length > 15 && (
            <p style={{ fontSize: 10, color: 'var(--text-faint)', textAlign: 'center' }}>
              Mostrando 15 de {seasons.length} temporadas
            </p>
          )}
        </>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   TAB 3: EPISODES TAB
   ───────────────────────────────────────────────────────────── */

/* Compact episode toggle button
   · onClick      → toggle single episode
   · onDoubleClick → bulk-fill all episodes up to and including this one
   We suppress the native browser dblclick delay by tracking clicks ourselves in
   SeasonEpisodeCard and calling onBulkFill directly — this component also
   handles onDoubleClick for pointer devices that fire it reliably. */
function EpButton({ ep, watched, onClick, onDoubleClick }: {
  ep: number
  watched: boolean
  onClick: () => void
  onDoubleClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      onDoubleClick={e => { e.preventDefault(); onDoubleClick() }}
      onContextMenu={e => { e.preventDefault(); onDoubleClick() }}
      className="ep-btn rounded-md border font-bold tabular-nums transition-all select-none"
      aria-label={`Ep ${ep}${watched ? ' (watched)' : ''} — double-tap to fill up to here`}
      aria-pressed={watched}
      style={{
        width: 30, height: 30, fontSize: 10,
        background:  watched ? 'rgba(252,219,50,0.18)' : 'rgba(255,255,255,0.04)',
        borderColor: watched ? 'rgba(252,219,50,0.50)' : 'rgba(255,255,255,0.08)',
        color:       watched ? '#FCDB32'               : 'rgba(148,163,184,0.45)',
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
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 9, color: 'rgba(252,219,50,0.55)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Progreso
        </span>
        <span style={{ fontSize: 10, color: 'rgba(252,219,50,0.80)', fontWeight: 700 }}>
          {done} <span style={{ color: 'rgba(252,219,50,0.40)' }}>/ {total}</span>
        </span>
      </div>
      <div className="w-full rounded-full" style={{ height: 5, background: 'rgba(252,219,50,0.10)' }}>
        <div
          className="rounded-full"
          style={{
            height: 5,
            width: `${pct}%`,
            background: pct === 100
              ? 'linear-gradient(90deg, rgba(252,219,50,0.7) 0%, #FCDB32 100%)'
              : 'linear-gradient(90deg, rgba(252,219,50,0.4) 0%, rgba(252,219,50,0.75) 100%)',
            boxShadow: pct > 0 ? '0 0 6px rgba(252,219,50,0.35)' : 'none',
            transition: 'width 0.25s ease',
          }}
          aria-label={`${Math.round(pct)}% watched`}
        />
      </div>
    </div>
  )
}

/* Season episode card — uses the shared opacity scale */
function SeasonEpisodeCard({ season, episodes, onToggle, onAutoFill, rating }: {
  season: TMDBSeason
  episodes: Record<string, boolean>
  onToggle: (ep: number) => void
  onAutoFill: (ep: number) => void
  rating: number | undefined
}) {
  const [open,  setOpen]  = useState(true)
  const [shown, setShown] = useState(Math.min(season.episode_count, 40))

  const sNum  = season.season_number
  const label = season.name || `Temporada ${sNum}`
  const textColor = getSeasonTextColor(sNum)
  const done  = Object.values(episodes).filter(Boolean).length
  const remaining = season.episode_count - shown

  // Double-tap detection: track the last tap time and episode per card
  const lastTap = useRef<{ ep: number; time: number } | null>(null)
  const DOUBLE_TAP_MS = 300

  useEffect(() => { setShown(Math.min(season.episode_count, 40)) }, [season.episode_count])

  /* Single tap → toggle; double-tap (two taps within 300 ms on same ep) → bulk-fill */
  const handleEpClick = (ep: number) => {
    const now = Date.now()
    if (lastTap.current && lastTap.current.ep === ep && now - lastTap.current.time < DOUBLE_TAP_MS) {
      // Second tap within window → bulk-fill up to this episode
      lastTap.current = null
      onAutoFill(ep)
    } else {
      lastTap.current = { ep, time: now }
      onToggle(ep)
    }
  }

  /* Bulk-fill via onDoubleClick / onContextMenu on EpButton (pointer devices) */
  const handleEpBulkFill = (ep: number) => {
    lastTap.current = null   // clear any pending tap state
    onAutoFill(ep)
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={getSeasonStyle(sNum)}>
      {/* Season accordion header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 transition-opacity active:opacity-70"
        aria-expanded={open}
        aria-controls={`ep-s-${sNum}`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="font-black truncate" style={{ fontSize: 12, color: textColor }}>{label}</span>
          {rating !== undefined && (
            <span className="font-bold tabular-nums flex-shrink-0" style={{ fontSize: 9, color: 'rgba(252,219,50,0.55)' }}>
              ★ {rating.toFixed(1)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span style={{ fontSize: 10, fontWeight: 700, color: done === season.episode_count ? textColor : 'rgba(252,219,50,0.40)' }}>
            {done}/{season.episode_count}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke={textColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s ease', opacity: 0.7 }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Collapsible episode content */}
      <div
        id={`ep-s-${sNum}`}
        style={{ overflow: 'hidden', maxHeight: open ? 9999 : 0, opacity: open ? 1 : 0, transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease' }}
      >
        <div className="px-4 pb-4 flex flex-col gap-3">
          {/* Progress bar */}
          <EpisodeProgressBar done={done} total={season.episode_count} />

          {/* Hint */}
          <p style={{ fontSize: 9, color: 'rgba(252,219,50,0.35)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Toca para marcar · doble toque para rellenar hasta aquí
          </p>

          {/* Episode grid
              · Single tap  → toggle that episode (handleEpClick double-tap-aware)
              · Double-click / right-click / long-press → bulk-fill up to that episode */}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={`${label} episode checklist`}>
            {Array.from({ length: shown }, (_, i) => i + 1).map(ep => (
              <EpButton
                key={ep}
                ep={ep}
                watched={Boolean(episodes[String(ep)])}
                onClick={() => handleEpClick(ep)}
                onDoubleClick={() => handleEpBulkFill(ep)}
              />
            ))}
          </div>

          {/* Show more */}
          {remaining > 0 && (
            <button
              onClick={() => setShown(season.episode_count)}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg transition-opacity active:opacity-60"
              style={{ padding: '7px 12px', background: 'rgba(252,219,50,0.06)', border: '1px solid rgba(252,219,50,0.15)' }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="rgba(252,219,50,0.55)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <span style={{ fontSize: 10, color: 'rgba(252,219,50,0.55)', fontWeight: 600 }}>
                Mostrar más (+{remaining} ep{remaining !== 1 ? 's' : ''})
              </span>
            </button>
          )}

          {/* Show less */}
          {shown > 40 && (
            <button
              onClick={() => setShown(40)}
              className="w-full text-center transition-opacity active:opacity-60"
              style={{ fontSize: 9, color: 'rgba(252,219,50,0.35)', padding: '3px' }}
            >
              Mostrar menos ↑
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
  onToggleEp, onAutoFill,
}: {
  localItem: LocalItem
  seasons: TMDBSeason[]
  loadingData: boolean
  isTV: boolean
  onToggleEp: (sNum: number, ep: number) => void
  onAutoFill: (sNum: number, ep: number) => void
}) {
  if (!isTV) {
    return (
      <div id="dtab-episodes" role="tabpanel" aria-label="Episodes" className="px-4 pb-4">
        <p style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: '32px 0' }}>
          El seguimiento de episodios es solo para series.
        </p>
      </div>
    )
  }

  return (
    <div id="dtab-episodes" role="tabpanel" aria-label="Episodes" className="px-4 flex flex-col gap-3 pb-4">
      {loadingData && seasons.length === 0 && (
        <div className="flex items-center gap-2" style={{ color: 'var(--text-faint)', fontSize: 12 }}>
          <Spinner /> Cargando temporadas…
        </div>
      )}
      {!loadingData && seasons.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: '24px 0' }}>
          Sin datos de temporadas.
        </p>
      )}
      {seasons.slice(0, 15).map(season => {
        const sd = localItem.seasonData?.[String(season.season_number)] ?? { episodes: {} }
        return (
          <SeasonEpisodeCard
            key={season.season_number}
            season={season}
            episodes={sd.episodes}
            rating={sd.rating}
            onToggle={ep  => onToggleEp(season.season_number, ep)}
            onAutoFill={ep => onAutoFill(season.season_number, ep)}
          />
        )
      })}
      {seasons.length > 15 && (
        <p style={{ fontSize: 10, color: 'var(--text-faint)', textAlign: 'center' }}>
          Mostrando 15 de {seasons.length} temporadas
        </p>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   TAB NAV — Circular Notch / Floating Bubble
   Active:   filled circle #FCDB32 with drop shadow, dark icon + bold label
   Inactive: transparent, slate icon, no label shown / subtle label
   ───────────────────────────────────────────────────────────── */
function IconInfo({ active }: { active: boolean }) {
  const c = active ? '#0D1326' : 'rgba(148,163,184,0.65)'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}
function IconStar({ active }: { active: boolean }) {
  const c = active ? '#0D1326' : 'rgba(148,163,184,0.65)'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}
function IconPlay({ active }: { active: boolean }) {
  const c = active ? '#0D1326' : 'rgba(148,163,184,0.65)'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
      <polyline points="17 2 12 7 7 2" />
    </svg>
  )
}

/* Tab IDs remapped to new names */
type TabId = 'info' | 'rating' | 'episodes'

const NAV_TABS: { id: TabId; label: string; Icon: React.FC<{ active: boolean }> }[] = [
  { id: 'info',     label: 'Info',     Icon: IconInfo },
  { id: 'rating',   label: 'Rating',   Icon: IconStar },
  { id: 'episodes', label: 'Episodes', Icon: IconPlay  },
]

function TabNav({ activeTab, onSelect, showEpisodes }: {
  activeTab: TabId
  onSelect: (t: TabId) => void
  showEpisodes: boolean
}) {
  return (
    <div
      className="flex items-center justify-around px-4 py-3"
      role="tablist"
      aria-label="Drawer sections"
      style={{ borderBottom: '1px solid var(--border-dim)' }}
    >
      {NAV_TABS.map(t => {
        if (t.id === 'episodes' && !showEpisodes) return null
        const active = activeTab === t.id
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            aria-controls={`dtab-${t.id}`}
            onClick={() => onSelect(t.id)}
            className="flex flex-col items-center gap-1 transition-all duration-200 active:scale-90 relative"
            style={{ minWidth: 64 }}
          >
            {/* Circular bubble: active = filled yellow circle; inactive = bare icon */}
            <div
              className="flex items-center justify-center rounded-full transition-all duration-200"
              style={active
                ? {
                    width: 48, height: 48,
                    background: '#FCDB32',
                    boxShadow: '0 4px 16px rgba(252,219,50,0.35), 0 2px 6px rgba(0,0,0,0.30)',
                  }
                : {
                    width: 48, height: 48,
                    background: 'transparent',
                  }
              }
            >
              <t.Icon active={active} />
            </div>
            {/* Label: always visible, highlighted when active */}
            <span
              className="font-bold transition-colors duration-200"
              style={{
                fontSize: 10,
                color:      active ? '#FCDB32' : 'rgba(148,163,184,0.50)',
                letterSpacing: '0.02em',
              }}
            >
              {t.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ── Main BottomSheet ──────────────────────────────────────── */
export default function BottomSheet() {
  const { sheet, closeSheet, upsertItem, removeItem, showToast, settings, library } = useStore()

  const [localItem,   setLocalItem]   = useState<LocalItem | null>(null)
  const [providers,   setProviders]   = useState<TMDBProvider[]>([])
  const [seasons,     setSeasons]     = useState<TMDBSeason[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [loadingOmdb, setLoadingOmdb] = useState(false)
  const [activeTab,   setActiveTab]   = useState<TabId>('info')
  const [isDirty,     setIsDirty]     = useState(false)
  const [showDirty,   setShowDirty]   = useState(false)
  // Ref mirrors isDirty so requestClose always reads current value from stale closures
  const isDirtyRef = useRef(false)
  const [providersOpen, setProvidersOpen] = useState(true)
  const [criticOpen,    setCriticOpen]    = useState(true)

  const touchStartY  = useRef<number | null>(null)
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
      setLocalItem(null); setProviders([]); setSeasons([])
      setIsDirty(false); isDirtyRef.current = false; setShowDirty(false)
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
    setActiveTab('info')
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
    showToast('Saved to library')
  }, [localItem, upsertItem, showToast])

  const handleSave   = useCallback(async () => { await doSave(); closeSheet() }, [doSave, closeSheet])
  const handleRemove = useCallback(async () => {
    if (!localItem) return
    await removeItem(localItem.id); showToast('Removed from library')
    setIsDirty(false); isDirtyRef.current = false; closeSheet()
  }, [localItem, removeItem, showToast, closeSheet])

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
  const typeLabel        = result.media_type === 'movie' ? 'Movie' : localItem.type === 'anime' ? 'Anime' : 'Series'
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

        {/* Drag handle */}
        <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '10px auto 0' }} aria-hidden="true" />

        {/* ══════════════════════════════════════════════════════
            HEADER: poster · title · scores · STATUS PILL
            ══════════════════════════════════════════════════════ */}
        <div className="flex gap-3 px-4 pt-3 pb-0">

          {/* Poster */}
          <div className="flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
            style={{ width: 52, height: 76, background: 'var(--surface-2)', border: '1px solid var(--border-dim)' }}>
            {posterSrc
              ? <Image src={posterSrc} alt={`${localItem.title} poster`} width={52} height={76} className="w-full h-full object-cover" unoptimized />
              : <span style={{ fontSize: 24 }} aria-hidden="true">{localItem.type === 'movies' ? '🎬' : localItem.type === 'anime' ? '⛩️' : '📺'}</span>}
          </div>

          {/* Title + scores */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h2 className="font-black text-white leading-snug" style={{ fontSize: 15 }}>{localItem.title}</h2>

            {/* Score row */}
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

            <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>
              {localItem.year}{localItem.year ? ' · ' : ''}{typeLabel}
            </span>
          </div>

          {/* Close button + status pill */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0" style={{ paddingTop: 2 }}>
            <button onClick={() => requestClose()} aria-label="Close"
              className="flex items-center justify-center rounded-full transition-opacity active:opacity-50"
              style={{ width: 28, height: 28, background: 'var(--surface-3)', color: 'var(--text-muted)', fontSize: 18, border: '1px solid var(--border-dim)' }}>
              ×
            </button>
            <StatusPill status={localItem.status} onChange={setStatus} />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            CIRCULAR NOTCH BUBBLE TAB NAV
            ══════════════════════════════════════════════════════ */}
        <TabNav
          activeTab={activeTab}
          onSelect={setActiveTab}
          showEpisodes={isTV}
        />

        {/* ── Tab content ── */}
        <div style={{ minHeight: '52vh' }} className="pt-4">

          {/* TAB 1: INFO */}
          {activeTab === 'info' && (
            <div id="dtab-info" role="tabpanel" aria-label="Info" className="px-4 flex flex-col gap-4 pb-4">
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

              {/* ── Notas Privadas (moved here from Rating tab) ── */}
              <div className="rounded-xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-dim)' }}>
                <p className="font-black text-white uppercase tracking-widest mb-3" style={{ fontSize: 10 }}>Notas privadas</p>
                <textarea
                  value={localItem.notes || ''}
                  onChange={e => update({ notes: e.target.value })}
                  placeholder="Tus opiniones, spoilers, recomendaciones…"
                  aria-label="Private notes"
                  rows={4}
                  className="w-full rounded-lg px-3 py-2.5 text-[13px] text-white resize-none"
                  style={{ background: 'var(--surface-3)', border: '1px solid var(--border-dim)', lineHeight: 1.6 }}
                />
              </div>
            </div>
          )}

          {/* TAB 2: RATING */}
          {activeTab === 'rating' && (
            <RatingTab
              localItem={localItem}
              seasons={seasons}
              loadingData={loadingData}
              isTV={isTV}
              seasonAvg={seasonAvg}
              onGlobalRating={v => update({ userRating: v })}
              onSeasonRating={updateSeasonRating}
            />
          )}

          {/* TAB 3: EPISODES */}
          {activeTab === 'episodes' && (
            <EpisodesTab
              localItem={localItem}
              seasons={seasons}
              loadingData={loadingData}
              isTV={isTV}
              onToggleEp={toggleEpisode}
              onAutoFill={autoFillUpTo}
            />
          )}
        </div>

        <Divider />

        {/* ── Action buttons — sun ONLY on primary Save ── */}
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

      {/* ── Unsaved-changes modal ── */}
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
