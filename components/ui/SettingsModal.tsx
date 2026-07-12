'use client'
import { useEffect, useState, useRef } from 'react'
import { useStore } from '@/lib/store'
import { exportLibrary, importLibrary } from '@/lib/db'
import type { ExportData } from '@/lib/types'

const REGIONS = [
  { code: 'AR', name: 'Argentina' },
  { code: 'AU', name: 'Australia' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'ES', name: 'Spain' },
  { code: 'FR', name: 'France' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'MX', name: 'Mexico' },
  { code: 'US', name: 'United States' },
]

export default function SettingsModal() {
  const [open, setOpen]           = useState(false)
  const [showImport, setShowImport] = useState(false)
  const { settings, updateSettings, showToast, loadLibrary: reloadLib } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = () => { setOpen(true); setShowImport(false) }
    window.addEventListener('rosca:openSettings', handler)
    return () => window.removeEventListener('rosca:openSettings', handler)
  }, [])

  const handleExport = async () => {
    const data = await exportLibrary()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `rosca-library-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Library exported ✓')
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data: ExportData = JSON.parse(text)
      if (!data.library) throw new Error('Missing library key')
      const count = await importLibrary(data)
      await reloadLib()
      showToast(`Imported ${count} items ✓`)
      setOpen(false)
    } catch {
      showToast('⚠️ Invalid file — import failed')
    }
    e.target.value = ''
  }

  if (!open) return null

  return (
    <div
      className="absolute inset-0 bg-black/80 z-[60] flex items-center justify-center p-5 animate-fade-in"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 20px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-[#1C1C1E] rounded-[18px] w-full overflow-hidden max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-[18px]">📺</span>
            <h2 className="text-[16px] font-bold">RoscaTV Settings</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/8 text-secondary text-[18px]"
          >
            ×
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">

          {/* Region */}
          <div>
            <label className="block text-[11px] font-semibold text-secondary uppercase tracking-wider mb-2">
              Streaming region
            </label>
            <div className="relative">
              <select
                value={settings.region}
                onChange={(e) => { updateSettings({ region: e.target.value }); showToast(`Region → ${e.target.value}`) }}
                className="w-full bg-card border border-border rounded-[10px] px-3 py-2.5 text-[14px] text-primary appearance-none pr-8"
              >
                {REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>{r.code} — {r.name}</option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-[11px] pointer-events-none">▾</span>
            </div>
          </div>

          {/* Export */}
          <div>
            <label className="block text-[11px] font-semibold text-secondary uppercase tracking-wider mb-2">
              Export library
            </label>
            <button
              onClick={handleExport}
              className="flex items-center gap-3 w-full px-4 py-3 bg-card border border-border rounded-[10px] text-[14px] font-medium active:opacity-70 transition-opacity"
            >
              <DownloadIcon />
              Download library.json
            </button>
            <p className="text-[11px] text-secondary/60 mt-1.5 px-1">
              Exports your complete library as a .json backup file.
            </p>
          </div>

          {/* Import */}
          <div>
            <label className="block text-[11px] font-semibold text-secondary uppercase tracking-wider mb-2">
              Import library
            </label>

            {/* Instructions panel */}
            <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-[10px] p-3.5 mb-3">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-yellow-400 text-[14px] flex-shrink-0">⚠️</span>
                <p className="text-[12px] font-semibold text-yellow-300">Before importing, please read:</p>
              </div>
              <ol className="flex flex-col gap-1.5 pl-1">
                {[
                  'Export a backup of your current library first (button above).',
                  'Import MERGES by item ID — existing items are overwritten by imported ones.',
                  'The file must be a valid .json exported by RoscaTV.',
                  'Do not edit the JSON manually unless you know what you\'re doing.',
                  'After import, reload the app if items don\'t appear immediately.',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-secondary leading-relaxed">
                    <span className="text-secondary/50 flex-shrink-0 font-semibold tabular-nums">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-3 w-full px-4 py-3 bg-card border border-border rounded-[10px] text-[14px] font-medium active:opacity-70 transition-opacity"
            >
              <UploadIcon />
              Choose .json file to import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>

          {/* Footer */}
          <p className="text-[10px] text-secondary/40 text-center pb-1">
            All data is stored locally on this device only.
          </p>
        </div>
      </div>
    </div>
  )
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  )
}
