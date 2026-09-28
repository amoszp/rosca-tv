'use client'
import Image from 'next/image'
import { posterUrl, getTitle, getYear, formatRating, getLibraryType, detectAnime } from '@/lib/tmdb'
import type { TMDBResult, Status } from '@/lib/types'
import { STATUS_STYLES } from '@/lib/statusStyles'
import MediaTypeIcon from '@/components/ui/MediaTypeIcon'

const TYPE_LABEL: Record<string,string> = { movies:'Movie', series:'Series', anime:'Anime' }

interface Props { result: TMDBResult; inLibrary: boolean; libStatus: Status|null; onPress:()=>void; onInstantAdd:()=>void }
export default function SearchResultItem({ result, inLibrary, libStatus, onPress, onInstantAdd }: Props) {
  const posterSrc = posterUrl(result.poster_path, 'w92')
  const type = getLibraryType(result)
  return (
    <div onClick={onPress} className="flex items-center gap-3.5 mx-3.5 mb-2.5 px-3 py-3 rounded-2xl cursor-pointer transition-all active:scale-[0.98] glass"
      role="button" tabIndex={0}
      aria-label={`${getTitle(result)} — ${TYPE_LABEL[type]}`} onKeyDown={e=>e.key==='Enter'&&onPress()}>
      <div className="flex-shrink-0 rounded-xl overflow-hidden" style={{ width:42, height:60, background:'var(--surface-3)' }}>
        {posterSrc
          ? <Image src={posterSrc} alt="" width={42} height={60} className="w-full h-full object-cover" unoptimized aria-hidden="true" />
          : <div className="w-full h-full flex items-center justify-center">
              <MediaTypeIcon type={type} size={18} color="var(--text-faint)" />
            </div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-white truncate" style={{ fontSize:13.5 }}>{getTitle(result)}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span style={{ fontSize:10, color:'var(--text-faint)', fontWeight:600 }}>{getYear(result)}</span>
          <span style={{ fontSize:10, color:'var(--text-faint)' }}>·</span>
          <span style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600 }}>{TYPE_LABEL[type]}</span>
          {result.vote_average && result.vote_average > 0 && (
            <><span style={{ fontSize:10, color:'var(--text-faint)' }}>·</span>
            <span style={{ fontSize:10, color:'var(--accent)', fontWeight:700 }}>★ {formatRating(result.vote_average)}</span></>
          )}
          {inLibrary && libStatus && (
            <span style={{ fontSize:10, color: STATUS_STYLES[libStatus].text, fontWeight:700 }}>✓ {STATUS_STYLES[libStatus].label}</span>
          )}
        </div>
      </div>
      {!inLibrary && (
        <button onClick={e => { e.stopPropagation(); onInstantAdd() }} aria-label={`Add ${getTitle(result)}`}
          className="flex-shrink-0 flex items-center justify-center rounded-full font-black transition-transform active:scale-90"
          style={{ width:34, height:34, background:'var(--accent-grad)', color:'#1A1030', fontSize:19, boxShadow:'var(--glow-accent)' }}>+</button>
      )}
    </div>
  )
}
