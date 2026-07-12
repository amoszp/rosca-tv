'use client'
import { useRef, useEffect, useCallback, useState, useLayoutEffect } from 'react'

/* ─── Rating steps 1.0 → 10.0 in 0.5 increments ── */
const STEPS: number[] = Array.from({ length: 19 }, (_, i) =>
  parseFloat((1.0 + i * 0.5).toFixed(1))
)
const ITEM_H  = 42   // px per row
const VISIBLE = 4    // rows above + below centre (total visible = 2*VISIBLE+1 = 9)

/* ─── Props ────────────────────────────────────── */
interface Props {
  value:         number | undefined
  onChange:      (v: number | undefined) => void
  label?:        string
  estimate?:     number   // informational season average
}

export default function WheelPicker({ value, onChange, label, estimate }: Props) {
  const [typing, setTyping]     = useState(false)
  const [inputStr, setInputStr] = useState('')

  /* refs that don't trigger re-renders */
  const listRef     = useRef<HTMLDivElement>(null)
  const offsetRef   = useRef(0)    // current list translateY
  const dragRef     = useRef({ active: false, startY: 0, startOff: 0, vy: 0, prevY: 0, prevT: 0 })
  const rafRef      = useRef(0)
  const onChangeRef = useRef(onChange)

  /* keep onChangeRef fresh without causing effect re-runs */
  useLayoutEffect(() => { onChangeRef.current = onChange }, [onChange])

  /* ── helpers ──────────────────────────────── */
  const centerPad = VISIBLE * ITEM_H

  const clampOff = (v: number) =>
    Math.max(-(STEPS.length - 1) * ITEM_H + centerPad, Math.min(centerPad, v))

  const idxFromOff = (off: number) =>
    Math.max(0, Math.min(STEPS.length - 1, Math.round((centerPad - off) / ITEM_H)))

  const applyStyles = useCallback((selIdx: number) => {
    if (!listRef.current) return
    listRef.current.querySelectorAll<HTMLElement>('.wi').forEach((el, i) => {
      const d = Math.abs(i - selIdx)
      el.style.color   = d === 0 ? '#fff' : d === 1 ? 'rgba(255,255,255,0.52)' : d === 2 ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.09)'
      el.style.transform = d === 0 ? 'scale(1.10)' : d === 1 ? 'scale(0.92)' : d === 2 ? 'scale(0.84)' : 'scale(0.78)'
      el.style.opacity   = d <= 3 ? '1' : '0.4'
    })
  }, [])

  const setOffset = useCallback((off: number, anim: boolean) => {
    if (!listRef.current) return
    offsetRef.current = off
    listRef.current.style.transition = anim ? 'transform 0.22s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none'
    listRef.current.style.transform  = `translateY(${off}px)`
    applyStyles(idxFromOff(off))
  }, [applyStyles])

  const snapToIdx = useCallback((idx: number, anim = true) => {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, idx))
    setOffset(clampOff(centerPad - clamped * ITEM_H), anim)
    onChangeRef.current(STEPS[clamped])
  }, [setOffset, centerPad])

  /* ── mount: position wheel at current value ── */
  useEffect(() => {
    const idx = value !== undefined
      ? Math.max(0, STEPS.findIndex(s => s === value))
      : 4  // default ~3.0
    setOffset(clampOff(centerPad - idx * ITEM_H), false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])   // intentionally only on mount

  /* ── touch handlers ───────────────────────── */
  const onTouchStart = (e: React.TouchEvent) => {
    cancelAnimationFrame(rafRef.current)
    const t = e.touches[0]
    dragRef.current = { active: true, startY: t.clientY, startOff: offsetRef.current, vy: 0, prevY: t.clientY, prevT: Date.now() }
    if (listRef.current) listRef.current.style.transition = 'none'
  }

  const onTouchMove = (e: React.TouchEvent) => {
    const d = dragRef.current
    if (!d.active) return
    const t   = e.touches[0]
    const now = Date.now()
    const dt  = Math.max(1, now - d.prevT)
    d.vy      = (t.clientY - d.prevY) / dt
    d.prevY   = t.clientY
    d.prevT   = now
    const off = clampOff(d.startOff + (t.clientY - d.startY))
    offsetRef.current = off
    if (listRef.current) listRef.current.style.transform = `translateY(${off}px)`
    applyStyles(idxFromOff(off))
  }

  const release = useCallback(() => {
    const d = dragRef.current
    d.active = false
    let vel  = d.vy * 14
    let cur  = offsetRef.current

    const tick = () => {
      if (Math.abs(vel) < 0.6) {
        snapToIdx(idxFromOff(cur))
        return
      }
      vel *= 0.86
      cur  = clampOff(cur + vel)
      if (listRef.current) {
        listRef.current.style.transition = 'none'
        listRef.current.style.transform  = `translateY(${cur}px)`
      }
      offsetRef.current = cur
      applyStyles(idxFromOff(cur))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [snapToIdx, applyStyles])

  /* ── mouse support ────────────────────────── */
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    cancelAnimationFrame(rafRef.current)
    dragRef.current = { active: true, startY: e.clientY, startOff: offsetRef.current, vy: 0, prevY: e.clientY, prevT: Date.now() }
    if (listRef.current) listRef.current.style.transition = 'none'

    const onMove = (ev: MouseEvent) => {
      const d   = dragRef.current
      const now = Date.now()
      const dt  = Math.max(1, now - d.prevT)
      d.vy      = (ev.clientY - d.prevY) / dt
      d.prevY   = ev.clientY
      d.prevT   = now
      const off = clampOff(d.startOff + (ev.clientY - d.startY))
      offsetRef.current = off
      if (listRef.current) listRef.current.style.transform = `translateY(${off}px)`
      applyStyles(idxFromOff(off))
    }
    const onUp = () => {
      release()
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [release, applyStyles])

  /* ── manual typing ────────────────────────── */
  const commitType = () => {
    const n = parseFloat(inputStr.replace(',', '.'))
    if (!isNaN(n) && n >= 1 && n <= 10) {
      const nearest = STEPS.reduce((p, c) => Math.abs(c - n) < Math.abs(p - n) ? c : p)
      snapToIdx(STEPS.indexOf(nearest))
    }
    setTyping(false)
  }

  /* ── render: typing mode ──────────────────── */
  if (typing) {
    return (
      <div className="flex flex-col gap-2">
        {label && <PickerLabel label={label} estimate={estimate} />}
        <div className="flex items-center gap-2">
          <input
            autoFocus
            type="number" step="0.5" min="1" max="10"
            value={inputStr}
            onChange={e => setInputStr(e.target.value)}
            onBlur={commitType}
            onKeyDown={e => e.key === 'Enter' && commitType()}
            placeholder="e.g. 7.5"
            className="flex-1 rounded-[10px] text-center text-white font-black tabular-nums"
            style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(147,197,253,0.5)', fontSize: 18, padding: '10px 12px' }}
          />
          <button
            onClick={commitType}
            className="rounded-[10px] font-bold text-white"
            style={{ background: '#2563eb', padding: '10px 16px', fontSize: 14 }}
          >
            Set
          </button>
          <button
            onClick={() => setTyping(false)}
            className="rounded-[10px] font-medium"
            style={{ background: 'rgba(255,255,255,0.07)', padding: '10px 12px', fontSize: 14, color: 'var(--muted)' }}
          >
            ✕
          </button>
        </div>
      </div>
    )
  }

  /* ── render: wheel mode ───────────────────── */
  return (
    <div className="flex flex-col gap-2">
      {label && <PickerLabel label={label} estimate={estimate} />}
      <div className="flex items-center gap-3">

        {/* Wheel */}
        <div className="flex-1 wheel-wrap"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={release}
          onMouseDown={onMouseDown}
        >
          <div className="wheel-band" />
          <div
            ref={listRef}
            className="wheel-list"
            style={{ paddingTop: centerPad, paddingBottom: centerPad }}
          >
            {STEPS.map((s, i) => (
              <div
                key={s}
                className="wheel-item wi"
                onClick={() => snapToIdx(i)}
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              >
                {s.toFixed(1)}
              </div>
            ))}
          </div>
        </div>

        {/* Tap-to-type badge */}
        <button
          onClick={() => { setInputStr(value !== undefined ? value.toFixed(1) : ''); setTyping(true) }}
          className="flex flex-col items-center justify-center rounded-[14px] active:scale-95 transition-transform flex-shrink-0"
          style={{ width: 64, height: 64, background: 'var(--dp-red-3)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <span className="font-black text-white tabular-nums" style={{ fontSize: 22, lineHeight: 1 }}>
            {value !== undefined ? value.toFixed(1) : '—'}
          </span>
          <span style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>tap to type</span>
        </button>

        {/* Clear */}
        {value !== undefined && (
          <button
            onClick={() => onChange(undefined)}
            className="flex items-center justify-center rounded-full active:opacity-60 flex-shrink-0"
            style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.05)', fontSize: 13, color: 'var(--muted)' }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

function PickerLabel({ label, estimate }: { label: string; estimate?: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-bold text-white" style={{ fontSize: 12 }}>{label}</span>
      {estimate !== undefined && (
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>
          Avg: {estimate.toFixed(1)}
        </span>
      )}
    </div>
  )
}
