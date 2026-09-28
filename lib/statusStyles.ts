import type { Status } from './types'

/* Single source of truth for status colours — Aurora Noir palette.
   Consumed by StatusBadge, MediaCard, SearchResultItem and BottomSheet
   so all four always match. */
export interface StatusStyle { bg: string; text: string; dot: string; border: string; label: string }

export const STATUS_STYLES: Record<Status, StatusStyle> = {
  pending: {
    bg:     'rgba(245,158,11,0.18)',
    text:   '#FBBF60',
    dot:    '#F59E0B',
    border: 'rgba(245,158,11,0.32)',
    label:  'Pending',
  },
  watching: {
    bg:     'rgba(45,212,191,0.16)',
    text:   '#5EEAD4',
    dot:    '#2DD4BF',
    border: 'rgba(45,212,191,0.32)',
    label:  'Watching',
  },
  watched: {
    bg:     'rgba(129,140,248,0.20)',
    text:   '#A5B4FC',
    dot:    '#818CF8',
    border: 'rgba(129,140,248,0.32)',
    label:  'Watched',
  },
}
