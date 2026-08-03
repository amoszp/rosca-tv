'use client'
import { useMemo, useCallback, useState, useRef } from 'react'
import { useStore } from '@/lib/store'
import type { LibraryType, SubTab, LibraryItem, SortKey } from '@/lib/types'
import { SORT_OPTIONS, sortItems } from '@/lib/sort'
import MediaCard from './MediaCard'
import { usePosterSync } from '@/hooks/usePosterSync'
import { WordMark } from '../App'

/* ── Nordic Minimal filter pill styles ──────────────────────── */
const FILTER_TABS: { id: SubTab; label: string }[] = [
  { id: 'all',      label: 'All'      },
  { id: 'pending',  label: 'Pending'  },
  { id: 'watching', label: 'Watching' },
  { id: 'watched',  label: 'Watched'  },
]

/* Active: elevated slate with white text and visible border */
const PILL_ACTIVE = {
  background: '#1E2942',
  color:      '#FFFFFF',
  border:     '1px solid rgba(148,163,184,0.45)',   /* slate-400/45 */
  fontWeight: 600,
}
/* Inactive: dark, clearly visible, uniform across all four pills */
const PILL_IDLE = {
  background: '#141D38',                              /* surface exactly */
  color:      'rgba(148,163,184,0.75)',               /* slate-400 muted */
  border:     '1px solid rgba(30,43,74,1)',           /* border-dim */
  fontWeight: 400,
}

const TYPE_LABEL: Record<LibraryType, string> = { movies: 'Movies', series: 'Series', anime: 'Anime' }
const TYPE_EMOJI: Record<LibraryType, string>  = { movies: '🎬',    series: '📺',    anime: '⛩️'   }

interface Props { type: LibraryType }

export default function LibraryScreen({ type }: Props) {
  const {
    library, subTab, setSubTab, libSearch, setLibSearch,
    openSheet, removeItem, showToast, settings, updateSettings, setTab,
  } = useStore()

  const [sortOpen,   setSortOpen]   = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  usePosterSync()

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

  const handleDelete = useCallback(async (item: LibraryItem) => {
    await removeItem(item.id); showToast(`"${item.title}" removed`)
  }, [removeItem, showToast])

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
  const activeSortLabel = SORT_OPTIONS.find(o => o.key === settings.sortKey)?.label ?? 'Sort'

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>

      {/* ══ COMPACT SINGLE-ROW HEADER ══ */}
      <div className="flex-shrink-0" style={{
        background: 'linear-gradient(180deg, var(--surface-2) 0%, var(--surface) 70%, transparent 100%)',
        borderBottom: '1px solid var(--border-dim)',
      }}>
        {/* Row: left title | centre brand | right icons */}
        <div className="relative flex items-center px-3" style={{
          height: 'calc(48px + env(safe-area-inset-top,0px))',
          paddingTop: 'env(safe-area-inset-top,0px)',
        }}>
          {/* LEFT */}
          {searchOpen ? (
            <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
              <input ref={searchRef} type="search" value={libSearch}
                onChange={e => setLibSearch(e.target.value)}
                placeholder={`Search ${TYPE_LABEL[type].toLowerCase()}…`}
                aria-label={`Search ${TYPE_LABEL[type]}`}
                className="flex-1 min-w-0 rounded-lg text-white"
                style={{ background: 'var(--surface-2)', border: '1px solid rgba(148,163,184,0.3)', padding: '6px 10px', fontSize: 13 }} />
              <button onClick={() => { setSearchOpen(false); setLibSearch('') }} aria-label="Close search"
                style={{ color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}>×</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="font-bold text-white" style={{ fontSize: 15, letterSpacing: '-0.2px' }}>{TYPE_LABEL[type]}</span>
              <span className="tabular-nums font-medium" style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                {all.length} {all.length === 1 ? 'ítem' : 'ítems'}
              </span>
              {syncingIds.size > 0 && (
                <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.7)' }}>↓{syncingIds.size}</span>
              )}
            </div>
          )}

          {/* CENTER — brand absolutely centred */}
          {!searchOpen && (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center pointer-events-none select-none"
              style={{ top: 'env(safe-area-inset-top,0px)', bottom: 0 }}>
              <WordMark size={19} />
            </div>
          )}

          {/* RIGHT */}
          <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
            {!searchOpen && (
              <button
                onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 60) }}
                aria-label="Search library"
                className="flex items-center justify-center rounded-full transition-opacity active:opacity-50"
                style={{ width: 30, height: 30, background: 'var(--surface-2)', border: '1px solid var(--border-dim)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(148,163,184,0.7)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </button>
            )}
            {/* Sort icon — neutral slate, NO sun colour */}
            <button
              onClick={() => setSortOpen(v => !v)}
              aria-label="Sort options" aria-expanded={sortOpen}
              className="flex items-center justify-center rounded-full transition-opacity active:opacity-50"
              style={{
                width: 30, height: 30,
                background: sortOpen ? 'var(--surface-3)' : 'var(--surface-2)',
                border: `1px solid ${sortOpen ? 'rgba(148,163,184,0.35)' : 'var(--border-dim)'}`,
              }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke={sortOpen ? '#FFFFFF' : 'rgba(148,163,184,0.7)'}
                strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 6h18M7 12h10M11 18h2"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Filter pills — ALWAYS VISIBLE, no collapse, Nordic Minimal ── */}
        <div
          className="grid grid-cols-4 px-3 pb-2.5 pt-1 gap-1.5"
          role="group" aria-label="Filter by status">
          {FILTER_TABS.map(t => {
            const active = subTab === t.id
            const style  = active ? PILL_ACTIVE : PILL_IDLE
            return (
              <button key={t.id} onClick={() => setSubTab(t.id)} aria-pressed={active}
                className="rounded-lg transition-all duration-150 active:scale-95"
                style={{ paddingTop: 7, paddingBottom: 7, fontSize: 11, ...style }}>
                {t.label}
              </button>
            )
          })}
        </div>

        {/* ── Sort panel — neutral palette, no sun ── */}
        <div style={{
          overflow: 'hidden',
          maxHeight: sortOpen ? 420 : 0,
          opacity: sortOpen ? 1 : 0,
          transition: 'max-height 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease',
        }}>
          <div className="px-3 pb-3 pt-1 flex flex-col gap-1" role="group" aria-label="Sort options">
            <p className="font-black uppercase tracking-widest px-1 pb-1"
              style={{ fontSize: 9, color: 'var(--text-faint)' }}>
              Sort · <span style={{ color: 'rgba(148,163,184,0.9)' }}>{activeSortLabel}</span>
            </p>
            {SORT_OPTIONS.map(opt => {
              const active = settings.sortKey === opt.key
              return (
                <button key={opt.key} onClick={() => handleSort(opt.key)} aria-pressed={active}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-left transition-all active:opacity-70"
                  style={{
                    background: active ? '#1E2942' : '#141D38',
                    border:     `1px solid ${active ? 'rgba(148,163,184,0.35)' : 'rgba(30,43,74,0.8)'}`,
                    fontSize:   12,
                    color:      active ? '#FFFFFF' : 'rgba(148,163,184,0.75)',
                    fontWeight: active ? 600 : 400,
                  }}>
                  <span>{opt.label}</span>
                  {active && <span style={{ color: '#FFFFFF', fontSize: 13 }}>✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Card list ── */}
      <div className="flex-1 overflow-y-auto" role="main" aria-label={`${TYPE_LABEL[type]} library`}>
        <div className="flex flex-col gap-2 px-3 pt-3 pb-8">
          {items.length === 0 ? (
            <EmptyState type={type} hasItems={all.length > 0} onSearch={() => setTab('search')} />
          ) : (
            items.map(item => (
              <MediaCard key={item.id} item={item} syncing={syncingIds.has(item.id)}
                onPress={() => handleCardPress(item)} onDelete={() => handleDelete(item)} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ type, hasItems, onSearch }: { type: LibraryType; hasItems: boolean; onSearch: () => void }) {
  return (
    <div className="flex flex-col items-center text-center pt-16 gap-4 px-8" role="status" aria-live="polite">
      <div className="flex items-center justify-center rounded-2xl"
        style={{ width: 88, height: 88, background: 'var(--surface-2)', border: '1px solid var(--border-dim)' }}
        aria-hidden="true">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none"
          stroke="var(--text-faint)" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 11H20"/>
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="M8 4v7M12 4v7M16 4v7"/>
          <path d="M6 4l2 3M10 4l2 3M14 4l2 3"/>
        </svg>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="font-black text-white" style={{ fontSize: 18 }}>
          {hasItems ? 'No results' : 'Tu lista está vacía'}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65 }}>
          {hasItems
            ? 'Try a different filter or sort option.'
            : `No tienes ${TYPE_LABEL[type].toLowerCase()} en tu biblioteca todavía.`}
        </p>
      </div>
      {/* CTA — sun yellow ONLY because it's the primary action button */}
      {!hasItems && (
        <button onClick={onSearch}
          className="rounded-xl font-black text-black transition-opacity active:opacity-75"
          style={{ padding: '13px 28px', fontSize: 14, background: 'var(--sun)', marginTop: 4, minHeight: 44 }}>
          Buscar títulos
        </button>
      )}
    </div>
  )
}
