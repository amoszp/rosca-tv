'use client'
import { useMemo, useCallback, useState } from 'react'
import { useStore } from '@/lib/store'
import type { LibraryType, SubTab, LibraryItem } from '@/lib/types'
import MediaCard from './MediaCard'

/* ─── Sub-tab config ──────────────────────────────────────────────── */
const TABS: { id: SubTab; label: string; activeStyle: string }[] = [
  { id: 'all',      label: 'All',      activeStyle: 'bg-white text-black' },
  { id: 'pending',  label: 'Pending',  activeStyle: 'bg-yellow-500/30 text-yellow-200 border border-yellow-500/40' },
  { id: 'watching', label: 'Watching', activeStyle: 'bg-blue-500/30   text-blue-200   border border-blue-500/40' },
  { id: 'watched',  label: 'Watched',  activeStyle: 'bg-green-500/30  text-green-200  border border-green-500/40' },
]

const SCREEN_META: Record<LibraryType, { emoji: string; label: string }> = {
  movies: { emoji: '🎬', label: 'Movies' },
  series: { emoji: '📺', label: 'Series' },
  anime:  { emoji: '⛩️', label: 'Anime'  },
}

interface Props { type: LibraryType }

export default function LibraryScreen({ type }: Props) {
  const { library, subTab, setSubTab, libSearch, setLibSearch, openSheet, removeItem, showToast } = useStore()
  const [filterOpen, setFilterOpen] = useState(true)
  const meta = SCREEN_META[type]

  const all = useMemo(() =>
    Object.values(library).filter((i) => i.type === type),
    [library, type]
  )

  const items = useMemo<LibraryItem[]>(() => {
    return all
      .filter((i) => subTab === 'all' || (i.status || 'pending') === subTab)
      .filter((i) => !libSearch || i.title.toLowerCase().includes(libSearch.toLowerCase()))
      .sort((a, b) => (b.updatedAt || b.addedAt) - (a.updatedAt || a.addedAt))
  }, [all, subTab, libSearch])

  const handleDelete = useCallback(async (item: LibraryItem) => {
    await removeItem(item.id)
    showToast(`"${item.title}" removed`)
  }, [removeItem, showToast])

  const handleCardPress = useCallback((item: LibraryItem) => {
    openSheet({
      id: item.id,
      media_type: item.mediaType,
      title: item.title,
      name: item.title,
      poster_path: item.poster,
      release_date: item.year ? `${item.year}-01-01` : '',
      first_air_date: item.year ? `${item.year}-01-01` : '',
      vote_average: parseFloat(item.tmdbRating) || 0,
    }, item)
  }, [openSheet])

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>

      {/* ── Section label ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 py-2.5"
        style={{ background: 'var(--dp-brown)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <span className="text-white font-bold text-[16px]">
          {meta.emoji}&nbsp;&nbsp;{meta.label}
        </span>
        <span className="text-[12px]" style={{ color: 'var(--muted)' }}>
          {all.length} {all.length === 1 ? 'title' : 'titles'}
        </span>
      </div>

      {/* ── Collapsible filter bar ── */}
      <div
        className="flex-shrink-0"
        style={{ background: 'var(--dp-brown-2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Toggle header */}
        <button
          onClick={() => setFilterOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 active:opacity-60 transition-opacity"
          style={{ height: 38 }}
        >
          <span
            className="font-bold uppercase tracking-widest"
            style={{ fontSize: 10, color: subTab === 'all' ? 'rgba(255,255,255,0.5)' : '#ffffff' }}
          >
            {subTab === 'all'
              ? 'Filter by status'
              : `Showing: ${TABS.find(t => t.id === subTab)?.label}`
            }
          </span>
          <svg
            width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: filterOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s ease' }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {/* Filter pills — full width grid */}
        <div
          className="overflow-hidden"
          style={{
            maxHeight: filterOpen ? 56 : 0,
            opacity: filterOpen ? 1 : 0,
            transition: 'max-height 0.26s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease',
          }}
        >
          <div className="grid grid-cols-4 gap-2 px-3 pb-2.5">
            {TABS.map((t) => {
              const active = subTab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setSubTab(t.id)}
                  className={`rounded-[8px] font-semibold transition-all duration-150 active:scale-95 ${active ? t.activeStyle : 'text-secondary border border-white/10'}`}
                  style={{
                    fontSize: 12,
                    paddingTop: 7,
                    paddingBottom: 7,
                    background: active ? undefined : 'rgba(255,255,255,0.04)',
                  }}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Search input ── */}
      <div
        className="flex-shrink-0 relative px-3 py-2"
        style={{ background: 'var(--dp-brown)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <span className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted)' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </span>
        <input
          type="search"
          value={libSearch}
          onChange={(e) => setLibSearch(e.target.value)}
          placeholder="Filter your library…"
          className="w-full rounded-[9px] py-2 pl-8 pr-3 text-[13px] text-white placeholder:text-secondary/50"
          style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.08)' }}
        />
      </div>

      {/* ── Card list ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-2 px-3 pt-3 pb-8">
          {items.length === 0 ? (
            <EmptyState type={type} hasItems={all.length > 0} />
          ) : (
            items.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                onPress={() => handleCardPress(item)}
                onDelete={() => handleDelete(item)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ type, hasItems }: { type: LibraryType; hasItems: boolean }) {
  const meta = SCREEN_META[type]
  return (
    <div className="flex flex-col items-center text-center pt-20 gap-3 px-8">
      <span style={{ fontSize: 48 }}>{meta.emoji}</span>
      <p className="text-white font-bold text-[16px]">
        {hasItems ? 'No results' : `${meta.label} list is empty`}
      </p>
      <p className="text-secondary text-[13px] leading-relaxed">
        {hasItems
          ? 'Try a different filter or search term.'
          : `Search for ${meta.label.toLowerCase()} to start your list.`
        }
      </p>
    </div>
  )
}
