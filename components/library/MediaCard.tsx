'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'
import type { LibraryItem, Status } from '@/lib/types'
import { posterUrl } from '@/lib/tmdb'

const STATUS_STYLE: Record<Status, { bg: string; text: string; dot: string }> = {
  pending:  { bg: 'rgba(234,179,8,0.15)',  text: '#fde68a', dot: '#f59e0b' },
  watching: { bg: 'rgba(59,130,246,0.15)', text: '#93c5fd', dot: '#3b82f6' },
  watched:  { bg: 'rgba(34,197,94,0.15)',  text: '#86efac', dot: '#22c55e' },
}
const STATUS_LABEL: Record<Status, string> = {
  pending: 'Pending', watching: 'Watching', watched: 'Watched',
}
const TYPE_EMOJI: Record<string, string> = {
  movies: '🎬', series: '📺', anime: '⛩️',
}

interface Props {
  item: LibraryItem
  onPress: () => void
  onDelete: () => void
}

export default function MediaCard({ item, onPress, onDelete }: Props) {
  const [exiting, setExiting] = useState(false)
  const status = (item.status || 'pending') as Status
  const st = STATUS_STYLE[status]
  const posterSrc = posterUrl(item.poster, 'w154')

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setExiting(true)
    setTimeout(() => onDelete(), 240)
  }

  return (
    <div
      onClick={onPress}
      className="flex gap-3 rounded-[12px] overflow-hidden active:opacity-80 transition-all duration-200 cursor-pointer"
      style={{
        background: 'linear-gradient(135deg, var(--dp-red) 0%, var(--dp-brown-2) 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateX(48px) scaleY(0.85)' : 'none',
        transitionDuration: exiting ? '240ms' : '150ms',
        padding: '10px',
      }}
    >
      {/* Poster */}
      <div
        className="flex-shrink-0 rounded-[7px] overflow-hidden flex items-center justify-center"
        style={{ width: 46, height: 68, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {posterSrc
          ? <Image src={posterSrc} alt={item.title} width={46} height={68} className="w-full h-full object-cover" unoptimized />
          : <span style={{ fontSize: 22 }}>{TYPE_EMOJI[item.type] || '🎬'}</span>
        }
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 flex flex-col justify-between" style={{ paddingTop: 2, paddingBottom: 2 }}>
        <div>
          <p className="font-bold text-white truncate" style={{ fontSize: 13, lineHeight: 1.3 }}>{item.title}</p>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, marginBottom: 6 }}>{item.year}</p>
          {/* Status badge */}
          <span
            className="inline-flex items-center gap-1.5 rounded-full font-semibold"
            style={{ background: st.bg, color: st.text, fontSize: 10, padding: '2px 8px 2px 6px' }}
          >
            <span className="rounded-full flex-shrink-0" style={{ width: 5, height: 5, background: st.dot }} />
            {STATUS_LABEL[status]}
          </span>
        </div>

        {/* Ratings + actions */}
        <div className="flex items-center gap-2 mt-2">
          <span className="flex items-center gap-1 font-semibold" style={{ fontSize: 11, color: '#fbbf24' }}>
            ★ {item.tmdbRating}
          </span>
          {item.userRating !== undefined && (
            <span className="flex items-center gap-1 font-semibold" style={{ fontSize: 11, color: '#93c5fd' }}>
              ★ {item.userRating.toFixed(1)}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onPress() }}
              className="flex items-center gap-1 rounded-[7px] active:opacity-60"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)', padding: '4px 8px', fontSize: 11, color: 'rgba(255,255,255,0.65)' }}
            >
              <PencilIcon /> Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center justify-center rounded-[7px] active:scale-90 transition-transform"
              style={{ width: 27, height: 27, background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)', color: '#f87171' }}
              aria-label="Delete"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PencilIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}
