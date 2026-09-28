'use client'
import { useState } from 'react'
import Image from 'next/image'
import type { LibraryItem, Status } from '@/lib/types'
import { posterUrl } from '@/lib/tmdb'
import { STATUS_STYLES } from '@/lib/statusStyles'
import StatusBadge from '@/components/ui/StatusBadge'
import MediaTypeIcon from '@/components/ui/MediaTypeIcon'

function criticScore(item: LibraryItem): { score: string | null; isAvg: boolean } {
  const tmdb = parseFloat(item.tmdbRating || '0')
  if (isNaN(tmdb) || tmdb === 0) return { score: null, isAvg: false }
  if (item.imdbRating) {
    const imdb = parseFloat(item.imdbRating)
    if (!isNaN(imdb) && imdb > 0) return { score: ((tmdb + imdb) / 2).toFixed(1), isAvg: true }
  }
  return { score: tmdb.toFixed(1), isAvg: false }
}

interface Props { item: LibraryItem; onPress: () => void; onDelete: () => void; syncing?: boolean }

export default function MediaCard({ item, onPress, onDelete, syncing = false }: Props) {
  const [exiting,  setExiting]  = useState(false)
  const [imgError, setImgError] = useState(false)

  const status    = item.status as Status | null
  const posterSrc = posterUrl(item.poster, 'w185')
  const hasPoster = Boolean(posterSrc) && !imgError
  const { score, isAvg } = criticScore(item)
  const accentBar = status ? STATUS_STYLES[status].dot : 'var(--border)'

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); setExiting(true); setTimeout(() => onDelete(), 240)
  }

  return (
    <article onClick={onPress} role="button" tabIndex={0}
      aria-label={`${item.title}${status ? ` — ${STATUS_STYLES[status]?.label}` : ''}`}
      onKeyDown={e => e.key === 'Enter' && onPress()}
      className="flex gap-3.5 rounded-3xl overflow-hidden cursor-pointer glass"
      style={{
        padding: '12px 14px 12px 12px', boxShadow: 'var(--shadow-sm)',
        borderLeft: `3px solid ${accentBar}`,
        opacity: exiting ? 0 : 1, transform: exiting ? 'translateX(52px) scaleY(0.82)' : 'none',
        transition: exiting ? 'all 240ms ease' : 'opacity 140ms ease, transform 140ms ease',
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
        <div>
          {syncing && !item.title
            ? <div className="skeleton" style={{ height: 13, width: '70%', marginBottom: 7 }} aria-hidden="true" />
            : <p className="font-bold text-white truncate" style={{ fontSize: 14, lineHeight: 1.3, letterSpacing: '-0.1px' }}>{item.title}</p>}
          <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2, marginBottom: 7, fontWeight: 600 }}>{item.year}</p>
          <StatusBadge status={status} />
        </div>

        {/* Score row */}
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
          {/* Personal rating — teal, distinct from critic accent */}
          {item.userRating !== undefined && (
            <div className="flex items-center gap-1 flex-shrink-0" aria-label={`Your rating ${item.userRating.toFixed(1)}`}>
              <span style={{ fontSize: 11, color: 'var(--watching-dot)', lineHeight: 1 }} aria-hidden="true">♥</span>
              <span className="font-semibold tabular-nums" style={{ fontSize: 11, color: 'var(--watching-text)' }}>{item.userRating.toFixed(1)}</span>
            </div>
          )}
          {syncing && !hasPoster && (
            <span className="flex items-center gap-1" style={{ fontSize: 9, color: 'var(--text-faint)' }} aria-live="polite">
              <span className="inline-block rounded-full" style={{ width: 7, height: 7, border: '1.5px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite' }} aria-hidden="true" />
              syncing
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button onClick={e => { e.stopPropagation(); onPress() }} aria-label={`Edit ${item.title}`}
              className="flex items-center gap-1 rounded-xl transition-opacity active:opacity-50"
              style={{ background: 'var(--surface-3)', border: '1px solid var(--border-dim)', padding: '6px 10px', fontSize: 11, color: 'var(--text-muted)', minHeight: 32, fontWeight: 600 }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit
            </button>
            <button onClick={handleDelete} aria-label={`Delete ${item.title}`}
              className="flex items-center justify-center rounded-xl transition-transform active:scale-90"
              style={{ width: 32, height: 32, background: 'rgba(244,63,94,0.10)', border: '1px solid rgba(244,63,94,0.22)', color: '#fb7185' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
