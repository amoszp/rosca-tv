'use client'
import { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import { useStore } from '@/lib/store'
import type { LibraryType, SubTab, LibraryItem, SortKey, Status, TMDBResult } from '@/lib/types'
import { SORT_OPTIONS, sortItems } from '@/lib/sort'
import { getLibraryType } from '@/lib/tmdb'
import { useTmdbSearch } from '@/hooks/useTmdbSearch'
import { useT, statusLabel, type Translations } from '@/lib/i18n'
import MediaCard from './MediaCard'
import SearchResultItem from '@/components/search/SearchResultItem'
import { usePosterSync } from '@/hooks/usePosterSync'
import { WordMark } from '../App'

const FILTER_IDS: SubTab[] = ['all', 'pending', 'watching', 'watched']

interface Props { type: LibraryType }

export default function LibraryScreen({ type }: Props) {
  const t = useT()
  const TYPE_LABEL = t.type
  const {
    library, subTab, setSubTab, libSearch, setLibSearch,
    openSheet, removeItem, upsertItem, showToast, settings, updateSettings, setTab,
  } = useStore()

  const [sortOpen,   setSortOpen]   = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  usePosterSync()

  /* TMDB fallback — searched automatically once the local filter comes up
     empty. When there IS a local match (e.g. you already have a "Silo" but
     want to find a different one), Moe can still reach it by tapping the
     "search all titles" CTA below the local results, which expands the same
     section on demand instead of firing a network request on every keystroke. */
  const { search: tmdbSearch, instantAdd } = useTmdbSearch()
  const [tmdbResults, setTmdbResults] = useState<TMDBResult[]>([])
  const [tmdbLoading, setTmdbLoading] = useState(false)
  const [tmdbExpanded, setTmdbExpanded] = useState(false)

  const syncingIds = useMemo(() => {
    const ids = new Set<number>()
    Object.values(library).filter(i => i.type === type && !i.poster).forEach(i => ids.add(i.id))
    return ids
  }, [library, type])

  const all = useMemo(() => Object.values(library).filter(i => i.type === type), [library, type])

  const items = useMemo<LibraryItem[]>(() => {
    const filtered = all
      .filter(i => subTab === 'all' || (i.status ?? null) === subTab)
      .filter(i => !libSearch || i.title.toLowerCase().includes(libSearch.toLowerCase()))
    return sortItems(filtered, settings.sortKey)
  }, [all, subTab, libSearch, settings.sortKey])

  useEffect(() => { setTmdbExpanded(false) }, [libSearch])

  const showTmdbFallback = libSearch.trim().length > 0 && (items.length === 0 || tmdbExpanded)
  useEffect(() => {
    if (!showTmdbFallback) { setTmdbResults([]); return }
    tmdbSearch(libSearch, results => setTmdbResults(results.filter(r => getLibraryType(r) === type)), setTmdbLoading)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTmdbFallback, libSearch, type])

  const handleDelete = useCallback(async (item: LibraryItem) => {
    await removeItem(item.id); showToast(t.library.removedToast(item.title))
  }, [removeItem, showToast, t])

  const handleStatusChange = useCallback(async (item: LibraryItem, status: Status | null) => {
    await upsertItem({ ...item, status })
  }, [upsertItem])

  const handleCardPress = useCallback((item: LibraryItem) => {
    openSheet({
      id: item.id, media_type: item.mediaType, title: item.title, name: item.title,
      poster_path: item.poster?.startsWith('http') ? null : item.poster,
      release_date: item.year ? `${item.year}-01-01` : '',
      first_air_date: item.year ? `${item.year}-01-01` : '',
      vote_average: parseFloat(item.tmdbRating) || 0,
    }, item)
  }, [openSheet])

  const handleSort = (key: SortKey) => { updateSettings({ sortKey: key }); setSortOpen(false) }
  const activeSortLabel = t.sort[settings.sortKey]

  return (
    <div className="flex flex-col h-full" style={{ background: 'transparent' }}>

      {/* ══ HEADER — glass surface ══ */}
      <div className="flex-shrink-0 glass" style={{ borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
        {/* Row: left title | centre brand | right icons */}
        <div className="relative flex items-center px-4" style={{
          height: 'calc(52px + env(safe-area-inset-top,0px))',
          paddingTop: 'env(safe-area-inset-top,0px)',
        }}>
          {/* LEFT */}
          {searchOpen ? (
            <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
              <input ref={searchRef} type="search" value={libSearch}
                onChange={e => setLibSearch(e.target.value)}
                placeholder={t.library.searchPlaceholder(TYPE_LABEL[type])}
                aria-label={t.library.searchAria(TYPE_LABEL[type])}
                className="flex-1 min-w-0 rounded-2xl text-white"
                style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', padding: '8px 12px', fontSize: 13 }} />
              <button onClick={() => { setSearchOpen(false); setLibSearch('') }} aria-label={t.library.closeSearch}
                style={{ color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}>×</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="font-black text-white" style={{ fontSize: 17, letterSpacing: '-0.3px' }}>{TYPE_LABEL[type]}</span>
              <span className="tabular-nums font-semibold" style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                {t.library.itemCount(all.length)}
              </span>
              {syncingIds.size > 0 && (
                <span style={{ fontSize: 10, color: 'var(--accent)' }}>↓{syncingIds.size}</span>
              )}
            </div>
          )}

          {/* CENTER — brand absolutely centred */}
          {!searchOpen && (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center pointer-events-none select-none"
              style={{ top: 'env(safe-area-inset-top,0px)', bottom: 0 }}>
              <WordMark size={18} />
            </div>
          )}

          {/* RIGHT */}
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            {!searchOpen && (
              <button
                onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 60) }}
                aria-label={t.library.searchLibraryAria}
                className="flex items-center justify-center rounded-full transition-opacity active:opacity-50"
                style={{ width: 34, height: 34, background: 'var(--surface-3)', border: '1px solid var(--border-dim)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="var(--text-muted)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </button>
            )}
            {/* Sort icon — accent when open */}
            <button
              onClick={() => setSortOpen(v => !v)}
              aria-label={t.library.sortOptionsAria} aria-expanded={sortOpen}
              className="flex items-center justify-center rounded-full transition-all"
              style={{
                width: 34, height: 34,
                background: sortOpen ? 'var(--accent-grad)' : 'var(--surface-3)',
                border: sortOpen ? 'none' : '1px solid var(--border-dim)',
                boxShadow: sortOpen ? 'var(--glow-accent)' : 'none',
              }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke={sortOpen ? '#1A1030' : 'var(--text-muted)'}
                strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 6h18M7 12h10M11 18h2"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Filter pills — gradient active state ── */}
        <div
          className="grid grid-cols-4 px-4 pb-3 pt-1 gap-2"
          role="group" aria-label={t.library.filterAll}>
          {FILTER_IDS.map(id => {
            const active = subTab === id
            return (
              <button key={id} onClick={() => setSubTab(id)} aria-pressed={active}
                className="rounded-2xl transition-all duration-150 active:scale-95 font-bold"
                style={{
                  paddingTop: 8, paddingBottom: 8, fontSize: 11,
                  background: active ? 'var(--accent-grad)' : 'var(--surface-2)',
                  color:      active ? '#1A1030' : 'var(--text-muted)',
                  border:     active ? 'none' : '1px solid var(--border-dim)',
                  boxShadow:  active ? 'var(--glow-accent)' : 'none',
                }}>
                {id === 'all' ? t.library.filterAll : t.status[id]}
              </button>
            )
          })}
        </div>

        {/* ── Sort panel ── */}
        <div style={{
          overflow: 'hidden',
          maxHeight: sortOpen ? 420 : 0,
          opacity: sortOpen ? 1 : 0,
          transition: 'max-height 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease',
        }}>
          <div className="px-4 pb-4 pt-1 flex flex-col gap-1.5" role="group" aria-label={t.library.sortOptionsAria}>
            <p className="font-black uppercase tracking-widest px-1 pb-1"
              style={{ fontSize: 9, color: 'var(--text-faint)' }}>
              {t.library.sortWord} · <span style={{ color: 'var(--accent)' }}>{activeSortLabel}</span>
            </p>
            {SORT_OPTIONS.map(opt => {
              const active = settings.sortKey === opt.key
              return (
                <button key={opt.key} onClick={() => handleSort(opt.key)} aria-pressed={active}
                  className="flex items-center justify-between rounded-2xl px-4 py-2.5 text-left transition-all active:opacity-70"
                  style={{
                    background: active ? 'rgba(249,115,22,0.14)' : 'var(--surface-2)',
                    border:     `1px solid ${active ? 'rgba(249,115,22,0.35)' : 'var(--border-dim)'}`,
                    fontSize:   12,
                    color:      active ? 'var(--text)' : 'var(--text-muted)',
                    fontWeight: active ? 700 : 500,
                  }}>
                  <span>{t.sort[opt.key]}</span>
                  {active && <span className="gradient-text font-black" style={{ fontSize: 13 }}>✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Card list ── */}
      <div className="flex-1 overflow-y-auto" role="main" aria-label={`${TYPE_LABEL[type]} library`}>
        <div className="flex flex-col gap-3 px-3.5 pt-4" style={{ paddingBottom: 'calc(var(--nav-h) + 24px)' }}>
          {items.length > 0 && items.map(item => (
            <MediaCard key={item.id} item={item} syncing={syncingIds.has(item.id)}
              onPress={() => handleCardPress(item)} onDelete={() => handleDelete(item)}
              onStatusChange={s => handleStatusChange(item, s)} />
          ))}

          {items.length > 0 && libSearch.trim().length > 0 && !tmdbExpanded && (
            <button onClick={() => setTmdbExpanded(true)}
              className="flex items-center justify-center gap-1.5 rounded-2xl font-bold transition-opacity active:opacity-70"
              style={{ padding: '10px 16px', fontSize: 12, color: 'var(--accent)', background: 'var(--surface-2)', border: '1px solid var(--border-dim)' }}>
              {t.library.searchTmdbCta(libSearch)}
            </button>
          )}

          {items.length === 0 && !showTmdbFallback && (
            <EmptyState t={t} typeLabel={TYPE_LABEL[type]} hasItems={all.length > 0} onSearch={() => setTab('search')} />
          )}

          {showTmdbFallback && (
            <TmdbFallback t={t} type={type} typeLabel={TYPE_LABEL[type]} query={libSearch} loading={tmdbLoading} results={tmdbResults}
              hasLocalMatches={items.length > 0}
              inLibrary={id => Boolean(library[id])} libStatus={id => library[id]?.status ?? null}
              onPress={r => openSheet(r, library[r.id] ?? null)} onInstantAdd={instantAdd} />
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ t, typeLabel, hasItems, onSearch }: { t: Translations; typeLabel: string; hasItems: boolean; onSearch: () => void }) {
  return (
    <div className="flex flex-col items-center text-center pt-16 gap-5 px-8" role="status" aria-live="polite">
      <div className="flex items-center justify-center rounded-3xl glass"
        style={{ width: 92, height: 92 }}
        aria-hidden="true">
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none"
          stroke="var(--accent)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 11H20"/>
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="M8 4v7M12 4v7M16 4v7"/>
          <path d="M6 4l2 3M10 4l2 3M14 4l2 3"/>
        </svg>
      </div>
      <div className="flex flex-col gap-2">
        <p className="font-black text-white" style={{ fontSize: 19 }}>
          {hasItems ? t.library.noResults : t.library.emptyLibraryTitle}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65 }}>
          {hasItems ? t.library.tryDifferentFilter : t.library.emptyLibraryBody(typeLabel)}
        </p>
      </div>
      {/* CTA — gradient, reserved for the primary action */}
      {!hasItems && (
        <button onClick={onSearch}
          className="rounded-2xl font-black transition-opacity active:opacity-80"
          style={{ padding: '14px 30px', fontSize: 14, background: 'var(--accent-grad)', color: '#1A1030', marginTop: 4, minHeight: 44, boxShadow: 'var(--glow-accent-lg)' }}>
          {t.library.searchTitles}
        </button>
      )}
    </div>
  )
}

/* Shown when the local filter finds nothing in your list — same TMDB search
   and instant-add as the dedicated Search tab, scoped to this tab's type, so
   "not in your list yet" flows straight into "add it" without switching tabs. */
function TmdbFallback({ t, typeLabel, query, loading, results, hasLocalMatches, inLibrary, libStatus, onPress, onInstantAdd }: {
  t: Translations; type: LibraryType; typeLabel: string; query: string; loading: boolean; results: TMDBResult[]
  hasLocalMatches: boolean
  inLibrary: (id: number) => boolean; libStatus: (id: number) => LibraryItem['status']
  onPress: (r: TMDBResult) => void; onInstantAdd: (r: TMDBResult) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-1 pb-1" style={{ fontSize: 12, color: 'var(--text-faint)' }}>
        {hasLocalMatches ? t.library.otherResultsFor(query) : t.library.noLocalMatch(typeLabel, query)}
      </p>
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          <span className="inline-block w-4 h-4 rounded-full" aria-hidden="true"
            style={{ border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
          {t.library.searching}
        </div>
      ) : results.length === 0 ? (
        <p className="text-center pt-8 px-6" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          {t.library.noTmdbMatch(typeLabel, query)}
        </p>
      ) : (
        results.map(r => (
          <SearchResultItem key={r.id} result={r} inLibrary={inLibrary(r.id)} libStatus={libStatus(r.id)}
            onPress={() => onPress(r)} onInstantAdd={() => onInstantAdd(r)} />
        ))
      )}
    </div>
  )
}
