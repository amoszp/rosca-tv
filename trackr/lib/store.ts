import { create } from 'zustand'
import type { Tab, SubTab, SortKey, Library, LibraryItem, AppSettings, TMDBResult } from './types'
import { loadLibrary, saveItem, deleteItem, loadSettings, saveSettings } from './db'

interface SheetState { result: TMDBResult; item: LibraryItem | null }

interface AppState {
  tab: Tab; subTab: SubTab
  setTab: (t: Tab) => void; setSubTab: (t: SubTab) => void
  libSearch: string; setLibSearch: (q: string) => void
  searchQuery: string; searchResults: TMDBResult[]; isSearching: boolean
  setSearchQuery: (q: string) => void; setSearchResults: (r: TMDBResult[]) => void
  setIsSearching: (v: boolean) => void
  library: Library
  loadLibrary: () => Promise<void>
  upsertItem: (item: LibraryItem) => Promise<void>
  removeItem: (id: number) => Promise<void>
  sheet: SheetState | null
  openSheet: (result: TMDBResult, item?: LibraryItem | null) => void
  closeSheet: () => void
  settings: AppSettings
  loadSettings: () => Promise<void>
  updateSettings: (s: Partial<AppSettings>) => Promise<void>
  toast: string | null
  showToast: (msg: string) => void
}

export const useStore = create<AppState>((set, get) => ({
  tab: 'series', subTab: 'all',
  setTab: (t) => set({ tab: t, subTab: 'all', libSearch: '', sheet: null }),
  setSubTab: (t) => set({ subTab: t }),
  libSearch: '', setLibSearch: (q) => set({ libSearch: q }),
  searchQuery: '', searchResults: [], isSearching: false,
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSearchResults: (r) => set({ searchResults: r }),
  setIsSearching: (v) => set({ isSearching: v }),
  library: {},
  loadLibrary: async () => { const lib = await loadLibrary(); set({ library: lib }) },
  upsertItem: async (item) => {
    const full = { ...item, updatedAt: Date.now() }
    await saveItem(full)
    set((s) => ({ library: { ...s.library, [full.id]: full } }))
  },
  removeItem: async (id) => {
    await deleteItem(id)
    set((s) => { const next = { ...s.library }; delete next[id]; return { library: next } })
  },
  sheet: null,
  openSheet: (result, item) => set({ sheet: { result, item: item ?? null } }),
  closeSheet: () => set({ sheet: null }),
  settings: { region: 'ES', sortKey: 'status' },
  loadSettings: async () => { const s = await loadSettings(); set({ settings: s }) },
  updateSettings: async (s) => {
    const settings = { ...get().settings, ...s }
    await saveSettings(settings); set({ settings })
  },
  toast: null,
  showToast: (msg) => { set({ toast: msg }); setTimeout(() => set({ toast: null }), 2400) },
}))
