'use client'
import { useRef, useCallback, useState, useLayoutEffect, useId } from 'react'

// 0.1 step: 1.0 → 10.0 = 91 values
const MIN = 1.0
const MAX = 10.0
const STEP = 0.1

function snap(val: number): number {
  return Math.max(MIN, Math.min(MAX, Math.round(val / STEP) * STEP))
}

interface Props {
  value:    number | undefined
  onChange: (v: number | undefined) => void
  label?:   string
  compact?: boolean
}

export default function FluidSlider({ value, onChange, label, compact = false }: Props) {
  const [inputVal, setInputVal] = useState(value !== undefined ? value.toFixed(1) : '')
  const [focused,  setFocused]  = useState(false)
  const trackRef  = useRef<HTMLDivElement>(null)
  const dragging  = useRef(false)
  const cbRef     = useRef(onChange)
  const inputRef  = useRef<HTMLInputElement>(null)
  const id        = useId()

  useLayoutEffect(() => { cbRef.current = onChange }, [onChange])
  useLayoutEffect(() => {
    if (!focused) setInputVal(value !== undefined ? value.toFixed(1) : '')
  }, [value, focused])

  const pct = value !== undefined ? ((value - MIN) / (MAX - MIN)) * 100 : 0

  const applyRatio = useCallback((clientX: number) => {
    if (!trackRef.current) return
    const rect  = trackRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    cbRef.current(snap(MIN + ratio * (MAX - MIN)))
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputVal(e.target.value)
  }
  const handleInputBlur = () => {
    setFocused(false)
    const n = parseFloat(inputVal.replace(',', '.'))
    if (!isNaN(n)) onChange(snap(n))
    else setInputVal(value !== undefined ? value.toFixed(1) : '')
  }
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { inputRef.current?.blur() }
    if (e.key === 'Escape') { setInputVal(value !== undefined ? value.toFixed(1) : ''); setFocused(false); inputRef.current?.blur() }
  }

  const thumbSize   = compact ? 18 : 22
  const trackHeight = compact ? 6  : 8

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={id} className="font-black text-white uppercase tracking-widest" style={{ fontSize: 10 }}>
          {label}
        </label>
      )}

      <div className="flex items-center gap-3">
        {/* Track + Thumb */}
        <div className="flex-1 relative flex items-center"
          style={{ height: thumbSize + 12, touchAction: 'none', cursor: 'pointer' }}
          ref={trackRef}
          onPointerDown={e => {
            e.currentTarget.setPointerCapture(e.pointerId)
            dragging.current = true
            applyRatio(e.clientX)
          }}
          onPointerMove={e => { if (!dragging.current) return; applyRatio(e.clientX) }}
          onPointerUp={() => { dragging.current = false }}
          onPointerCancel={() => { dragging.current = false }}
          role="slider"
          aria-valuemin={MIN} aria-valuemax={MAX} aria-valuenow={value} aria-label={label || 'Rating'}
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'ArrowRight') onChange(snap((value ?? MIN) + STEP))
            if (e.key === 'ArrowLeft')  onChange(snap((value ?? MIN) - STEP))
            if (e.key === 'Home') onChange(MIN)
            if (e.key === 'End')  onChange(MAX)
          }}
        >
          {/* Background rail — high contrast against #141D38 */}
          <div className="absolute w-full rounded-full"
            style={{ height: trackHeight, background: '#2A385B', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }} />

          {/* Filled rail — glowing sun yellow */}
          {value !== undefined && (
            <div className="absolute rounded-full"
              style={{
                height: trackHeight,
                width: `${pct}%`,
                background: 'linear-gradient(90deg, rgba(252,219,50,0.6) 0%, #FCDB32 100%)',
                boxShadow: '0 0 10px rgba(252,219,50,0.5)',
                transition: dragging.current ? 'none' : 'width 0.06s ease',
              }} />
          )}

          {/* Thumb */}
          {value !== undefined && (
            <div className="absolute rounded-full"
              style={{
                left: `${pct}%`,
                transform: 'translateX(-50%)',
                width: thumbSize, height: thumbSize,
                background: '#FCDB32',
                boxShadow: '0 0 0 3px rgba(252,219,50,0.28), 0 2px 8px rgba(0,0,0,0.5)',
                transition: dragging.current ? 'none' : 'left 0.06s ease',
                zIndex: 2,
              }} />
          )}

          {value === undefined && (
            <div className="absolute w-full flex items-center justify-center pointer-events-none" aria-hidden="true">
              <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>drag to rate</span>
            </div>
          )}
        </div>

        {/* Editable numeric badge */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            id={id}
            ref={inputRef}
            type="number"
            min={MIN} max={MAX} step={STEP}
            value={inputVal}
            placeholder="—"
            onFocus={() => setFocused(true)}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            aria-label={`${label || 'Rating'} value`}
            className="rounded-lg text-center font-black tabular-nums text-white"
            style={{
              width: compact ? 48 : 56, height: compact ? 32 : 38,
              background: value !== undefined ? 'rgba(252,219,50,0.12)' : 'var(--surface-3)',
              border: `1.5px solid ${value !== undefined ? 'rgba(252,219,50,0.45)' : 'var(--border-dim)'}`,
              fontSize: compact ? 13 : 16,
            }}
          />
          <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>/10</span>
        </div>
      </div>

      {/* Min / max labels */}
      <div className="flex justify-between" style={{ marginTop: -4, paddingRight: compact ? 68 : 80 }} aria-hidden="true">
        <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>1.0</span>
        <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>10.0</span>
      </div>

      {/* Clear button */}
      {value !== undefined && (
        <button onClick={() => { onChange(undefined); setInputVal('') }}
          aria-label="Clear rating"
          className="self-start transition-opacity active:opacity-50"
          style={{ fontSize: 10, color: 'var(--text-faint)', padding: '0 2px' }}>
          Clear ✕
        </button>
      )}
    </div>
  )
}
