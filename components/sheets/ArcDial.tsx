'use client'
import { useRef, useCallback, useState, useLayoutEffect } from 'react'

/* ─── 19 steps: 1.0 → 10.0 in 0.5 increments ───── */
const STEPS = Array.from({ length: 19 }, (_, i) =>
  parseFloat((1.0 + i * 0.5).toFixed(1))
)

/* Arc: 150° left → 30° right, sweeping 240° through bottom */
const ARC_START = (Math.PI / 180) * 150   // 150°
const ARC_END   = (Math.PI / 180) * 390   // 30° + 360°
const ARC_SWEEP = ARC_END - ARC_START     // 240°

const idxToAngle = (i: number) =>
  ARC_START + (i / (STEPS.length - 1)) * ARC_SWEEP

const angleToIdx = (a: number) => {
  const norm = ((a - ARC_START) / ARC_SWEEP) * (STEPS.length - 1)
  return Math.max(0, Math.min(STEPS.length - 1, Math.round(norm)))
}

/* Dark-pastel gradient: red → sepia → green-blue */
function scoreColor(v: number | undefined): string {
  if (v === undefined) return 'rgba(255,255,255,0.15)'
  const t = (v - 1) / 9
  const lerp = (a: number, b: number, x: number) => Math.round(a + (b - a) * x)
  if (t <= 0.5) {
    const u = t / 0.5
    return `rgb(${lerp(0x2d, 0x26, u)},${lerp(0x15, 0x1e, u)},${lerp(0x15, 0x1a, u)})`
  } else {
    const u = (t - 0.5) / 0.5
    return `rgb(${lerp(0x26, 0x1e, u)},${lerp(0x1e, 0x2d, u)},${lerp(0x1a, 0x24, u)})`
  }
}

/* Bright glow colour for the arc stroke itself */
function strokeColor(v: number | undefined): string {
  if (v === undefined) return 'rgba(255,255,255,0.12)'
  const t = (v - 1) / 9
  const lerp = (a: number, b: number, x: number) => Math.round(a + (b - a) * x)
  if (t <= 0.5) {
    const u = t / 0.5
    return `rgb(${lerp(0xc0, 0xa0, u)},${lerp(0x30, 0x70, u)},${lerp(0x30, 0x50, u)})`
  } else {
    const u = (t - 0.5) / 0.5
    return `rgb(${lerp(0xa0, 0x30, u)},${lerp(0x70, 0xb0, u)},${lerp(0x50, 0x80, u)})`
  }
}

function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
  const x1 = cx + r * Math.cos(from); const y1 = cy + r * Math.sin(from)
  const x2 = cx + r * Math.cos(to);   const y2 = cy + r * Math.sin(to)
  const large = (to - from) > Math.PI ? 1 : 0
  return `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`
}

interface Props {
  value:    number | undefined
  onChange: (v: number | undefined) => void
  size?:    'md' | 'sm'     // md = global, sm = per-season
  label?:   string
}

export default function ArcDial({ value, onChange, size = 'md', label }: Props) {
  const [typing, setTyping]     = useState(false)
  const [inputStr, setInputStr] = useState('')
  const svgRef   = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)
  const cbRef    = useRef(onChange)
  useLayoutEffect(() => { cbRef.current = onChange }, [onChange])

  /* Dial dimensions */
  const W  = size === 'md' ? 200 : 150
  const H  = size === 'md' ? 120 : 90
  const CX = W / 2
  const CY = size === 'md' ? 108 : 82
  const R  = size === 'md' ? 78  : 58
  const SW = size === 'md' ? 10  : 7
  const FS = size === 'md' ? 34  : 22   // font size for score

  const currentIdx  = value !== undefined
    ? STEPS.findIndex(s => Math.abs(s - value) < 0.01)
    : -1
  const fillAngle   = currentIdx >= 0 ? idxToAngle(currentIdx) : ARC_START
  const thumbX      = CX + R * Math.cos(fillAngle)
  const thumbY      = CY + R * Math.sin(fillAngle)
  const arcColor    = strokeColor(value)

  const eventToAngle = useCallback((cx: number, cy: number, clientX: number, clientY: number) => {
    if (!svgRef.current) return ARC_START
    const rect   = svgRef.current.getBoundingClientRect()
    const scaleX = W / rect.width
    const scaleY = H / rect.height
    const vx     = (clientX - rect.left) * scaleX - cx
    const vy     = (clientY - rect.top)  * scaleY - cy
    let a = Math.atan2(vy, vx)
    if (a < 0) a += Math.PI * 2
    // Normalise into arc range
    if (a < ARC_START) a += Math.PI * 2
    return Math.max(ARC_START, Math.min(ARC_END, a))
  }, [W, H])

  const applyEvent = useCallback((clientX: number, clientY: number) => {
    const a   = eventToAngle(CX, CY, clientX, clientY)
    const idx = angleToIdx(a)
    cbRef.current(STEPS[idx])
  }, [eventToAngle, CX, CY])

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = true
    applyEvent(e.clientX, e.clientY)
  }
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return
    applyEvent(e.clientX, e.clientY)
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
        {label && <p className="text-[11px] font-bold text-white">{label}</p>}
        <div className="flex items-center gap-2">
          <input
            autoFocus
            type="number" step="0.5" min="1" max="10"
            value={inputStr}
            onChange={e => setInputStr(e.target.value)}
            onBlur={commitType}
            onKeyDown={e => e.key === 'Enter' && commitType()}
            placeholder="1.0 – 10.0"
            className="flex-1 rounded-[10px] text-center text-white font-black tabular-nums"
            style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(234,168,71,0.45)', fontSize: 18, padding: '10px 12px' }}
          />
          <button onClick={commitType}
            className="rounded-[10px] font-bold text-white"
            style={{ background: '#c47d1e', padding: '10px 16px', fontSize: 14 }}>
            Set
          </button>
          <button onClick={() => setTyping(false)}
            className="rounded-[10px]"
            style={{ background: 'rgba(255,255,255,0.07)', padding: '10px 12px', fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
            ✕
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      {label && (
        <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1 self-start">{label}</p>
      )}

      <div style={{ position: 'relative', width: W, height: H, maxWidth: '100%' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: '100%', touchAction: 'none', cursor: 'pointer', overflow: 'visible' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Track */}
          <path d={arcPath(CX, CY, R, ARC_START, ARC_END)}
            fill="none" stroke="rgba(255,255,255,0.08)"
            strokeWidth={SW} strokeLinecap="round" />

          {/* Fill */}
          {currentIdx >= 0 && (
            <path d={arcPath(CX, CY, R, ARC_START, fillAngle)}
              fill="none" stroke={arcColor}
              strokeWidth={SW + 2} strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 5px ${arcColor}99)`, transition: 'stroke 0.15s ease' }} />
          )}

          {/* Tick marks */}
          {STEPS.map((_, i) => {
            const a  = idxToAngle(i)
            const r1 = R - SW / 2 - 1
            const r2 = R + SW / 2 + 1
            const sel = i === currentIdx
            return (
              <line key={i}
                x1={CX + r1 * Math.cos(a)} y1={CY + r1 * Math.sin(a)}
                x2={CX + r2 * Math.cos(a)} y2={CY + r2 * Math.sin(a)}
                stroke={sel ? '#fff' : 'rgba(255,255,255,0.2)'}
                strokeWidth={sel ? 2 : 1}
                strokeLinecap="round"
              />
            )
          })}

          {/* Thumb */}
          {currentIdx >= 0 && (
            <>
              <circle cx={thumbX} cy={thumbY} r={size === 'md' ? 8 : 6}
                fill={arcColor} style={{ filter: `drop-shadow(0 0 6px ${arcColor})` }} />
              <circle cx={thumbX} cy={thumbY} r={size === 'md' ? 4 : 3} fill="#fff" opacity={0.95} />
            </>
          )}

          {/* End labels */}
          <text x={CX + R * Math.cos(ARC_START) - 4} y={CY + R * Math.sin(ARC_START) + 14}
            fill="rgba(255,255,255,0.28)" fontSize={size === 'md' ? 9 : 7}
            textAnchor="middle" fontWeight={700}>1.0</text>
          <text x={CX + R * Math.cos(ARC_END) + 4} y={CY + R * Math.sin(ARC_END) + 14}
            fill="rgba(255,255,255,0.28)" fontSize={size === 'md' ? 9 : 7}
            textAnchor="middle" fontWeight={700}>10</text>
        </svg>

        {/* Centre score — tappable */}
        <button
          onClick={() => { setInputStr(value !== undefined ? value.toFixed(1) : ''); setTyping(true) }}
          className="absolute flex flex-col items-center justify-center"
          style={{
            left: '50%', bottom: size === 'md' ? '4%' : '2%',
            transform: 'translateX(-50%)',
            pointerEvents: 'auto',
          }}
        >
          <span
            className="font-black tabular-nums leading-none"
            style={{
              fontSize: FS,
              color: value !== undefined ? '#fff' : 'rgba(255,255,255,0.2)',
              textShadow: value !== undefined ? `0 0 20px ${arcColor}` : 'none',
              transition: 'text-shadow 0.2s ease',
            }}
          >
            {value !== undefined ? value.toFixed(1) : '—'}
          </span>
          <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.28)', marginTop: 2, letterSpacing: '0.04em' }}>
            tap to type
          </span>
        </button>
      </div>

      {value !== undefined && (
        <button
          onClick={() => onChange(undefined)}
          style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: -2 }}
          className="active:opacity-50"
        >
          Clear rating ✕
        </button>
      )}
    </div>
  )
}
