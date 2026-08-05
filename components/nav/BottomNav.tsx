'use client'
import { useStore } from '@/lib/store'
import type { Tab } from '@/lib/types'

const ITEMS: { id: Tab; label: string }[] = [
  { id:'series', label:'Series' },{ id:'anime', label:'Anime' },
  { id:'movies', label:'Movies' },{ id:'search', label:'Search' },{ id:'settings', label:'Settings' },
]

export default function BottomNav() {
  const { tab, setTab } = useStore()
  return (
    <nav className="flex-shrink-0 flex flex-col" style={{ background:'var(--surface)', borderTop:'1px solid var(--border-dim)', paddingBottom:'env(safe-area-inset-bottom,0px)' }}>
      <div className="flex" style={{ height:52 }}>
        {ITEMS.map(item => {
          const active = tab === item.id
          return (
            <button key={item.id} onClick={() => setTab(item.id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-opacity active:opacity-50"
              style={{ color: active ? 'var(--sun)' : 'var(--text-faint)' }}
              aria-label={item.label} aria-current={active ? 'page' : undefined}>
              <NavIcon id={item.id} active={active} />
              <span style={{ fontSize:8.5, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase' }}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function NavIcon({ id, active }: { id: Tab; active: boolean }) {
  const s = active ? 'var(--sun)' : 'var(--text-faint)'; const w = active ? 2.2 : 1.6; const sz = 22
  if (id === 'series') return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
  if (id === 'anime')  return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="10" r="1" fill={s} stroke="none"/><circle cx="15" cy="10" r="1" fill={s} stroke="none"/></svg>
  if (id === 'movies') return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 4v16M17 4v16M2 9h5M17 9h5M2 15h5M17 15h5"/></svg>
  if (id === 'search') return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
  return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
}
