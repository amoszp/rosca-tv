'use client'
import type { Status } from '@/lib/types'

/* Nordic Minimal status badge colours */
const C: Record<Status, { bg: string; text: string; dot: string; border: string; label: string }> = {
  pending:  {
    bg:     'rgba(180,83,9,0.20)',
    text:   '#fca56a',
    dot:    '#d97706',
    border: 'rgba(180,83,9,0.30)',
    label:  'Pending',
  },
  watching: {
    bg:     'rgba(16,185,129,0.15)',
    text:   '#34d399',
    dot:    '#10b981',
    border: 'rgba(16,185,129,0.30)',
    label:  'Watching',
  },
  watched: {
    bg:     'rgba(100,116,139,0.15)',
    text:   '#94a3b8',
    dot:    '#64748b',
    border: 'rgba(100,116,139,0.30)',
    label:  'Watched',
  },
}

export default function StatusBadge({ status }: { status: Status | null }) {
  if (!status) return null
  const c = C[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-semibold"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, fontSize: 10, padding: '2px 8px 2px 6px' }}
      aria-label={`Status: ${c.label}`}
    >
      <span className="rounded-full flex-shrink-0" style={{ width: 5, height: 5, background: c.dot }} aria-hidden="true" />
      {c.label}
    </span>
  )
}
