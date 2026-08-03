import type { LibraryItem, SortKey } from './types'

// null status sorts last (after watched)
const STATUS_ORDER: Record<string, number> = { watching: 0, pending: 1, watched: 2 }

function combinedNum(item: LibraryItem): number {
  const tmdb = parseFloat(item.tmdbRating || '0')
  if (isNaN(tmdb)) return 0
  if (item.imdbRating) {
    const imdb = parseFloat(item.imdbRating)
    if (!isNaN(imdb) && imdb > 0) return (tmdb + imdb) / 2
  }
  return tmdb
}

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'status',        label: 'Status Priority'          },
  { key: 'myRating-desc', label: 'My Rating: Highest first' },
  { key: 'myRating-asc',  label: 'My Rating: Lowest first'  },
  { key: 'score-desc',    label: 'Online Score: Highest'    },
  { key: 'score-asc',     label: 'Online Score: Lowest'     },
  { key: 'title-asc',     label: 'Title: A → Z'             },
  { key: 'title-desc',    label: 'Title: Z → A'             },
  { key: 'added-desc',    label: 'Recently Added'           },
]

export function sortItems(items: LibraryItem[], key: SortKey): LibraryItem[] {
  return [...items].sort((a, b) => {
    switch (key) {
      case 'status': {
        // null status = 3 (after watched=2)
        const sa = a.status != null ? (STATUS_ORDER[a.status] ?? 2) : 3
        const sb = b.status != null ? (STATUS_ORDER[b.status] ?? 2) : 3
        if (sa !== sb) return sa - sb
        return (b.updatedAt || b.addedAt) - (a.updatedAt || a.addedAt)
      }
      case 'myRating-desc': {
        const ra = a.userRating ?? -1; const rb = b.userRating ?? -1
        return rb !== ra ? rb - ra : (b.updatedAt || b.addedAt) - (a.updatedAt || a.addedAt)
      }
      case 'myRating-asc': {
        const ra = a.userRating ?? 999; const rb = b.userRating ?? 999
        return ra !== rb ? ra - rb : (b.updatedAt || b.addedAt) - (a.updatedAt || a.addedAt)
      }
      case 'score-desc': return combinedNum(b) - combinedNum(a)
      case 'score-asc':  return combinedNum(a) - combinedNum(b)
      case 'title-asc':  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
      case 'title-desc': return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' })
      case 'added-desc':
      default:           return (b.updatedAt || b.addedAt) - (a.updatedAt || a.addedAt)
    }
  })
}
