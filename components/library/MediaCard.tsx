'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import type { LibraryItem, Status } from '@/lib/types'
import { posterUrl } from '@/lib/tmdb'
import { STATUS_STYLES } from '@/lib/statusStyles'
import { useT, statusLabel, type Translations } from '@/lib/i18n'
import MediaTypeIcon from '@/components/ui/MediaTypeIcon'

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

function criticScore(item: LibraryItem): { score: string | null; isAvg: boolean } {
  const tmdb = parseFloat(item.tmdbRating || '0')
  if (isNaN(tmdb) || tmdb === 0) return { score: null, isAvg: false }
  if (item.imdbRating) {
    const imdb = parseFloat(item.imdbRating)
    if (!isNaN(imdb) && imdb > 0) return { score: ((tmdb + imdb) / 2).toFixed(1), isAvg: true }
  }
  return { score: tmdb.toFixed(1), isAvg: false }
}

/* Dot-only status indicator — tap opens a small popover to set the status
   right from the list, without opening the full edit sheet. Rendered via
   portal so it isn't clipped by the card's swipe-reveal overflow-hidden. */
function StatusDot({ status, onChange, t }: { status: Status | null; onChange: (s: Status | null) => void; t: Translations }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const dotRef  = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (dotRef.current?.contains(e.target as Node)) return
      if (menuRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('scroll', close, true)
    }
  }, [open])

  const c = status ? STATUS_STYLES[status] : null

  return (
    <>
      <button ref={dotRef}
        onPointerDown={e => e.stopPropagation()}
        onPointerMove={e => e.stopPropagation()}
        onPointerUp={e => e.stopPropagation()}
        onClick={e => {
          e.stopPropagation()
          const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
          setPos({ top: r.bottom + 6, left: Math.min(r.left - 100, window.innerWidth - 164) })
          setOpen(v => !v)
        }} aria-haspopup="listbox" aria-expanded={open}
        aria-label={c ? t.status.tapToChange(statusLabel(t, status)) : t.status.setStatus}
        className="flex items-center gap-1.5 rounded-full font-semibold flex-shrink-0 transition-transform active:scale-90"
        style={{
          fontSize: 10, padding: '3px 10px 3px 8px', minHeight: 24,
          background: c ? c.bg : 'var(--surface-3)', color: c ? c.text : 'var(--text-muted)',
          border: `1px solid ${c ? c.border : 'var(--border-dim)'}`,
        }}>
        <span className="rounded-full flex-shrink-0" style={{ width: 6, height: 6, background: c ? c.dot : 'var(--border)' }} aria-hidden="true" />
        {c ? statusLabel(t, status) : t.status.none}
      </button>

      {open && createPortal(
        <div ref={menuRef} onClick={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
          onPointerMove={e => e.stopPropagation()}
          onPointerUp={e => e.stopPropagation()}
          className="fixed rounded-2xl overflow-hidden animate-pop glass-strong"
          style={{ top: pos.top, left: pos.left, background: 'var(--surface-2)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.6)', minWidth: 148, zIndex: 200 }}
          role="listbox" aria-label={t.status.setStatus}>
          {(Object.entries(STATUS_STYLES) as [Status, typeof STATUS_STYLES[Status]][]).map(([id, sc]) => {
            const isActive = status === id
            return (
              <button key={id} role="option" aria-selected={isActive}
                onClick={() => { onChange(isActive ? null : id); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors text-left"
                style={{ background: isActive ? sc.bg : 'transparent', borderBottom: '1px solid var(--border-dim)' }}>
                <span className="rounded-full flex-shrink-0" style={{ width: 7, height: 7, background: sc.dot }} aria-hidden="true" />
                <span className="font-semibold flex-1" style={{ fontSize: 12, color: isActive ? sc.text : 'var(--text-2)' }}>{t.status[id]}</span>
                {isActive && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={sc.text} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
          <button role="option" aria-selected={status === null}
            onClick={() => { onChange(null); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors text-left"
            style={{ background: status === null ? 'rgba(255,255,255,0.04)' : 'transparent' }}>
            <span className="rounded-full flex-shrink-0" style={{ width: 7, height: 7, background: 'rgba(148,163,184,0.3)' }} aria-hidden="true" />
            <span className="font-semibold flex-1" style={{ fontSize: 12, color: 'rgba(148,163,184,0.6)' }}>{t.status.none}</span>
          </button>
        </div>,
        document.body
      )}
    </>
  )
}

interface Props { item: LibraryItem; onPress: () => void; onDelete: () => void; onStatusChange: (status: Status | null) => void; syncing?: boolean }

const SWIPE_OPEN   = -76   // past the halfway point of this on release → stays open
const SWIPE_DELETE = -200  // release past this → deletes outright, no need to tap the button
const DRAG_MIN      = -240 // clamp limit while actively dragging (slight overtravel past delete)

export default function MediaCard({ item, onPress, onDelete, onStatusChange, syncing = false }: Props) {
  const t = useT()
  const [exiting,   setExiting]   = useState(false)
  const [imgError,  setImgError]  = useState(false)
  const [dragX,     setDragX]     = useState(0)
  const [dragging,  setDragging]  = useState(false)
  const dragStartRef = useRef({ x: 0, base: 0, moved: false })

  const status    = item.status as Status | null
  const posterSrc = posterUrl(item.poster, 'w185')
  const hasPoster = Boolean(posterSrc) && !imgError
  const { score, isAvg } = criticScore(item)
  const accentBar  = status ? STATUS_STYLES[status].dot : 'var(--border)'
  // Faint glow hugging the left edge only (where the status accent bar sits),
  // not an all-around halo — pushed left and shrunk via negative offset/spread
  // so it barely bleeds past the card's other three sides.
  const accentGlow = status ? hexToRgba(STATUS_STYLES[status].dot, 0.28) : 'rgba(58,51,99,0.22)'

  const handleDelete = () => {
    setExiting(true); setTimeout(() => onDelete(), 240)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragStartRef.current = { x: e.clientX, base: dragX, moved: false }
    setDragging(true)
  }
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    const delta = e.clientX - dragStartRef.current.x
    if (Math.abs(delta) > 4) dragStartRef.current.moved = true
    const next = Math.min(0, Math.max(DRAG_MIN, dragStartRef.current.base + delta))
    setDragX(next)
  }
  const handlePointerUp = (e: React.PointerEvent) => {
    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    }
    setDragging(false)
    if (dragX <= SWIPE_DELETE) { handleDelete(); return }
    setDragX(dragX < SWIPE_OPEN / 2 ? SWIPE_OPEN : 0)
  }

  const handleCardClick = () => {
    if (dragStartRef.current.moved) return
    if (dragX !== 0) { setDragX(0); return }
    onPress()
  }

  // 0 at rest → 1 fully revealed, drives the delete button fading/growing in
  // as it's uncovered instead of sitting fully visible behind the card at rest.
  const reveal = Math.min(1, dragX / SWIPE_OPEN)
  // 0→1 across the extra travel past SWIPE_OPEN up to SWIPE_DELETE — the
  // button intensifies (deeper red, no more growing) as you near the point
  // where letting go deletes outright instead of just staying open.
  const armed = Math.max(0, Math.min(1, (dragX - SWIPE_OPEN) / (SWIPE_DELETE - SWIPE_OPEN)))
  // Manual RGB lerp from the base red (#f43f5e) to a deeper red (#be123c) as
  // `armed` climbs — avoids relying on color-mix() for iOS Safari support.
  const deleteBg = `rgb(${Math.round(244 - 54 * armed)}, ${Math.round(63 - 45 * armed)}, ${Math.round(94 - 34 * armed)})`

  return (
    <div className="relative">
      {/* Swipe-reveal delete action, sits behind the card — invisible at rest,
          fades and scales in smoothly as the card is dragged to uncover it.
          The wrapper is NOT overflow-hidden: clipping it would also clip the
          card's own poster/left edge as it translates left to reveal this. */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-center"
        style={{ width: -dragX, transition: dragging ? 'none' : 'width 220ms cubic-bezier(0.32,0.72,0,1)' }}>
        <button onClick={handleDelete} aria-label={t.library.deleteAria(item.title)}
          className="flex items-center justify-center active:scale-90 transition-transform"
          style={{
            width: 64, height: '100%', borderRadius: 20,
            background: deleteBg,
            color: '#fff', opacity: reveal,
            boxShadow: '0 4px 14px rgba(244,63,94,0.35)',
            transition: dragging ? 'none' : 'opacity 220ms cubic-bezier(0.32,0.72,0,1), background 120ms linear',
          }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            style={{ transform: `scale(${0.6 + reveal * 0.4})`, transition: dragging ? 'none' : 'transform 220ms cubic-bezier(0.32,0.72,0,1)' }}>
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>

      <article onClick={handleCardClick} role="button" tabIndex={0}
        aria-label={`${item.title}${status ? ` — ${t.status[status]}` : ''}`}
        onKeyDown={e => e.key === 'Enter' && onPress()}
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}
        className="relative flex gap-3.5 rounded-3xl overflow-hidden cursor-pointer glass"
        style={{
          padding: '12px 14px 12px 12px', boxShadow: `0 10px 26px rgba(0,0,0,0.42), -8px 0 20px -8px ${accentGlow}`,
          borderLeft: `3px solid ${accentBar}`,
          opacity: exiting ? 0 : 1,
          // Compact from the right instead of translating — poster and title
          // stay put, only the card's own width shrinks to uncover the
          // delete panel sitting behind it, so nothing scrolls off-frame.
          // Deleting keeps compacting the same way (to 0) instead of switching
          // to a different exit motion — swiping all the way through just
          // continues the same gesture to its natural conclusion.
          width: exiting ? '0%' : `calc(100% - ${-dragX}px)`,
          transition: exiting ? 'width 240ms ease, opacity 200ms ease 40ms' : dragging ? 'none' : 'opacity 140ms ease, width 220ms cubic-bezier(0.32,0.72,0,1)',
          touchAction: 'pan-y',
        }}>
        {/* Poster */}
        <div className="flex-shrink-0 rounded-2xl overflow-hidden flex items-center justify-center"
          style={{ width: 56, height: 82, border: '1px solid var(--border-dim)', position: 'relative', background: 'var(--surface-3)' }}>
          {syncing && !hasPoster && <div className="skeleton absolute inset-0" style={{ borderRadius: 16 }} aria-hidden="true" />}
          {hasPoster
            ? <Image src={posterSrc} alt={`${item.title} poster`} width={56} height={82} className="w-full h-full object-cover" unoptimized onError={() => setImgError(true)} />
            : !syncing ? <MediaTypeIcon type={item.type} size={24} color="var(--text-faint)" />
            : null}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between" style={{ paddingTop: 2, paddingBottom: 2 }}>
          {/* Title row — title with the year stacked below it own the left,
              personal rating anchors the far right, sitting directly above
              the status dot below it */}
          <div className="flex items-start justify-between gap-2 min-w-0">
            <div className="flex flex-col min-w-0">
              {syncing && !item.title
                ? <div className="skeleton" style={{ height: 13, width: '50%' }} aria-hidden="true" />
                : <p className="font-bold text-white truncate" style={{ fontSize: 14, lineHeight: 1.3, letterSpacing: '-0.1px' }}>{item.title}</p>}
              <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 600, marginTop: 2 }}>{item.year}</span>
            </div>
            {item.userRating !== undefined && (
              <div className="flex items-center gap-1 flex-shrink-0" aria-label={`Your rating ${item.userRating.toFixed(1)}`}>
                <span style={{ fontSize: 11, color: 'var(--my-rating-dot)', lineHeight: 1 }} aria-hidden="true">♥</span>
                <span className="font-semibold tabular-nums" style={{ fontSize: 11, color: 'var(--my-rating-text)' }}>{item.userRating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Score row — critic score, sync indicator, status dot */}
          <div className="flex items-center gap-2 mt-2.5">
            {/* Critic score — gradient accent ONLY for AVG, plain text for TMDB-only */}
            {score && (
              <div className="flex items-center gap-1 flex-shrink-0 rounded-full"
                style={{
                  padding: '2px 8px 2px 6px',
                  background: isAvg ? 'rgba(249,115,22,0.14)' : 'var(--surface-3)',
                }}
                aria-label={isAvg ? `Average score ${score}` : `TMDB score ${score}`}>
                <span style={{ fontSize: 11, color: isAvg ? 'var(--accent)' : 'var(--text-muted)', lineHeight: 1 }} aria-hidden="true">★</span>
                <span className="font-bold tabular-nums" style={{ fontSize: 11, color: isAvg ? 'var(--accent)' : 'var(--text-2)' }}>
                  {score}
                </span>
                {isAvg && (
                  <span className="rounded font-black uppercase gradient-text"
                    style={{ fontSize: 7, padding: '1px 4px', marginLeft: 2, letterSpacing: '0.06em' }}
                    aria-hidden="true">AVG</span>
                )}
              </div>
            )}
            {syncing && !hasPoster && (
              <span className="flex items-center gap-1" style={{ fontSize: 9, color: 'var(--text-faint)' }} aria-live="polite">
                <span className="inline-block rounded-full" style={{ width: 7, height: 7, border: '1.5px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite' }} aria-hidden="true" />
                {t.library.syncingLabel}
              </span>
            )}
            <div className="ml-auto">
              <StatusDot status={status} onChange={onStatusChange} t={t} />
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}
