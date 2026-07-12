'use client'
import Image from 'next/image'
import type { TMDBResult, Status } from '@/lib/types'
import { posterUrl, getTitle, getYear, formatRating, detectAnime } from '@/lib/tmdb'

const BADGE: Record<Status, { bg: string; text: string }> = {
  pending:  { bg: 'rgba(234,179,8,0.18)',  text: '#fde68a' },
  watching: { bg: 'rgba(59,130,246,0.18)', text: '#93c5fd' },
  watched:  { bg: 'rgba(34,197,94,0.18)',  text: '#86efac' },
}
const BADGE_LABEL: Record<Status, string> = {
  pending: 'Pending', watching: 'Watching', watched: 'Watched',
}

interface Props {
  result: TMDBResult
  libStatus: Status | null
  inLibrary: boolean
  onPress: () => void
  onInstantAdd: () => void
}

export default function SearchResultItem({ result, libStatus, inLibrary, onPress, onInstantAdd }: Props) {
  const title     = getTitle(result)
  const year      = getYear(result)
  const rating    = formatRating(result.vote_average)
  const posterSrc = posterUrl(result.poster_path, 'w92')
  const isAnime   = detectAnime(result)
  const typeLabel = result.media_type === 'movie' ? 'Movie' : isAnime ? 'Anime' : 'Series'
  const emoji     = result.media_type === 'movie' ? '🎬' : isAnime ? '⛩️' : '📺'

  return (
    <div
      onClick={onPress}
      className="flex items-center gap-2.5 px-4 py-2 cursor-pointer active:opacity-70 transition-opacity"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Poster */}
      <div
        className="flex-shrink-0 rounded-[5px] overflow-hidden flex items-center justify-center"
        style={{ width: 38, height: 56, background: 'var(--dp-red)' }}
      >
        {posterSrc
          ? <Image src={posterSrc} alt={title} width={38} height={56} className="w-full h-full object-cover" unoptimized />
          : <span style={{ fontSize: 15 }}>{emoji}</span>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate leading-tight" style={{ fontSize: 13 }}>{title}</p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
          {year}{year ? ' · ' : ''}{typeLabel}
          <span style={{ color: '#fbbf24' }}> · ★ {rating}</span>
        </p>
      </div>

      {/* Status or + button */}
      <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
        {inLibrary && libStatus ? (
          <span
            className="font-semibold rounded-full"
            style={{ fontSize: 10, padding: '3px 9px', background: BADGE[libStatus].bg, color: BADGE[libStatus].text }}
          >
            {BADGE_LABEL[libStatus]}
          </span>
        ) : (
          <button
            onClick={onInstantAdd}
            className="flex items-center justify-center rounded-full font-bold leading-none active:scale-85 transition-transform"
            style={{ width: 28, height: 28, fontSize: 20, background: 'rgba(59,130,246,0.22)', border: '1px solid rgba(96,165,250,0.35)', color: '#93c5fd' }}
            aria-label="Add to library"
          >
            +
          </button>
        )}
      </div>
    </div>
  )
}
