import { useEffect, useRef } from 'react'
import { CATEGORIES, CATEGORY_ORDER } from '@/lib/categories'
import type { CategoryId } from '@/lib/types'

type Props = {
  active: CategoryId | null
  counts: Partial<Record<CategoryId, number>>
  onChange: (category: CategoryId | null) => void
  // Hanya ada kalau user sudah login.
  favorites?: { count: number; active: boolean; onToggle: () => void }
}

export default function CategoryChips({ active, counts, onChange, favorites }: Props) {
  const rowRef = useRef<HTMLDivElement>(null)
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0)

  // Di desktop, scroll mouse ke bawah menggeser baris chip ke samping.
  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || row.scrollWidth <= row.clientWidth) return
      row.scrollLeft += e.deltaY
      e.preventDefault()
    }
    row.addEventListener('wheel', onWheel, { passive: false })
    return () => row.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    rowRef.current
      ?.querySelector('[aria-pressed="true"]')
      ?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [active])

  return (
    <div
      ref={rowRef}
      className="-mx-3 mt-2.5 flex gap-2 overflow-x-auto scroll-smooth px-3 pt-0.5 pb-1.5 [scrollbar-width:none] [mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-28px),transparent)] md:-mx-5 md:mt-3 md:px-5"
    >
      {favorites && (
        <Chip
          label="Favorit"
          emoji="❤️"
          color="#e11d48"
          count={favorites.count}
          active={favorites.active}
          onClick={favorites.onToggle}
        />
      )}
      <Chip label="Semua" emoji="✨" count={total} active={active === null} onClick={() => onChange(null)} />
      {CATEGORY_ORDER.map((id) => (
        <Chip
          key={id}
          label={CATEGORIES[id].label}
          emoji={CATEGORIES[id].emoji}
          color={CATEGORIES[id].color}
          count={counts[id] ?? 0}
          active={active === id}
          onClick={() => onChange(active === id ? null : id)}
        />
      ))}
    </div>
  )
}

type ChipProps = {
  label: string
  emoji: string
  color?: string
  count: number
  active: boolean
  onClick: () => void
}

function Chip({ label, emoji, color = '#1c1917', count, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={count === 0 && !active}
      style={active ? { background: color, borderColor: color, boxShadow: `0 6px 16px -6px ${color}` } : undefined}
      className={`group flex shrink-0 items-center gap-1.5 rounded-full border py-1.5 pr-3 pl-2 text-sm font-semibold whitespace-nowrap shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-40 ${
        active ? 'text-white' : 'border-line bg-paper text-ink hover:-translate-y-0.5 hover:border-ink/30'
      }`}
    >
      <span
        aria-hidden
        className={`grid size-6 place-items-center rounded-full text-sm transition-transform group-hover:scale-110 ${
          active ? 'bg-white/25' : 'bg-cream'
        }`}
      >
        {emoji}
      </span>
      {label}
      <span className={`text-xs font-medium tabular-nums ${active ? 'text-white/75' : 'text-muted'}`}>{count}</span>
    </button>
  )
}
