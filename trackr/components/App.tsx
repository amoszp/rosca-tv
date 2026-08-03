'use client'
import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import BottomNav from './nav/BottomNav'
import LibraryScreen from './library/LibraryScreen'
import SearchScreen from './search/SearchScreen'
import SettingsScreen from './settings/SettingsScreen'
import BottomSheet from './sheets/BottomSheet'
import Toast from './ui/Toast'

export default function App() {
  const { tab, loadLibrary, loadSettings } = useStore()
  useEffect(() => { loadLibrary(); loadSettings() }, [loadLibrary, loadSettings])
  const isLibrary = tab === 'movies' || tab === 'series' || tab === 'anime'
  return (
    <div className="flex flex-col w-full overflow-hidden" style={{ height:'100dvh', background:'var(--bg)' }}>
      {!isLibrary && (
        <header className="flex-shrink-0 flex items-end justify-center select-none" style={{ paddingTop:'env(safe-area-inset-top,0px)', paddingBottom:10, height:'calc(48px + env(safe-area-inset-top,0px))', background:'linear-gradient(180deg,var(--surface-2) 0%,var(--surface) 80%,transparent 100%)', borderBottom:'1px solid var(--border-dim)' }}>
          <WordMark />
        </header>
      )}
      <main className="flex-1 min-h-0 overflow-hidden">
        {tab === 'series'   && <LibraryScreen type="series" />}
        {tab === 'anime'    && <LibraryScreen type="anime"  />}
        {tab === 'movies'   && <LibraryScreen type="movies" />}
        {tab === 'search'   && <SearchScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </main>
      <BottomNav />
      <BottomSheet />
      <Toast />
    </div>
  )
}

export function WordMark({ size = 19 }: { size?: number }) {
  return (
    <span className="font-black select-none tracking-tight" style={{ fontSize:size, letterSpacing:'-0.5px', lineHeight:1 }}>
      <span style={{ color:'#FBEED3' }}>Rosca</span>
      <span style={{ color:'var(--sun)' }}>TV</span>
    </span>
  )
}
