'use client'
import Image from 'next/image'
import { posterUrl, getTitle, getYear, formatRating, getLibraryType, detectAnime } from '@/lib/tmdb'
import type { TMDBResult, Status } from '@/lib/types'

const TYPE_LABEL: Record<string,string> = { movies:'Movie', series:'Series', anime:'Anime' }
const STATUS_STYLE: Record<Status, { text:string }> = {
  pending: { text:'#fde68a' }, watching: { text:'#93c5fd' }, watched: { text:'#86efac' },
}

interface Props { result: TMDBResult; inLibrary: boolean; libStatus: Status|null; onPress:()=>void; onInstantAdd:()=>void }
export default function SearchResultItem({ result, inLibrary, libStatus, onPress, onInstantAdd }: Props) {
  const posterSrc = posterUrl(result.poster_path, 'w92')
  const type = getLibraryType(result)
  return (
    <div onClick={onPress} className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors active:opacity-70"
      style={{ borderBottom:'1px solid var(--border-dim)' }} role="button" tabIndex={0}
      aria-label={`${getTitle(result)} — ${TYPE_LABEL[type]}`} onKeyDown={e=>e.key==='Enter'&&onPress()}>
      <div className="flex-shrink-0 rounded-md overflow-hidden" style={{ width:38, height:56, background:'var(--surface-3)' }}>
        {posterSrc
          ? <Image src={posterSrc} alt="" width={38} height={56} className="w-full h-full object-cover" unoptimized aria-hidden="true" />
          : <div className="w-full h-full flex items-center justify-center" style={{ fontSize:18 }} aria-hidden="true">
              {type==='movies'?'🎬':type==='anime'?'⛩️':'📺'}
            </div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-white truncate" style={{ fontSize:13 }}>{getTitle(result)}</p>
        <div className="flex items-center gap-2 mt-1">
          <span style={{ fontSize:10, color:'var(--text-faint)' }}>{getYear(result)}</span>
          <span style={{ fontSize:10, color:'var(--text-faint)' }}>·</span>
          <span style={{ fontSize:10, color:'var(--text-muted)' }}>{TYPE_LABEL[type]}</span>
          {result.vote_average && result.vote_average > 0 && (
            <><span style={{ fontSize:10, color:'var(--text-faint)' }}>·</span>
            <span style={{ fontSize:10, color:'var(--sun)' }}>★ {formatRating(result.vote_average)}</span></>
          )}
          {inLibrary && libStatus && (
            <span style={{ fontSize:10, color: STATUS_STYLE[libStatus].text, fontWeight:600 }}>✓ {libStatus}</span>
          )}
        </div>
      </div>
      {!inLibrary && (
        <button onClick={e => { e.stopPropagation(); onInstantAdd() }} aria-label={`Add ${getTitle(result)}`}
          className="flex-shrink-0 flex items-center justify-center rounded-full font-black transition-opacity active:opacity-50"
          style={{ width:32, height:32, background:'var(--sun)', color:'#000', fontSize:18 }}>+</button>
      )}
    </div>
  )
}
