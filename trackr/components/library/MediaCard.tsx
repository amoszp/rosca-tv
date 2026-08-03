'use client'
import { useState } from 'react'
import Image from 'next/image'
import type { LibraryItem, Status } from '@/lib/types'
import { posterUrl } from '@/lib/tmdb'

/* Nordic Minimal status styles */
const SS: Record<Status, { bg: string; text: string; dot: string; border: string; label: string }> = {
  pending:  { bg: 'rgba(180,83,9,0.20)',     text: '#fca56a', dot: '#d97706', border: 'rgba(180,83,9,0.30)',     label: 'Pending'  },
  watching: { bg: 'rgba(16,185,129,0.15)',   text: '#34d399', dot: '#10b981', border: 'rgba(16,185,129,0.30)',   label: 'Watching' },
  watched:  { bg: 'rgba(100,116,139,0.15)',  text: '#94a3b8', dot: '#64748b', border: 'rgba(100,116,139,0.30)',  label: 'Watched'  },
}
const TE: Record<string, string> = { movies: '🎬', series: '📺', anime: '⛩️' }

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
  const ss        = status ? SS[status] : null
  const posterSrc = posterUrl(item.poster, 'w185')
  const hasPoster = Boolean(posterSrc) && !imgError
  const { score, isAvg } = criticScore(item)

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); setExiting(true); setTimeout(() => onDelete(), 240)
  }

  return (
    <article onClick={onPress} role="button" tabIndex={0}
      aria-label={`${item.title}${status ? ` — ${SS[status]?.label}` : ''}`}
      onKeyDown={e => e.key === 'Enter' && onPress()}
      className="flex gap-3 rounded-lg overflow-hidden cursor-pointer"
      style={{
        background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)',
        border: '1px solid var(--border-dim)', padding: '10px', boxShadow: 'var(--shadow-sm)',
        opacity: exiting ? 0 : 1, transform: exiting ? 'translateX(52px) scaleY(0.82)' : 'none',
        transition: exiting ? 'all 240ms ease' : 'opacity 140ms ease',
      }}>
      {/* Poster */}
      <div className="flex-shrink-0 rounded-md overflow-hidden flex items-center justify-center"
        style={{ width: 46, height: 68, border: '1px solid var(--border-dim)', position: 'relative', background: 'var(--surface-3)' }}>
        {syncing && !hasPoster && <div className="skeleton absolute inset-0" style={{ borderRadius: 8 }} aria-hidden="true" />}
        {hasPoster
          ? <Image src={posterSrc} alt={`${item.title} poster`} width={46} height={68} className="w-full h-full object-cover" unoptimized onError={() => setImgError(true)} />
          : !syncing ? <span style={{ fontSize: 22 }} aria-hidden="true">{TE[item.type] || '🎬'}</span>
          : null}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between" style={{ paddingTop: 2, paddingBottom: 2 }}>
        <div>
          {syncing && !item.title
            ? <div className="skeleton" style={{ height: 12, width: '70%', marginBottom: 7 }} aria-hidden="true" />
            : <p className="font-bold text-white truncate" style={{ fontSize: 13, lineHeight: 1.3 }}>{item.title}</p>}
          <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2, marginBottom: 6 }}>{item.year}</p>
          {/* Status badge — Nordic Minimal colours */}
          {ss && (
            <span className="inline-flex items-center gap-1.5 rounded-full font-semibold"
              style={{ background: ss.bg, color: ss.text, border: `1px solid ${ss.border}`, fontSize: 10, padding: '2px 8px 2px 6px' }}
              aria-label={`Status: ${ss.label}`}>
              <span className="rounded-full flex-shrink-0" style={{ width: 5, height: 5, background: ss.dot }} aria-hidden="true" />
              {ss.label}
            </span>
          )}
        </div>

        {/* Score row */}
        <div className="flex items-center gap-2 mt-2">
          {/* Critic score — #FCDB32 ONLY for AVG, plain text for TMDB-only */}
          {score && (
            <div className="flex items-center gap-1 flex-shrink-0"
              aria-label={isAvg ? `Average score ${score}` : `TMDB score ${score}`}>
              <span style={{ fontSize: 12, color: isAvg ? 'var(--sun)' : 'var(--text-muted)', lineHeight: 1 }} aria-hidden="true">★</span>
              <span className="font-bold tabular-nums" style={{ fontSize: 12, color: isAvg ? 'var(--sun)' : 'var(--text-2)' }}>
                {score}
              </span>
              {isAvg && (
                <span className="rounded font-black uppercase"
                  style={{ fontSize: 7, color: 'rgba(252,219,50,0.6)', background: 'rgba(252,219,50,0.12)', padding: '1px 4px', marginLeft: 2, letterSpacing: '0.06em' }}
                  aria-hidden="true">AVG</span>
              )}
            </div>
          )}
          {/* Personal rating — neutral blue, distinct from critic */}
          {item.userRating !== undefined && (
            <div className="flex items-center gap-1 flex-shrink-0" aria-label={`Your rating ${item.userRating.toFixed(1)}`}>
              <span style={{ fontSize: 11, color: '#7da4c7', lineHeight: 1 }} aria-hidden="true">♥</span>
              <span className="font-semibold tabular-nums" style={{ fontSize: 11, color: '#7da4c7' }}>{item.userRating.toFixed(1)}</span>
            </div>
          )}
          {syncing && !hasPoster && (
            <span className="flex items-center gap-1" style={{ fontSize: 9, color: 'var(--text-faint)' }} aria-live="polite">
              <span className="inline-block rounded-full" style={{ width: 7, height: 7, border: '1.5px solid var(--border)', borderTopColor: 'rgba(255,255,255,0.4)', animation: 'spin 1s linear infinite' }} aria-hidden="true" />
              syncing
            </span>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={e => { e.stopPropagation(); onPress() }} aria-label={`Edit ${item.title}`}
              className="flex items-center gap-1 rounded-md transition-opacity active:opacity-50"
              style={{ background: 'var(--surface-3)', border: '1px solid var(--border-dim)', padding: '4px 8px', fontSize: 11, color: 'var(--text-muted)', minHeight: 27 }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit
            </button>
            <button onClick={handleDelete} aria-label={`Delete ${item.title}`}
              className="flex items-center justify-center rounded-md transition-transform active:scale-90"
              style={{ width: 27, height: 27, background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.18)', color: '#ef8c86' }}>
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
