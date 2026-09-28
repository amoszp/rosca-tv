'use client'
import { useState } from 'react'
import Image from 'next/image'
import { posterUrl } from '@/lib/tmdb'

interface Props {
  posterPath: string | null
  title: string
  episodeLabel?: string
  meta?: string
  onPress: () => void
}

/* Poster-forward card for Home — cover art with title and a single tag
   underneath, no inline actions. Tapping opens the detail sheet, which
   already owns status changes and removal. No status tag here: each Home
   section (Watching, Coming Soon, Based on Your Interests) already says
   what its cards are, so repeating the status on every card is redundant. */
export default function PosterCard({ posterPath, title, episodeLabel, meta, onPress }: Props) {
  const [imgError, setImgError] = useState(false)
  const posterSrc = posterUrl(posterPath, 'w342')
  const hasPoster = Boolean(posterSrc) && !imgError

  return (
    <button onClick={onPress} className="flex flex-col gap-2 text-left min-w-0 w-full" aria-label={title}>
      <div className="rounded-2xl overflow-hidden relative" style={{ aspectRatio: '2 / 3', background: 'var(--surface-3)', border: '1px solid var(--border-dim)' }}>
        {hasPoster
          ? <Image src={posterSrc} alt="" fill sizes="120px" unoptimized className="object-cover" onError={() => setImgError(true)} />
          : <div className="w-full h-full flex items-center justify-center text-center px-2" style={{ color: 'var(--text-faint)', fontSize: 10 }}>{title}</div>}
      </div>
      <div className="flex flex-col gap-1 px-0.5">
        {episodeLabel ? (
          <span className="self-start rounded-full font-semibold" style={{ fontSize: 9.5, padding: '2px 7px', background: 'var(--accent-grad)', color: '#1A1030', whiteSpace: 'nowrap' }}>
            {episodeLabel}
          </span>
        ) : meta ? (
          <span style={{ fontSize: 9.5, color: 'var(--text-faint)', fontWeight: 600 }}>{meta}</span>
        ) : null}
      </div>
    </button>
  )
}
