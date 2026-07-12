import type { Status } from '@/lib/types'

const STYLE: Record<Status, { bg: string; text: string; dot: string }> = {
  pending:  { bg: 'rgba(234,179,8,0.15)',  text: '#fde68a', dot: '#f59e0b' },
  watching: { bg: 'rgba(59,130,246,0.15)', text: '#93c5fd', dot: '#3b82f6' },
  watched:  { bg: 'rgba(34,197,94,0.15)',  text: '#86efac', dot: '#22c55e' },
}
const LABEL: Record<Status, string> = {
  pending: 'Pending', watching: 'Watching', watched: 'Watched',
}

export default function StatusBadge({ status }: { status: Status }) {
  const s = STYLE[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-semibold"
      style={{ background: s.bg, color: s.text, fontSize: 10, padding: '2px 8px 2px 6px' }}
    >
      <span className="rounded-full flex-shrink-0" style={{ width: 5, height: 5, background: s.dot }} />
      {LABEL[status]}
    </span>
  )
}
