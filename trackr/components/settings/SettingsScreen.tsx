'use client'
import { useRef } from 'react'
import { useStore } from '@/lib/store'
import { exportLibrary, importLibrary } from '@/lib/db'
import { prewarmConfig, syncItemFull } from '@/lib/mediaSync'
import { resolveId } from '@/hooks/usePosterSync'
import type { ExportData, LibraryItem } from '@/lib/types'

const REGIONS = [
  {code:'AR',name:'Argentina'},{code:'AU',name:'Australia'},{code:'BR',name:'Brazil'},
  {code:'CA',name:'Canada'},{code:'DE',name:'Germany'},{code:'ES',name:'Spain'},
  {code:'FR',name:'France'},{code:'GB',name:'United Kingdom'},{code:'IT',name:'Italy'},
  {code:'JP',name:'Japan'},{code:'KR',name:'South Korea'},{code:'MX',name:'Mexico'},
  {code:'US',name:'United States'},
]

function normaliseItem(raw: Record<string,unknown>): LibraryItem | null {
  const rawId = raw['id'] ?? raw['tmdb_id']
  const id = typeof rawId==='number' ? rawId : typeof rawId==='string' ? parseInt(rawId,10) : NaN
  if (!id || isNaN(id) || id<=0) return null
  const rawMedia = String(raw['mediaType']||raw['media_type']||raw['type']||'')
  const mediaType: 'movie'|'tv' = rawMedia==='movie' ? 'movie' : 'tv'
  const rawType = String(raw['type']||raw['media_type']||'')
  let type: 'movies'|'series'|'anime' = 'series'
  if (rawType==='movies'||rawMedia==='movie') type='movies'
  else if (rawType==='anime') type='anime'
  const rawStatus = raw['status']
  const VALID_STATUSES = ['pending','watching','watched'] as const
  const status = typeof rawStatus === 'string' && (VALID_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as 'pending'|'watching'|'watched')
    : null
  const title = String(raw['title']||raw['name']||'')
  if (!title) return null
  return { id, mediaType, type, title, year:String(raw['year']||''), poster:String(raw['poster']||''),
    tmdbRating:String(raw['tmdbRating']||raw['tmdb_rating']||'—'), status,
    userRating: typeof raw['userRating']==='number' ? raw['userRating'] : typeof raw['global_rating']==='number' ? (raw['global_rating'] as number) : undefined,
    seasonData:(raw['seasonData'] as LibraryItem['seasonData'])??{}, notes:String(raw['notes']||''),
    addedAt: typeof raw['addedAt']==='number' ? raw['addedAt'] : Date.now(),
    updatedAt: typeof raw['updatedAt']==='number' ? raw['updatedAt'] : Date.now(),
    imdbId:typeof raw['imdbId']==='string'?raw['imdbId']:undefined,
    imdbRating:typeof raw['imdbRating']==='string'?raw['imdbRating']:undefined,
    rottenTomatoes:typeof raw['rottenTomatoes']==='string'?raw['rottenTomatoes']:undefined,
    metacritic:typeof raw['metacritic']==='string'?raw['metacritic']:undefined,
    rated:typeof raw['rated']==='string'?raw['rated']:undefined,
    runtime:typeof raw['runtime']==='string'?raw['runtime']:undefined,
    director:typeof raw['director']==='string'?raw['director']:undefined,
  }
}

async function hydrateBatch(items: LibraryItem[], upsertItem: (i:LibraryItem)=>Promise<void>, showToast:(m:string)=>void): Promise<void> {
  const needsWork = items.filter(it => !it.poster||it.poster===''||!it.imdbRating)
  if (!needsWork.length) return
  try { await prewarmConfig() } catch {}
  const BATCH=3; let synced=0
  for (let i=0; i<needsWork.length; i+=BATCH) {
    await Promise.all(needsWork.slice(i,i+BATCH).map(async item => {
      const ownId=resolveId(item); if (!ownId) return
      try { const u=await syncItemFull(item,ownId); await upsertItem(u); synced++ } catch {}
    }))
    if (i+BATCH<needsWork.length) await new Promise<void>(r=>setTimeout(r,300))
  }
  if (synced>0) showToast(`✓ Synced ${synced} item${synced!==1?'s':''}`)
}

export default function SettingsScreen() {
  const { settings, updateSettings, showToast, loadLibrary:reloadLib, upsertItem } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    const data = await exportLibrary()
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'})
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob)
    a.download=`rosca-library-${new Date().toISOString().slice(0,10)}.json`; a.click()
    showToast('Library exported ✓')
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file=e.target.files?.[0]; if (!file) return; e.target.value=''
    let data: ExportData
    try { data=JSON.parse(await file.text()) } catch { showToast('⚠️ Cannot parse JSON'); return }
    if (!data.library||typeof data.library!=='object') { showToast('⚠️ Missing "library" key'); return }
    const normalised=(Object.values(data.library) as Array<Record<string,unknown>>).map(normaliseItem).filter((it): it is LibraryItem => it!==null)
    if (!normalised.length) { showToast('⚠️ No valid items'); return }
    await importLibrary({...data,library:Object.fromEntries(normalised.map(i=>[i.id,i]))})
    await reloadLib()
    showToast(`Imported ${normalised.length} item${normalised.length!==1?'s':''} ✓ — syncing…`)
    hydrateBatch(normalised,upsertItem,showToast)
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background:'var(--bg)' }}>
      <div className="flex flex-col gap-4 px-4 pt-4 pb-12">
        <p className="font-bold uppercase tracking-widest" style={{ fontSize:11, color:'var(--text-faint)' }}>Preferences</p>

        <Card title="Streaming Region">
          <div className="relative">
            <select value={settings.region} onChange={e=>{updateSettings({region:e.target.value});showToast(`Region → ${e.target.value}`)}}
              aria-label="Streaming region" className="w-full appearance-none rounded-lg px-3 py-3 text-[14px] text-white pr-8"
              style={{ background:'var(--surface-3)', border:'1px solid var(--border-dim)', minHeight:44 }}>
              {REGIONS.map(r=><option key={r.code} value={r.code}>{r.code} — {r.name}</option>)}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" style={{ fontSize:11, color:'var(--text-faint)' }}>▾</span>
          </div>
        </Card>

        <Card title="Export Library">
          <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10 }}>Download a complete JSON backup.</p>
          <Btn label="Download library.json" icon="⬇" onClick={handleExport} />
        </Card>

        <Card title="Import Library">
          <div className="rounded-lg p-3 mb-3" style={{ background:'rgba(252,219,50,0.07)', border:'1px solid rgba(252,219,50,0.22)' }}>
            <p className="font-bold mb-2" style={{ fontSize:11, color:'var(--sun)' }}>⚠️ Read before importing</p>
            <ol className="flex flex-col gap-1.5" role="list">
              {['Export a backup first.','Merges by ID — existing items are overwritten.','Accepts "id" or "tmdb_id" fields.','Posters & ratings sync automatically.'].map((s,i)=>(
                <li key={i} className="flex gap-2" style={{ fontSize:11, color:'var(--text-muted)' }}>
                  <span style={{ color:'var(--text-faint)', flexShrink:0 }}>{i+1}.</span>{s}
                </li>
              ))}
            </ol>
          </div>
          <Btn label="Choose .json to import" icon="⬆" onClick={()=>fileRef.current?.click()} />
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} aria-hidden="true" />
        </Card>

        <p className="text-center" style={{ fontSize:10, color:'var(--text-faint)' }}>All data is stored locally on this device.</p>
      </div>
    </div>
  )
}

function Card({ title, children }: { title:string; children:React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background:'var(--surface)', border:'1px solid var(--border-dim)' }}>
      <div className="px-4 py-3" style={{ borderBottom:'1px solid var(--border-dim)' }}>
        <p className="font-black text-white uppercase tracking-widest" style={{ fontSize:11 }}>{title}</p>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}
function Btn({ label, icon, onClick }: { label:string; icon:string; onClick:()=>void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 rounded-lg font-medium text-white transition-opacity active:opacity-60"
      style={{ background:'var(--surface-3)', border:'1px solid var(--border-dim)', padding:'12px 16px', fontSize:14, minHeight:44 }}>
      <span style={{ fontSize:15 }} aria-hidden="true">{icon}</span>{label}
    </button>
  )
}
