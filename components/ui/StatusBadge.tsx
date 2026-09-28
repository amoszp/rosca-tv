'use client'
import type { Status } from '@/lib/types'
import { STATUS_STYLES } from '@/lib/statusStyles'

export default function StatusBadge({ status }: { status: Status | null }) {
  if (!status) return null
  const c = STATUS_STYLES[status]
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
