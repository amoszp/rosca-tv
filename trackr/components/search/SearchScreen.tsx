'use client'
import { useRef, useEffect, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { searchMulti, getTitle, getYear, formatRating, getLibraryType } from '@/lib/tmdb'
import { syncItemFull } from '@/lib/mediaSync'
import { resolveId } from '@/hooks/usePosterSync'
import type { TMDBResult, LibraryItem } from '@/lib/types'
import SearchResultItem from './SearchResultItem'

let debounceTimer: ReturnType<typeof setTimeout>

export default function SearchScreen() {
  const { searchQuery, setSearchQuery, searchResults, setSearchResults, isSearching, setIsSearching,
    library, upsertItem, openSheet, showToast } = useStore()
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 80); return () => clearTimeout(t) }, [])

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q); clearTimeout(debounceTimer)
    if (!q.trim()) { setSearchResults([]); setIsSearching(false); return }
    setIsSearching(true)
    debounceTimer = setTimeout(async () => {
      try { setSearchResults(await searchMulti(q)) } catch { setSearchResults([]) } finally { setIsSearching(false) }
    }, 360)
  }, [setSearchQuery, setSearchResults, setIsSearching])

  const handleInstantAdd = useCallback(async (result: TMDBResult) => {
    if (library[result.id]) { showToast(`"${getTitle(result)}" already in library`); return }
    const base: LibraryItem = {
      id:result.id, mediaType:result.media_type, type:getLibraryType(result),
      title:getTitle(result), year:getYear(result), poster:result.poster_path||null,
      tmdbRating:formatRating(result.vote_average), status:'pending', seasonData:{}, addedAt:Date.now(),
    }
    await upsertItem(base); showToast(`"${base.title}" added`)
    const ownId = resolveId(base)
    if (ownId) syncItemFull(base, ownId).then(u => upsertItem(u)).catch(()=>{})
  }, [library, upsertItem, showToast])

  return (
    <div className="flex flex-col h-full" style={{ background:'var(--bg)' }}>
      <div className="flex-shrink-0 px-4 pt-4 pb-3">
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color:'var(--text-faint)' }} aria-hidden="true">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </span>
          <input ref={inputRef} type="search" value={searchQuery} onChange={e => handleSearch(e.target.value)}
            placeholder="Search series, anime, movies…" aria-label="Search media"
            className="w-full rounded-xl py-2.5 pl-10 pr-9 text-[15px] text-white"
            style={{ background:'var(--surface-2)', border:'1px solid var(--border-dim)', minHeight:44 }} />
          {searchQuery && <button onClick={() => handleSearch('')} aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xl leading-none" style={{ color:'var(--text-faint)' }}>×</button>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto" role="main" aria-label="Search results">
        {isSearching && (
          <div className="flex items-center justify-center gap-2 py-12" style={{ color:'var(--text-muted)', fontSize:13 }}>
            <span className="inline-block w-4 h-4 rounded-full" aria-hidden="true"
              style={{ border:'2px solid var(--border)', borderTopColor:'var(--sun)', animation:'spin 0.7s linear infinite' }} />
            Searching…
          </div>
        )}
        {!isSearching && searchQuery && searchResults.length===0 && (
          <p className="text-center pt-12 px-6" role="status" style={{ color:'var(--text-muted)', fontSize:13 }}>
            No results for &ldquo;{searchQuery}&rdquo;
          </p>
        )}
        {!isSearching && !searchQuery && (
          <div className="flex flex-col items-center text-center pt-16 px-8 gap-3">
            <div className="flex items-center justify-center rounded-2xl" aria-hidden="true"
              style={{ width:68, height:68, background:'var(--surface-2)', border:'1px solid var(--border-dim)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </div>
            <p className="font-bold text-white" style={{ fontSize:16 }}>Find anything</p>
            <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.6 }}>
              Search series, anime, or movies. Tap <strong className="text-white">+</strong> to add instantly.
            </p>
          </div>
        )}
        {!isSearching && searchResults.map(result => (
          <SearchResultItem key={result.id} result={result}
            libStatus={library[result.id]?.status ?? null}
            inLibrary={Boolean(library[result.id])}
            onPress={() => openSheet(result, library[result.id]??null)}
            onInstantAdd={() => handleInstantAdd(result)} />
        ))}
      </div>
    </div>
  )
}
