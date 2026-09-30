'use client'
import { useRef, useEffect, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { useTmdbSearch } from '@/hooks/useTmdbSearch'
import { useT } from '@/lib/i18n'
import SearchResultItem from './SearchResultItem'

export default function SearchScreen() {
  const t = useT()
  const { searchQuery, setSearchQuery, searchResults, setSearchResults, isSearching, setIsSearching,
    library, openSheet } = useStore()
  const { search, instantAdd } = useTmdbSearch()
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 80); return () => clearTimeout(t) }, [])

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q)
    search(q, setSearchResults, setIsSearching)
  }, [setSearchQuery, search, setSearchResults, setIsSearching])

  return (
    <div className="flex flex-col h-full" style={{ background:'transparent', paddingTop:'env(safe-area-inset-top,0px)' }}>
      <div className="flex-shrink-0 px-4 pt-4 pb-3">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color:'var(--accent)' }} aria-hidden="true">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </span>
          <input ref={inputRef} type="search" value={searchQuery} onChange={e => handleSearch(e.target.value)}
            placeholder={t.search.placeholder} aria-label={t.search.inputAria}
            className="w-full rounded-2xl py-3 pl-11 pr-9 text-[15px] text-white glass"
            style={{ minHeight:48 }} />
          {searchQuery && <button onClick={() => handleSearch('')} aria-label={t.search.clearAria}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xl leading-none" style={{ color:'var(--text-faint)' }}>×</button>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto" role="main" aria-label={t.search.resultsAria} style={{ paddingBottom: 'var(--nav-h)' }}>
        {isSearching && (
          <div className="flex items-center justify-center gap-2 py-12" style={{ color:'var(--text-muted)', fontSize:13 }}>
            <span className="inline-block w-4 h-4 rounded-full" aria-hidden="true"
              style={{ border:'2px solid var(--border)', borderTopColor:'var(--accent)', animation:'spin 0.7s linear infinite' }} />
            {t.search.searching}
          </div>
        )}
        {!isSearching && searchQuery && searchResults.length===0 && (
          <p className="text-center pt-12 px-6" role="status" style={{ color:'var(--text-muted)', fontSize:13 }}>
            {t.search.noResultsFor(searchQuery)}
          </p>
        )}
        {!isSearching && !searchQuery && (
          <div className="flex flex-col items-center text-center pt-16 px-8 gap-4">
            <div className="flex items-center justify-center rounded-3xl glass" aria-hidden="true"
              style={{ width:72, height:72 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </div>
            <p className="font-black text-white" style={{ fontSize:17 }}>{t.search.findAnything}</p>
            <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.6 }}>
              {t.search.hintPrefix} <strong className="gradient-text font-bold">+</strong> {t.search.hintSuffix}
            </p>
          </div>
        )}
        {!isSearching && searchResults.map(result => (
          <SearchResultItem key={result.id} result={result}
            libStatus={library[result.id]?.status ?? null}
            inLibrary={Boolean(library[result.id])}
            onPress={() => openSheet(result, library[result.id]??null)}
            onInstantAdd={() => instantAdd(result)} />
        ))}
      </div>
    </div>
  )
}
