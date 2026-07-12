'use client'
import { useRef, useEffect, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { searchMulti, getTitle, getYear, formatRating, getLibraryType } from '@/lib/tmdb'
import type { TMDBResult, LibraryItem } from '@/lib/types'
import SearchResultItem from './SearchResultItem'

let debounceTimer: ReturnType<typeof setTimeout>

export default function SearchScreen() {
  const {
    searchQuery, setSearchQuery,
    searchResults, setSearchResults,
    isSearching, setIsSearching,
    library, upsertItem, openSheet, showToast,
  } = useStore()

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q)
    clearTimeout(debounceTimer)
    if (!q.trim()) { setSearchResults([]); setIsSearching(false); return }
    setIsSearching(true)
    debounceTimer = setTimeout(async () => {
      try {
        setSearchResults(await searchMulti(q))
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 360)
  }, [setSearchQuery, setSearchResults, setIsSearching])

  /**
   * Instant "+" add — no drawer required.
   * Saves directly to library with 'pending' status.
   */
  const handleInstantAdd = useCallback(async (result: TMDBResult) => {
    if (library[result.id]) {
      showToast(`"${result.title || result.name}" already in library`)
      return
    }
    const newItem: LibraryItem = {
      id:          result.id,
      mediaType:   result.media_type,
      type:        getLibraryType(result),
      title:       getTitle(result),
      year:        getYear(result),
      poster:      result.poster_path || null,
      tmdbRating:  formatRating(result.vote_average),
      status:      'pending',
      seasonData:  {},
      addedAt:     Date.now(),
    }
    await upsertItem(newItem)
    showToast(`"${newItem.title}" added → ${newItem.type}`)
  }, [library, upsertItem, showToast])

  return (
    <div className="flex flex-col h-full" style={{ background: '#000' }}>
      {/* Search bar */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3">
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.35)' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </span>
          <input
            ref={inputRef}
            type="search"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search movies, series, anime…"
            className="w-full rounded-[12px] py-2.5 pl-10 pr-9 text-[15px] text-white placeholder:text-white/30"
            style={{ background: 'var(--dp-brown-2)', border: '1px solid rgba(255,255,255,0.09)' }}
          />
          {searchQuery && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xl leading-none"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto">
        {isSearching && (
          <div className="flex items-center justify-center gap-2 py-12" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            <span className="inline-block w-4 h-4 rounded-full border-2 border-white/10 border-t-blue-400"
              style={{ animation: 'spin 0.7s linear infinite' }} />
            Searching…
          </div>
        )}
        {!isSearching && searchQuery && searchResults.length === 0 && (
          <p className="text-center pt-12 px-6" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            No results for "{searchQuery}"
          </p>
        )}
        {!isSearching && !searchQuery && (
          <div className="flex flex-col items-center text-center pt-16 px-8 gap-3">
            <span style={{ fontSize: 44 }}>🔍</span>
            <p className="font-bold text-white" style={{ fontSize: 16 }}>Find anything</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              Search and tap <strong className="text-white">+</strong> to instantly add to your library.
            </p>
          </div>
        )}
        {!isSearching && searchResults.map(result => (
          <SearchResultItem
            key={result.id}
            result={result}
            libStatus={library[result.id]?.status ?? null}
            inLibrary={Boolean(library[result.id])}
            onPress={() => openSheet(result, library[result.id] ?? null)}
            onInstantAdd={() => handleInstantAdd(result)}
          />
        ))}
      </div>
    </div>
  )
}
