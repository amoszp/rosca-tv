'use client'
import { useStore } from '@/lib/store'
export default function Toast() {
  const { toast } = useStore()
  if (!toast) return null
  return (
    <div role="status" aria-live="polite"
      className="absolute left-1/2 -translate-x-1/2 font-semibold rounded-full whitespace-nowrap pointer-events-none animate-pop"
      style={{ bottom:'calc(52px + env(safe-area-inset-bottom,0px) + 10px)', background:'var(--surface-3)', border:'1px solid var(--border)', color:'var(--text)', fontSize:12, padding:'7px 16px', zIndex:999, boxShadow:'var(--shadow-lg)' }}>
      {toast}
    </div>
  )
}
