import { useState, type ReactNode } from 'react'
import { CATEGORIES } from '@/lib/categories'
import { formatDistance } from '@/lib/geo'
import { describeSchedule, type WeeklySchedule } from '@/lib/openingHours'
import type { OpenStatus, Origin, Place, PlaceResult } from '@/lib/types'

type Props = {
  place: Place
  origin: Origin | null
  distance: number | null
  schedule: WeeklySchedule | null
  status: OpenStatus | null
  today: number | null
  nearby: PlaceResult[]
  isFavorite: boolean
  // Tidak ada kalau Supabase belum dikonfigurasi, sehingga tombol favorit disembunyikan.
  onToggleFavorite?: () => void
  onBack: () => void
  onSelect: (id: string) => void
}

export default function PlaceDetail({
  place,
  origin,
  distance,
  schedule,
  status,
  today,
  nearby,
  isFavorite,
  onToggleFavorite,
  onBack,
  onSelect,
}: Props) {
  const [copied, setCopied] = useState(false)
  const category = CATEGORIES[place.category]
  const address = [place.address, place.district].filter(Boolean).join(', ')
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`

  async function share() {
    const url = `${window.location.origin}${window.location.pathname}?tempat=${encodeURIComponent(place.id)}`
    if (navigator.share) {
      try {
        await navigator.share({ title: place.name, text: `${place.name} di Nganre, peta kuliner Makassar`, url })
      } catch {
        // dibatalkan oleh pengguna
      }
      return
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <article className="animate-slide-up">
      <header
        className="relative overflow-hidden px-5 pt-4 pb-6 text-white"
        style={{ background: `linear-gradient(135deg, ${category.color}, color-mix(in srgb, ${category.color} 55%, black))` }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 -bottom-10 rotate-12 text-[140px] leading-none opacity-20 select-none"
        >
          {category.emoji}
        </span>

        <div className="relative flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            aria-label="Kembali ke daftar"
            className="grid size-9 place-items-center rounded-full bg-white/20 text-lg backdrop-blur transition hover:bg-white/30 active:scale-90"
          >
            ←
          </button>
          <div className="flex items-center gap-2">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={onToggleFavorite}
                aria-pressed={isFavorite}
                aria-label={isFavorite ? 'Hapus dari favorit' : 'Simpan ke favorit'}
                className="grid size-9 place-items-center rounded-full bg-white/20 backdrop-blur transition hover:bg-white/30 active:scale-90"
              >
                <span key={String(isFavorite)} aria-hidden className={isFavorite ? 'animate-pop-in' : ''}>
                  {isFavorite ? '❤️' : '🤍'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={share}
              className="rounded-full bg-white/20 px-3.5 py-1.5 text-sm font-semibold backdrop-blur transition hover:bg-white/30 active:scale-95"
            >
              {copied ? '✓ Link disalin' : '↗ Bagikan'}
            </button>
          </div>
        </div>

        <div className="relative mt-5 flex items-end gap-4">
          <span
            aria-hidden
            className="grid size-16 shrink-0 animate-float place-items-center rounded-2xl bg-white/95 text-4xl shadow-lg"
          >
            {category.emoji}
          </span>
          <div className="min-w-0 pb-0.5">
            <p className="text-xs font-bold tracking-[0.15em] text-white/80 uppercase">{category.label}</p>
            <h2 className="mt-0.5 text-2xl leading-tight font-extrabold text-balance">{place.name}</h2>
          </div>
        </div>
        {(status || (distance != null && origin)) && (
          <div className="relative mt-4 flex flex-wrap gap-2 text-sm font-semibold">
            {status && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-ink">
                <span
                  aria-hidden
                  className={`size-2 rounded-full ${status.open ? 'animate-pulse bg-emerald-500' : 'bg-rose-500'}`}
                />
                {status.open ? 'Buka sekarang' : 'Sedang tutup'}
              </span>
            )}
            {distance != null && origin && (
              <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">
                📍 {formatDistance(distance)} dari {origin.label}
              </span>
            )}
          </div>
        )}
      </header>

      <div className="px-5 py-5">
        <p className="text-sm leading-relaxed text-muted">{category.description}</p>

        <dl className="mt-5 divide-y divide-line rounded-2xl border border-line bg-paper text-sm">
          <InfoRow icon="📍" label="Alamat">
            {address || <Missing />}
          </InfoRow>
          <InfoRow icon="🕒" label="Jam buka">
            <OpeningHours place={place} schedule={schedule} status={status} today={today} />
          </InfoRow>
        </dl>

        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3.5 text-sm font-bold text-paper shadow-[0_8px_20px_-8px_rgba(0,0,0,0.5)] transition hover:-translate-y-0.5 active:scale-[0.98]"
          >
            🧭 Rute ke sini
          </a>
          <a
            href={place.osmUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center rounded-2xl border border-line bg-paper px-4 py-3.5 text-sm font-semibold transition hover:border-ink/30"
          >
            OSM ↗
          </a>
        </div>

        {nearby.length > 0 && (
          <section className="mt-7">
            <h3 className="text-sm font-bold">{category.label} lain di dekatnya</h3>
            <ul className="mt-2 space-y-1.5">
              {nearby.map(({ place: other, distance: d }, index) => (
                <li key={other.id} className="animate-fade-up" style={{ animationDelay: `${150 + index * 60}ms` }}>
                  <button
                    type="button"
                    onClick={() => onSelect(other.id)}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-paper px-3 py-2.5 text-left text-sm transition hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-sm"
                  >
                    <span
                      aria-hidden
                      className="grid size-9 shrink-0 place-items-center rounded-xl text-lg"
                      style={{ background: `${category.color}1f` }}
                    >
                      {category.emoji}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{other.name}</span>
                    {d != null && <span className="shrink-0 text-xs font-bold text-muted tabular-nums">{formatDistance(d)}</span>}
                    <span aria-hidden className="text-muted transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  )
}

type OpeningHoursProps = {
  place: Place
  schedule: WeeklySchedule | null
  status: OpenStatus | null
  today: number | null
}

function OpeningHours({ place, schedule, status, today }: OpeningHoursProps) {
  if (!place.openingHours) {
    // Data jam buka diambil dari OpenStreetMap, jadi siapa pun bisa melengkapinya di sana.
    const editUrl = place.osmUrl.replace(/\/(node|way|relation)\/(\d+)$/, '/edit?$1=$2')
    return (
      <>
        <Missing />
        <a
          href={editUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block text-xs font-semibold text-accent hover:underline"
        >
          Tahu jam bukanya? Bantu lengkapi di OpenStreetMap ↗
        </a>
      </>
    )
  }

  const sourceUrl = place.openingHoursUrl ?? place.osmUrl
  return (
    <>
      {status && (
        <p className={`flex items-center gap-1.5 font-bold ${status.open ? 'text-emerald-700' : 'text-rose-700'}`}>
          <span aria-hidden className={`size-2 rounded-full ${status.open ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          {status.label}
        </p>
      )}
      {schedule ? (
        <ul className="mt-2 space-y-1">
          {describeSchedule(schedule).map((row) => {
            const isToday = today != null && row.includes.includes(today)
            return (
              <li
                key={row.days}
                className={`flex justify-between gap-4 ${isToday ? 'font-bold text-ink' : 'font-normal text-muted'}`}
              >
                <span>
                  {row.days}
                  {isToday && row.includes.length > 1 && <span className="font-normal text-muted"> (hari ini)</span>}
                </span>
                <span className="tabular-nums">{row.hours}</span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-1">{place.openingHours}</p>
      )}
      <p className="mt-2 text-xs font-normal text-muted">
        Sumber:{' '}
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">
          {place.openingHoursSource ?? 'OpenStreetMap'}
        </a>
        . Jam bisa berubah, sebaiknya cek lagi sebelum datang.
      </p>
    </>
  )
}

function InfoRow({ icon, label, children }: { icon: string; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 p-4">
      <span aria-hidden className="text-base">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-semibold text-muted">{label}</dt>
        <dd className="mt-0.5 font-medium">{children}</dd>
      </div>
    </div>
  )
}

function Missing() {
  return <span className="font-normal text-muted italic">Belum tercatat</span>
}
