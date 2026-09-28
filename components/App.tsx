'use client'
import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import BottomNav from './nav/BottomNav'
import HomeScreen from './home/HomeScreen'
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
        <header className="flex-shrink-0 flex items-end justify-center select-none glass" style={{ paddingTop:'env(safe-area-inset-top,0px)', paddingBottom:12, height:'calc(52px + env(safe-area-inset-top,0px))', borderLeft:'none', borderRight:'none', borderTop:'none' }}>
          <WordMark />
        </header>
      )}
      <main className="flex-1 min-h-0 overflow-hidden">
        {tab === 'home'     && <HomeScreen />}
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
      <span style={{ color:'var(--text)' }}>Rosca</span>
      <span className="gradient-text">TV</span>
    </span>
  )
}
