'use client'
import { useStore } from '@/lib/store'
export default function Toast() {
  const { toast } = useStore()
  if (!toast) return null
  return (
    <div role="status" aria-live="polite"
      className="absolute left-1/2 -translate-x-1/2 font-semibold rounded-full whitespace-nowrap pointer-events-none animate-pop glass-strong"
      style={{ bottom:'calc(84px + env(safe-area-inset-bottom,0px) + 10px)', color:'var(--text)', fontSize:12, padding:'9px 18px', zIndex:999, boxShadow:'var(--shadow-lg)' }}>
      {toast}
    </div>
  )
}
