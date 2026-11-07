import { memo } from 'react'
import { CATEGORIES } from '@/lib/categories'
import { formatDistance } from '@/lib/geo'
import type { PlaceResult } from '@/lib/types'

type Props = {
  results: PlaceResult[]
  favoriteIds: ReadonlySet<string>
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  onReset: () => void
}

function PlaceList({ results, favoriteIds, onSelect, onHover, onReset }: Props) {
  if (results.length === 0) {
    return (
      <div className="animate-fade-up px-5 py-12 text-center">
        <p className="animate-float text-5xl">🍽️</p>
        <p className="mt-4 font-bold">Belum ketemu tempat yang cocok</p>
        <p className="mt-1 text-sm text-muted">Coba kata kunci lain atau lihat semua kategori.</p>
        <button
          type="button"
          onClick={onReset}
          className="mt-5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:-translate-y-0.5 active:scale-95"
        >
          Reset pencarian
        </button>
      </div>
    )
  }

  return (
    <ul className="space-y-0.5 p-2" onMouseLeave={() => onHover(null)}>
      {results.map(({ place, distance, status }, index) => {
        const category = CATEGORIES[place.category]
        const location = [place.address, place.district].filter(Boolean).join(', ')
        return (
          <li
            key={place.id}
            className="animate-fade-up"
            style={{ animationDelay: `${Math.min(index, 14) * 28}ms` }}
          >
            <button
              type="button"
              onClick={() => onSelect(place.id)}
              onMouseEnter={() => onHover(place.id)}
              onFocus={() => onHover(place.id)}
              className="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-200 hover:bg-paper hover:shadow-[0_4px_16px_-8px_rgba(28,25,23,0.25)] focus-visible:bg-paper focus-visible:outline-none"
            >
              <span
                aria-hidden
                className="grid size-12 shrink-0 place-items-center rounded-2xl text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                style={{ background: `${category.color}1f` }}
              >
                {category.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">
                  {favoriteIds.has(place.id) && (
                    <span role="img" aria-label="Favorit" className="mr-1">
                      ❤️
                    </span>
                  )}
                  {place.name}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                  <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: category.color }} />
                  <span className="truncate">
                    {status && (
                      <span className={`font-bold ${status.open ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {status.open ? 'Buka' : 'Tutup'} ·{' '}
                      </span>
                    )}
                    {category.label}
                    {location && ` · ${location}`}
                  </span>
                </span>
              </span>
              {distance != null ? (
                <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 tabular-nums">
                  {formatDistance(distance)}
                </span>
              ) : (
                <span
                  aria-hidden
                  className="shrink-0 -translate-x-1 text-muted opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                >
                  →
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default memo(PlaceList)
