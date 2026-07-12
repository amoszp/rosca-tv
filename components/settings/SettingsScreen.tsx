'use client'
import { useRef } from 'react'
import { useStore } from '@/lib/store'
import { exportLibrary, importLibrary } from '@/lib/db'
import type { ExportData } from '@/lib/types'

const REGIONS = [
  { code:'AR',name:'Argentina'     },{ code:'AU',name:'Australia'     },
  { code:'BR',name:'Brazil'        },{ code:'CA',name:'Canada'        },
  { code:'DE',name:'Germany'       },{ code:'ES',name:'Spain'         },
  { code:'FR',name:'France'        },{ code:'GB',name:'United Kingdom'},
  { code:'IT',name:'Italy'         },{ code:'JP',name:'Japan'         },
  { code:'KR',name:'South Korea'   },{ code:'MX',name:'Mexico'        },
  { code:'US',name:'United States' },
]

export default function SettingsScreen() {
  const { settings, updateSettings, showToast, loadLibrary: reloadLib } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    const data = await exportLibrary()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `rosca-library-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    showToast('Library exported ✓')
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data: ExportData = JSON.parse(text)
      if (!data.library || typeof data.library !== 'object') {
        showToast('⚠️ Invalid JSON — missing "library" key')
        return
      }
      const count = await importLibrary(data)
      // Force full reload from IDB+LS into Zustand so tabs populate immediately
      await reloadLib()
      showToast(`Imported ${count} items ✓`)
    } catch (err) {
      showToast('⚠️ Import failed — check file format')
    }
    e.target.value = ''
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: '#000' }}>
      <div className="flex flex-col gap-4 px-4 pt-4 pb-12">

        <p className="font-bold uppercase tracking-widest" style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
          Preferences
        </p>

        {/* Region */}
        <SettingCard title="Streaming Region">
          <div className="relative">
            <select
              value={settings.region}
              onChange={e => { updateSettings({ region: e.target.value }); showToast(`Region → ${e.target.value}`) }}
              className="w-full appearance-none rounded-[10px] px-3 py-3 text-[14px] text-white pr-8"
              style={{ background: 'var(--dp-brown-2)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {REGIONS.map(r => (
                <option key={r.code} value={r.code}>{r.code} — {r.name}</option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>▾</span>
          </div>
        </SettingCard>

        {/* Export */}
        <SettingCard title="Export Library">
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
            Download a complete JSON backup of your library.
          </p>
          <ActionBtn label="Download library.json" icon="⬇" onClick={handleExport} />
        </SettingCard>

        {/* Import */}
        <SettingCard title="Import Library">
          <div className="rounded-[10px] p-3 mb-3"
            style={{ background: 'rgba(234,168,71,0.09)', border: '1px solid rgba(234,168,71,0.22)' }}>
            <p className="font-bold mb-2" style={{ fontSize: 11, color: 'var(--orange)' }}>
              ⚠️ Before importing — read carefully
            </p>
            <ol className="flex flex-col gap-1.5">
              {[
                'Export a backup of your current library first (button above).',
                'Import MERGES items by ID — existing items are overwritten by imported ones.',
                'The file must be a .json exported by RoscaTV (see README for schema).',
                'After import, items instantly appear in Movies, Series & Anime tabs.',
                'If items still don\'t appear, force-close and reopen the app.',
              ].map((s, i) => (
                <li key={i} className="flex gap-2" style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.28)', flexShrink: 0 }}>{i + 1}.</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
          <ActionBtn label="Choose .json to import" icon="⬆" onClick={() => fileRef.current?.click()} />
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </SettingCard>

        <p className="text-center" style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
          All data is stored locally on this device.
        </p>
      </div>
    </div>
  )
}

function SettingCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--dp-red)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="font-black text-white uppercase tracking-widest" style={{ fontSize: 11 }}>{title}</p>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}

function ActionBtn({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-[10px] px-4 py-3 text-[14px] font-medium text-white active:opacity-60 transition-opacity"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
    >
      <span style={{ fontSize: 15 }}>{icon}</span>
      {label}
    </button>
  )
}
