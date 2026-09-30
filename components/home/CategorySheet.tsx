'use client'
import { getTitle, formatRating } from '@/lib/tmdb'
import type { TMDBResult } from '@/lib/types'
import { useT } from '@/lib/i18n'
import PosterCard from './PosterCard'

interface Props { title: string; items: TMDBResult[]; onSelect: (r: TMDBResult) => void; onClose: () => void }

/* Full-list overlay for one "Based on Your Interests" category (Series /
   Anime / Movies) — reuses the same backdrop + slide-up sheet pattern as
   the item detail sheet, so it reads as the same kind of surface. */
export default function CategorySheet({ title, items, onSelect, onClose }: Props) {
  const t = useT()
  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
      role="dialog" aria-modal="true" aria-label={title}>

      <div className="w-full overflow-y-auto animate-slide-up"
        style={{ background: 'var(--sheet-bg)', borderRadius: '28px 28px 0 0', maxHeight: '85dvh', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 16px)', boxShadow: 'var(--shadow-overlay)', borderTop: '1px solid var(--border-dim)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-4 pt-3 pb-4" style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--sheet-bg)' }}>
          <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: 36, height: 4, background: 'var(--border)', borderRadius: 2 }} aria-hidden="true" />
          <p className="font-black uppercase tracking-widest" style={{ fontSize: 12, color: 'var(--text-faint)' }}>{title}</p>
          <button onClick={onClose} aria-label={t.sheet.close}
            className="flex items-center justify-center rounded-full transition-opacity active:opacity-50"
            style={{ width: 32, height: 32, background: 'var(--surface-3)', color: 'var(--text-muted)', fontSize: 18, border: '1px solid var(--border-dim)' }}>
            ×
          </button>
        </div>

        <div className="px-4 pb-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 92px))', columnGap: 12, rowGap: 16 }}>
          {items.map(r => (
            <PosterCard key={r.id} posterPath={r.poster_path ?? null} title={getTitle(r)}
              meta={r.vote_average ? `★ ${formatRating(r.vote_average)}` : undefined}
              onPress={() => onSelect(r)} />
          ))}
        </div>
      </div>
    </div>
  )
}
