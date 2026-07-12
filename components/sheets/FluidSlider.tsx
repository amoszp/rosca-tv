'use client'
import { useRef, useCallback, useState, useLayoutEffect } from 'react'

/* ─── 1.0 → 10.0 in 0.5 steps ─── */
const STEPS = Array.from({ length: 19 }, (_, i) =>
  parseFloat((1.0 + i * 0.5).toFixed(1))
)

/* Score → accent colour (dark-pastel spectrum) */
function trackColor(v: number | undefined): string {
  if (v === undefined) return '#3a2020'
  const t = (v - 1) / 9
  if (t < 0.5) {
    // dark red → warm brown
    const r = Math.round(0x5a + (0x7a - 0x5a) * (t / 0.5))
    const g = Math.round(0x18 + (0x38 - 0x18) * (t / 0.5))
    const b = Math.round(0x18 + (0x20 - 0x18) * (t / 0.5))
    return `rgb(${r},${g},${b})`
  } else {
    // warm brown → teal/blue
    const u = (t - 0.5) / 0.5
    const r = Math.round(0x7a + (0x1a - 0x7a) * u)
    const g = Math.round(0x38 + (0x7a - 0x38) * u)
    const b = Math.round(0x20 + (0x6a - 0x20) * u)
    return `rgb(${r},${g},${b})`
  }
}

interface Props {
  value:    number | undefined
  onChange: (v: number | undefined) => void
  label?:   string
  compact?: boolean   // true = season slider (smaller)
}

export default function FluidSlider({ value, onChange, label, compact = false }: Props) {
  const [typing, setTyping]     = useState(false)
  const [inputStr, setInputStr] = useState('')
  const trackRef  = useRef<HTMLDivElement>(null)
  const dragging  = useRef(false)
  const cbRef     = useRef(onChange)
  useLayoutEffect(() => { cbRef.current = onChange }, [onChange])

  const currentIdx = value !== undefined
    ? STEPS.findIndex(s => Math.abs(s - value) < 0.01)
    : -1
  const pct = currentIdx >= 0 ? (currentIdx / (STEPS.length - 1)) * 100 : 0
  const color = trackColor(value)

  const applyClientX = useCallback((clientX: number) => {
    if (!trackRef.current) return
    const rect  = trackRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const idx   = Math.round(ratio * (STEPS.length - 1))
    cbRef.current(STEPS[idx])
  }, [])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = true
    applyClientX(e.clientX)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    applyClientX(e.clientX)
  }
  const onPointerUp = () => { dragging.current = false }

  const commitType = () => {
    const n = parseFloat(inputStr.replace(',', '.'))
    if (!isNaN(n) && n >= 1 && n <= 10) {
      const nearest = STEPS.reduce((p, c) => Math.abs(c - n) < Math.abs(p - n) ? c : p)
      onChange(nearest)
    }
    setTyping(false)
  }

  if (typing) {
    return (
      <div className="flex flex-col gap-2">
        {label && <p className="font-black text-white uppercase tracking-widest" style={{ fontSize: 10 }}>{label}</p>}
        <div className="flex items-center gap-2">
          <input
            autoFocus
            type="number" step="0.5" min="1" max="10"
            value={inputStr}
            onChange={e => setInputStr(e.target.value)}
            onBlur={commitType}
            onKeyDown={e => e.key === 'Enter' && commitType()}
            placeholder="1.0 – 10.0"
            className="flex-1 rounded-[10px] text-center font-black tabular-nums text-white"
            style={{
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(234,168,71,0.45)',
              fontSize: compact ? 16 : 20,
              padding: compact ? '8px 10px' : '11px 12px',
            }}
          />
          <button onClick={commitType}
            className="rounded-[10px] font-bold text-white"
            style={{ background: '#c47d1e', padding: compact ? '8px 14px' : '11px 18px', fontSize: 13 }}>
            Set
          </button>
          <button onClick={() => setTyping(false)}
            className="rounded-[10px]"
            style={{ background: 'rgba(255,255,255,0.07)', padding: compact ? '8px 10px' : '11px 12px', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            ✕
          </button>
        </div>
      </div>
    )
  }

  const thumbSize   = compact ? 20 : 26
  const trackHeight = compact ? 6  : 8

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <p className="font-black text-white uppercase tracking-widest" style={{ fontSize: 10 }}>{label}</p>
      )}

      {/* Score badge + clear */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { setInputStr(value !== undefined ? value.toFixed(1) : ''); setTyping(true) }}
          className="flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 active:opacity-60 transition-opacity"
          style={{ background: value !== undefined ? `${color}55` : 'rgba(255,255,255,0.06)', border: `1px solid ${value !== undefined ? color : 'rgba(255,255,255,0.1)'}` }}
        >
          <span
            className="font-black tabular-nums leading-none"
            style={{
              fontSize: compact ? 18 : 24,
              color: value !== undefined ? '#fff' : 'rgba(255,255,255,0.25)',
            }}
          >
            {value !== undefined ? value.toFixed(1) : '—'}
          </span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>/10</span>
        </button>

        {value !== undefined && (
          <button
            onClick={() => onChange(undefined)}
            className="active:opacity-50"
            style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', padding: '4px 8px' }}
          >
            Clear ✕
          </button>
        )}
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative flex items-center select-none"
        style={{ height: thumbSize + 8, cursor: 'pointer', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Background rail */}
        <div
          className="absolute rounded-full w-full"
          style={{ height: trackHeight, background: 'rgba(255,255,255,0.08)' }}
        />

        {/* Filled portion */}
        {value !== undefined && (
          <div
            className="absolute rounded-full"
            style={{
              height: trackHeight,
              width: `${pct}%`,
              background: `linear-gradient(90deg, #5a1818 0%, ${color} 100%)`,
              boxShadow: `0 0 8px ${color}66`,
              transition: 'width 0.08s ease, background 0.15s ease',
            }}
          />
        )}

        {/* Step tick marks */}
        {STEPS.map((_, i) => {
          const x = (i / (STEPS.length - 1)) * 100
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${x}%`,
                width: 1.5,
                height: trackHeight * 0.6,
                background: 'rgba(255,255,255,0.15)',
                transform: 'translateX(-50%)',
                top: '50%',
                marginTop: -(trackHeight * 0.3),
              }}
            />
          )
        })}

        {/* Thumb */}
        {value !== undefined && (
          <div
            className="absolute rounded-full"
            style={{
              left: `${pct}%`,
              transform: 'translateX(-50%)',
              width: thumbSize,
              height: thumbSize,
              background: '#fff',
              boxShadow: `0 0 0 3px ${color}, 0 2px 8px rgba(0,0,0,0.5)`,
              transition: 'left 0.08s ease, box-shadow 0.15s ease',
              zIndex: 2,
            }}
          />
        )}

        {/* "Tap to start" hint when no value */}
        {value === undefined && (
          <div className="absolute w-full flex items-center justify-center">
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>drag to rate</span>
          </div>
        )}
      </div>

      {/* Min / max labels */}
      <div className="flex justify-between" style={{ marginTop: -4 }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>1.0</span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>10.0</span>
      </div>
    </div>
  )
}
