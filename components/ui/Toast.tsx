'use client'
import { useStore } from '@/lib/store'

export default function Toast() {
  const { toast } = useStore()
  if (!toast) return null
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 font-medium rounded-full whitespace-nowrap shadow-xl pointer-events-none animate-fade-in"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom) + 70px)',
        background: 'rgba(30,20,18,0.96)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: '#fff',
        fontSize: 12,
        padding: '7px 16px',
        zIndex: 999,
      }}
    >
      {toast}
    </div>
  )
}
