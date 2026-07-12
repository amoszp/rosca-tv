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

  useEffect(() => {
    loadLibrary()
    loadSettings()
  }, [loadLibrary, loadSettings])

  return (
    <div
      className="flex flex-col w-full overflow-hidden"
      style={{ height: '100dvh', background: '#000', paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* ══ Persistent branded header — pure text, no emoji ══ */}
      <header
        className="flex-shrink-0 flex items-center justify-center select-none"
        style={{
          height: 50,
          background: 'linear-gradient(180deg, #1e2a3a 0%, #111a24 60%, transparent 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <h1
          className="font-black tracking-tight"
          style={{ fontSize: 22, letterSpacing: '-0.5px', lineHeight: 1 }}
        >
          <span style={{ color: 'var(--cream)' }}>Rosca</span>
          <span style={{ color: 'var(--orange)' }}>TV</span>
        </h1>
      </header>

      {/* ══ Main content area ══ */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {tab === 'movies'   && <LibraryScreen type="movies" />}
        {tab === 'series'   && <LibraryScreen type="series" />}
        {tab === 'anime'    && <LibraryScreen type="anime"  />}
        {tab === 'search'   && <SearchScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </main>

      <BottomNav />
      <BottomSheet />
      <Toast />
    </div>
  )
}
