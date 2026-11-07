import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { CATEGORIES } from '@/lib/categories'
import type { Place } from '@/lib/types'

type Props = {
  pool: Place[]
  onPreview: (id: string | null) => void
  onPick: (id: string) => void
}

type Spin = { place: Place; step: number; done: boolean }

const STEPS = 14
const BURST = Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2)

export default function RandomPicker({ pool, onPreview, onPick }: Props) {
  const [spin, setSpin] = useState<Spin | null>(null)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function start() {
    if (spin || pool.length === 0) return
    const randomPlace = () => pool[Math.floor(Math.random() * pool.length)]
    const winner = randomPlace()
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const steps = reduceMotion ? 1 : STEPS
    const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))

    // Nama berganti cepat di awal lalu makin pelan, seperti mesin slot.
    let elapsed = 0
    for (let step = 0; step < steps; step++) {
      elapsed += 45 + step * step * 1.2
      const place = step === steps - 1 ? winner : randomPlace()
      later(elapsed, () => {
        setSpin({ place, step, done: false })
        onPreview(place.id)
      })
    }
    later(elapsed + 160, () => {
      setSpin({ place: winner, step: steps, done: true })
      onPreview(null)
    })
    later(elapsed + 1300, () => {
      setSpin(null)
      onPick(winner.id)
    })

    setSpin({ place: randomPlace(), step: -1, done: false })
  }

  const category = spin ? CATEGORIES[spin.place.category] : null

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={!!spin || pool.length === 0}
        className="group absolute right-3 bottom-[156px] z-[1000] flex items-center gap-2 rounded-full bg-ink py-2.5 pr-4 pl-3 text-sm font-bold text-paper shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.5)] active:scale-95 disabled:opacity-60 md:top-5 md:right-5 md:bottom-auto"
      >
        <span aria-hidden className="text-lg transition-transform duration-500 group-hover:rotate-[360deg]">
          🎲
        </span>
        Bingung makan apa?
      </button>

      {spin && category && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute inset-0 z-[1050] grid place-items-center bg-ink/15"
        >
          <div className="relative w-[min(320px,85vw)] animate-pop-in rounded-3xl bg-paper p-6 text-center shadow-2xl">
            <p className="text-xs font-bold tracking-[0.2em] text-muted uppercase">
              {spin.done ? 'Hari ini makan di…' : 'Mengacak…'}
            </p>

            <div key={spin.step} className={spin.done ? 'animate-pop-in' : 'animate-slot'}>
              <div
                className="relative mx-auto mt-4 grid size-20 place-items-center rounded-3xl text-4xl shadow-md"
                style={{ background: category.color }}
              >
                {category.emoji}
                {spin.done &&
                  BURST.map((angle) => (
                    <span
                      key={angle}
                      aria-hidden
                      className="absolute animate-burst text-xl"
                      style={{ '--dx': `${Math.cos(angle) * 90}px`, '--dy': `${Math.sin(angle) * 90}px` } as CSSProperties}
                    >
                      {category.emoji}
                    </span>
                  ))}
              </div>
              <p className="mt-4 truncate text-lg font-extrabold">{spin.place.name}</p>
              <p className="truncate text-sm text-muted">
                {category.label}
                {spin.place.district && ` · ${spin.place.district}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
