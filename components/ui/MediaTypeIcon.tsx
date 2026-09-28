import type { LibraryType } from '@/lib/types'

/* Shared SVG type glyphs — replaces the 🎬📺⛩️ emoji fallbacks that were
   duplicated (inconsistently) across MediaCard, SearchResultItem and
   BottomSheet. Line style matches BottomNav's icon set for visual consistency. */
interface Props { type: LibraryType | 'movies' | 'series' | 'anime'; size?: number; color?: string }

export default function MediaTypeIcon({ type, size = 20, color = 'currentColor' }: Props) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (type === 'movies') return (
    <svg {...common}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M7 4v16M17 4v16M2 9h5M17 9h5M2 15h5M17 15h5" /></svg>
  )
  if (type === 'anime') return (
    <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><circle cx="9" cy="10" r="1" fill={color} stroke="none" /><circle cx="15" cy="10" r="1" fill={color} stroke="none" /></svg>
  )
  return (
    <svg {...common}><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
  )
}
