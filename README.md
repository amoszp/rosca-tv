# RoscaTV 📺

A premium, native-feeling iOS PWA to track movies, series, and anime. Built with Next.js 14, Tailwind CSS, TypeScript, and the TMDB API.

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo> && cd trackr && npm install

# 2. Add your TMDB token
cp .env.local.example .env.local
# Edit .env.local → NEXT_PUBLIC_TMDB_TOKEN=<your token>

# 3. Run dev
npm run dev
```

Get a free TMDB API Read Access Token at: https://www.themoviedb.org/settings/api

---

## Deploy to Vercel (1-click)

1. Push to GitHub
2. Import at vercel.com/new
3. Add env var: `NEXT_PUBLIC_TMDB_TOKEN`
4. Deploy ✅

---

## JSON Import/Export Schema

RoscaTV exports and imports a single JSON object. Here is the **exact schema** the import function expects:

```json
{
  "version": 3,
  "exportedAt": "2025-07-12T00:00:00.000Z",
  "library": {
    "550": {
      "id": 550,
      "mediaType": "movie",
      "type": "movies",
      "title": "Fight Club",
      "year": "1999",
      "poster": "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      "tmdbRating": "8.4",
      "status": "watched",
      "userRating": 9.5,
      "seasonData": {},
      "notes": "Incredible film.",
      "addedAt": 1720000000000,
      "updatedAt": 1720000100000
    },
    "1396": {
      "id": 1396,
      "mediaType": "tv",
      "type": "series",
      "title": "Breaking Bad",
      "year": "2008",
      "poster": "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
      "tmdbRating": "9.5",
      "status": "watching",
      "userRating": 10.0,
      "seasonData": {
        "1": {
          "rating": 9.5,
          "episodes": {
            "1": true,
            "2": true,
            "3": true,
            "4": true,
            "5": true,
            "6": true,
            "7": true
          }
        },
        "2": {
          "rating": 9.0,
          "episodes": {
            "1": true,
            "2": true
          }
        }
      },
      "notes": "Best TV show ever made.",
      "addedAt": 1720000000000,
      "updatedAt": 1720000100000
    }
  }
}
```

### Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `number` | ✅ | TMDB item ID |
| `mediaType` | `"movie" \| "tv"` | ✅ | TMDB media type |
| `type` | `"movies" \| "series" \| "anime"` | ✅ | Which library tab |
| `title` | `string` | ✅ | Display title |
| `year` | `string` | ✅ | Release year e.g. `"2008"` |
| `poster` | `string \| null` | ✅ | TMDB poster path e.g. `/abc.jpg` |
| `tmdbRating` | `string` | ✅ | TMDB score e.g. `"8.4"` |
| `status` | `"pending" \| "watching" \| "watched"` | ✅ | Tracking status |
| `userRating` | `number \| undefined` | — | Personal score 1.0–10.0 |
| `seasonData` | `object` | — | Per-season progress (TV only) |
| `seasonData[N].rating` | `number \| undefined` | — | Season N personal score |
| `seasonData[N].episodes` | `Record<string, boolean>` | — | Episode watched map |
| `notes` | `string` | — | Private notes |
| `addedAt` | `number` | ✅ | Unix ms timestamp |
| `updatedAt` | `number` | — | Unix ms timestamp |

---

## Import Troubleshooting Checklist

If imported items don't appear in your library tabs, follow these steps in order:

- [ ] **Check the JSON structure.** The file must have a top-level `"library"` key containing an object where each value is a valid LibraryItem (see schema above).
- [ ] **Check the `"type"` field.** Must be exactly `"movies"`, `"series"`, or `"anime"` — this determines which tab the item appears in. A typo like `"movie"` or `"tv"` will cause the item to be saved but not shown.
- [ ] **Check the `"id"` field.** Must be a **number**, not a string. Use `550` not `"550"`.
- [ ] **Check the `"status"` field.** Must be one of `"pending"`, `"watching"`, or `"watched"`. Missing or misspelled status will still save but may filter oddly.
- [ ] **Force-refresh after import.** On iOS PWA: swipe up the app from App Switcher and reopen. On browser: hard-reload with Cmd+Shift+R / Ctrl+Shift+R.
- [ ] **Check DevTools > Application > IndexedDB > rosca-db > library.** If items appear there, tap each library tab again — the Zustand store should already have them from `reloadLib()`.
- [ ] **Export first, then import.** Always export your current library before importing to avoid data loss. The import merges by `id` — newer `updatedAt` wins.
- [ ] **Version compatibility.** Files exported from RoscaTV v1/v2 may have `episodes` directly on the item instead of nested under `seasonData`. You can manually fix them using the schema above.

---

## Architecture

```
trackr/
├── app/               # Next.js 14 App Router
│   ├── layout.tsx     # PWA meta, apple-touch-icon, viewport-fit=cover
│   ├── page.tsx       # SSR-safe dynamic import
│   └── globals.css    # CSS custom properties, animations
├── components/
│   ├── App.tsx        # Shell: cream/orange header, tab routing
│   ├── nav/BottomNav  # 5-tab nav: Movies/Series/Anime/Search/Settings
│   ├── library/       # LibraryScreen + MediaCard
│   ├── search/        # SearchScreen + SearchResultItem (instant-add)
│   ├── settings/      # SettingsScreen (export/import)
│   ├── sheets/        # BottomSheet + ArcDial
│   └── ui/            # StatusBadge, Toast
└── lib/
    ├── types.ts       # TypeScript interfaces
    ├── tmdb.ts        # TMDB API helpers
    ├── db.ts          # IndexedDB + localStorage dual-layer
    └── store.ts       # Zustand state
```

---

## License

MIT
