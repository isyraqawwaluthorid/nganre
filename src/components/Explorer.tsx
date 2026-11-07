'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { useAuth, useFavorites } from '@/lib/auth'
import { CATEGORIES, CATEGORY_ORDER } from '@/lib/categories'
import { MAKASSAR_CENTER, PANTAI_LOSARI, distanceMeters } from '@/lib/geo'
import { getOpenStatus, makassarTime, parseOpeningHours, useCurrentTime, type WeeklySchedule } from '@/lib/openingHours'
import type { CategoryId, DataSource, MapFocus, Origin, Place, PlaceResult } from '@/lib/types'
import AccountMenu from './AccountMenu'
import CategoryChips from './CategoryChips'
import PlaceDetail from './PlaceDetail'
import PlaceList from './PlaceList'
import RandomPicker from './RandomPicker'
import SearchBox from './SearchBox'

// Leaflet butuh `window`, jadi peta hanya dirender di browser.
const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-[#f0e9dd]" />,
})

// Tinggi panel bawah di HP. Bagian atas layar disisakan untuk kolom pencarian.
type SheetSnap = 'peek' | 'half' | 'full'
const SHEET_HEIGHT: Record<SheetSnap, string> = {
  peek: '128px',
  half: '55dvh',
  full: 'calc(100dvh - 128px)',
}
function sheetPixels(snap: SheetSnap): number {
  const vh = window.innerHeight
  return snap === 'peek' ? 128 : snap === 'half' ? vh * 0.55 : vh - 128
}

function matches(place: Place, category: CategoryId | null, query: string): boolean {
  if (category && place.category !== category) return false
  if (!query) return true
  const haystack = [place.name, place.address, place.district, CATEGORIES[place.category].label]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

// Simpan tempat yang sedang dibuka di URL (?tempat=...) supaya link-nya bisa dibagikan.
function syncUrl(placeId: string | null) {
  const url = new URL(window.location.href)
  if (placeId) url.searchParams.set('tempat', placeId)
  else url.searchParams.delete('tempat')
  window.history.replaceState(null, '', url)
}

type Props = {
  places: Place[]
  source: DataSource
}

export default function Explorer({ places, source }: Props) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryId | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [origin, setOrigin] = useState<Origin | null>(null)
  const [openNowOnly, setOpenNowOnly] = useState(false)
  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [focus, setFocus] = useState<MapFocus | null>(null)
  const [sheet, setSheet] = useState<SheetSnap>('peek')
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const drag = useRef<{ startY: number; startHeight: number; moved: boolean } | null>(null)
  const sheetRef = useRef<HTMLElement>(null)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const auth = useAuth()
  const favorites = useFavorites(auth.user)
  const showOnlyFavorites = favoritesOnly && !!auth.user

  const normalizedQuery = query.trim().toLowerCase()
  const now = useCurrentTime()

  const schedules = useMemo(() => {
    const byId = new Map<string, WeeklySchedule>()
    for (const place of places) {
      const schedule = place.openingHours ? parseOpeningHours(place.openingHours) : null
      if (schedule) byId.set(place.id, schedule)
    }
    return byId
  }, [places])

  const statusOf = useCallback(
    (place: Place) => {
      const schedule = schedules.get(place.id)
      return schedule && now != null ? getOpenStatus(schedule, now) : null
    },
    [schedules, now],
  )

  const passes = useCallback(
    (place: Place, cat: CategoryId | null) =>
      matches(place, cat, normalizedQuery) &&
      (!openNowOnly || statusOf(place)?.open === true) &&
      (!showOnlyFavorites || favorites.ids.has(place.id)),
    [normalizedQuery, openNowOnly, statusOf, showOnlyFavorites, favorites.ids],
  )

  const results = useMemo<PlaceResult[]>(() => {
    const list = places
      .filter((place) => passes(place, category))
      .map((place) => ({
        place,
        distance: origin ? distanceMeters(origin, place) : null,
        status: statusOf(place),
      }))

    if (origin) return list.sort((a, b) => a.distance! - b.distance!)
    return list.sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a.place.category) - CATEGORY_ORDER.indexOf(b.place.category) ||
        a.place.name.localeCompare(b.place.name, 'id'),
    )
  }, [places, category, origin, passes, statusOf])

  const visiblePlaces = useMemo(() => results.map((r) => r.place), [results])

  const counts = useMemo(() => {
    const byCategory: Partial<Record<CategoryId, number>> = {}
    for (const place of places) {
      if (passes(place, null)) byCategory[place.category] = (byCategory[place.category] ?? 0) + 1
    }
    return byCategory
  }, [places, passes])

  const selected = useMemo(() => places.find((p) => p.id === selectedId) ?? null, [places, selectedId])

  const nearby = useMemo<PlaceResult[]>(() => {
    if (!selected) return []
    return places
      .filter((p) => p.category === selected.category && p.name !== selected.name)
      .map((place) => ({ place, distance: distanceMeters(selected, place) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
  }, [places, selected])

  const selectPlace = useCallback(
    (id: string) => {
      const place = places.find((p) => p.id === id)
      if (!place) return
      setSelectedId(id)
      setSheet((current) => (current === 'peek' ? 'half' : current))
      setFocus({ center: place, zoom: 16 })
      syncUrl(id)
    },
    [places],
  )

  const closeDetail = useCallback(() => {
    setSelectedId(null)
    syncUrl(null)
  }, [])

  const resetSearch = useCallback(() => {
    setQuery('')
    setCategory(null)
    setOpenNowOnly(false)
    setFavoritesOnly(false)
  }, [])

  const showToast = useCallback((message: string) => {
    window.clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = window.setTimeout(() => setToast(null), 2500)
  }, [])

  // Nganre wajib login (lihat src/proxy.ts). Kalau sesi habis saat aplikasi terbuka, arahkan ke /masuk.
  const router = useRouter()
  const goToLogin = useCallback(() => {
    const here = window.location.pathname + window.location.search
    router.push(`/masuk?next=${encodeURIComponent(here)}`)
  }, [router])

  const toggleFavorite = useCallback(
    async (placeId: string) => {
      if (!auth.user) {
        goToLogin()
        return
      }
      const { ok, favorite } = await favorites.toggle(placeId)
      if (!ok) showToast('Gagal menyimpan favorit, coba lagi.')
      else showToast(favorite ? 'Disimpan ke favorit ❤️' : 'Dihapus dari favorit')
    },
    [auth.user, favorites, showToast, goToLogin],
  )

  // Begitu peta siap, buka tempat dari link yang dibagikan (misalnya /?tempat=osm-node-123).
  const openSharedPlace = useCallback(() => {
    const sharedId = new URLSearchParams(window.location.search).get('tempat')
    if (sharedId) selectPlace(sharedId)
  }, [selectPlace])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDetail()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeDetail])

  function changeQuery(next: string) {
    setQuery(next)
    if (selectedId) closeDetail()
  }

  function changeCategory(next: CategoryId | null) {
    setCategory(next)
    if (selectedId) closeDetail()
    const visible = places.filter((p) => passes(p, next))
    if (visible.length > 0) setFocus({ bounds: visible.map((p) => [p.lat, p.lng]) })
  }

  function toggleFavoritesOnly() {
    const next = !favoritesOnly
    setFavoritesOnly(next)
    if (selectedId) closeDetail()
    if (!next) return
    const saved = places.filter((p) => favorites.ids.has(p.id))
    if (saved.length > 0) setFocus({ bounds: saved.map((p) => [p.lat, p.lng]) })
  }

  function showFavorites() {
    setCategory(null)
    if (!favoritesOnly) toggleFavoritesOnly()
  }

  async function logout() {
    await auth.signOut()
    window.location.replace('/masuk')
  }

  function toggleOpenNow() {
    const next = !openNowOnly
    setOpenNowOnly(next)
    if (selectedId) closeDetail()
    if (!next) return
    const open = places.filter((p) => matches(p, category, normalizedQuery) && statusOf(p)?.open)
    if (open.length > 0) setFocus({ bounds: open.map((p) => [p.lat, p.lng]) })
  }

  function applyOrigin(next: Origin, message: string | null) {
    setOrigin(next)
    setNotice(message)
    if (selectedId) closeDetail()
    setSheet((current) => (current === 'peek' ? 'half' : current))
    setFocus({ center: next, zoom: 15 })
  }

  function toggleNearMe() {
    if (origin) {
      setOrigin(null)
      setNotice(null)
      return
    }
    if (!('geolocation' in navigator)) {
      applyOrigin(PANTAI_LOSARI, 'Browser kamu tidak mendukung deteksi lokasi, jadi jarak dihitung dari Pantai Losari.')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false)
        const here: Origin = { lat: coords.latitude, lng: coords.longitude, label: 'lokasi kamu' }
        if (distanceMeters(here, MAKASSAR_CENTER) > 30_000) {
          applyOrigin(PANTAI_LOSARI, 'Kamu sepertinya sedang di luar Makassar, jadi jarak dihitung dari Pantai Losari.')
        } else {
          applyOrigin(here, null)
        }
      },
      (error) => {
        setLocating(false)
        const reason = error.code === error.PERMISSION_DENIED ? 'Izin lokasi ditolak' : 'Lokasi tidak terdeteksi'
        applyOrigin(PANTAI_LOSARI, `${reason}, jadi jarak dihitung dari Pantai Losari.`)
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }

  // ---------- Panel bawah yang bisa ditarik (khusus HP) ----------

  function toggleSheet() {
    setSheet((current) => (current === 'peek' ? 'half' : 'peek'))
  }

  function onSheetPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (window.matchMedia('(min-width: 768px)').matches) return
    if ((e.target as HTMLElement).closest('button:not([data-sheet-handle])')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { startY: e.clientY, startHeight: sheetRef.current!.offsetHeight, moved: false }
  }

  function onSheetPointerMove(e: PointerEvent<HTMLDivElement>) {
    const state = drag.current
    if (!state) return
    const dy = e.clientY - state.startY
    if (Math.abs(dy) > 5) state.moved = true
    if (state.moved) setDragHeight(Math.min(Math.max(state.startHeight - dy, 96), window.innerHeight - 96))
  }

  function onSheetPointerUp(e: PointerEvent<HTMLDivElement>) {
    const state = drag.current
    drag.current = null
    if (!state) return
    if (!state.moved) {
      toggleSheet()
      return
    }
    // Lepas jari → menempel ke posisi terdekat (kecil, setengah, atau penuh).
    const height = state.startHeight - (e.clientY - state.startY)
    const snaps: SheetSnap[] = ['peek', 'half', 'full']
    const nearest = snaps.reduce((best, snap) =>
      Math.abs(sheetPixels(snap) - height) < Math.abs(sheetPixels(best) - height) ? snap : best,
    )
    setSheet(nearest)
    setDragHeight(null)
  }

  const sheetStyle = { '--sheet-h': dragHeight != null ? `${dragHeight}px` : SHEET_HEIGHT[sheet] } as CSSProperties

  // Tombol akun baru tampil setelah status login diketahui, supaya tidak berkedip "Masuk" → avatar.
  const accountMenu =
    auth.enabled && auth.ready ? (
      <AccountMenu
        user={auth.user}
        favoriteCount={favorites.ids.size}
        onLogin={goToLogin}
        onShowFavorites={showFavorites}
        onLogout={logout}
      />
    ) : null

  return (
    <div className="relative h-dvh overflow-hidden md:grid md:grid-cols-[420px_1fr] md:grid-rows-[auto_minmax(0,1fr)]">
      {/* HP: mengambang di atas peta. Desktop: bagian atas sidebar. */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[1100] p-3 md:pointer-events-auto md:static md:z-auto md:border-r md:border-line md:px-5 md:pt-6 md:pb-3">
        <div className="mb-5 hidden items-center gap-3 md:flex">
          <span
            aria-hidden
            className="grid size-12 -rotate-6 place-items-center rounded-2xl bg-accent text-2xl shadow-[0_8px_20px_-6px] shadow-accent/60 transition-transform duration-300 hover:rotate-6"
          >
            🍲
          </span>
          <div>
            <h1 className="text-2xl leading-none font-extrabold tracking-tight">Nganre</h1>
            <p className="mt-1 text-sm text-muted">Peta kuliner Makassar</p>
          </div>
          <div className="ml-auto">{accountMenu}</div>
        </div>
        <div className="pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <SearchBox value={query} onChange={changeQuery} />
            </div>
            <div className="md:hidden">{accountMenu}</div>
          </div>
          <CategoryChips
            active={category}
            counts={counts}
            onChange={changeCategory}
            favorites={
              auth.user
                ? { count: favorites.ids.size, active: favoritesOnly, onToggle: toggleFavoritesOnly }
                : undefined
            }
          />
        </div>
      </header>

      <main className="absolute inset-0 md:relative md:col-start-2 md:row-span-2 md:row-start-1">
        <MapView
          places={visiblePlaces}
          selectedId={selectedId}
          hoveredId={hoveredId}
          origin={origin}
          focus={focus}
          onSelect={selectPlace}
          onReady={openSharedPlace}
        />
        <RandomPicker pool={visiblePlaces} onPreview={setHoveredId} onPick={selectPlace} />
      </main>

      {/* HP: panel yang bisa ditarik dari bawah. Desktop: isi sidebar. */}
      <section
        ref={sheetRef}
        aria-label="Daftar tempat makan"
        style={sheetStyle}
        className={`absolute inset-x-0 bottom-0 z-[1100] flex h-(--sheet-h) flex-col rounded-t-[28px] bg-cream shadow-[0_-10px_40px_-8px_rgba(0,0,0,0.25)] md:static md:z-auto md:col-start-1 md:row-start-2 md:h-auto md:rounded-none md:border-r md:border-line md:shadow-none ${
          dragHeight == null ? 'transition-[height] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]' : ''
        }`}
      >
        <div
          onPointerDown={onSheetPointerDown}
          onPointerMove={onSheetPointerMove}
          onPointerUp={onSheetPointerUp}
          onPointerCancel={onSheetPointerUp}
          className="touch-none select-none md:touch-auto md:select-auto"
        >
          <button
            type="button"
            data-sheet-handle
            onClick={(e) => e.detail === 0 && toggleSheet()}
            aria-expanded={sheet !== 'peek'}
            aria-label={sheet === 'peek' ? 'Buka daftar tempat' : 'Kecilkan panel'}
            className="flex w-full cursor-grab justify-center pt-3 pb-1 active:cursor-grabbing md:hidden"
          >
            <span className="h-1.5 w-11 rounded-full bg-ink/15" />
          </button>

          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 md:pt-3">
            <p className="text-sm">
              <span key={results.length} className="inline-block animate-pop-in font-extrabold tabular-nums">
                {results.length}
              </span>{' '}
              tempat
              {origin && <span className="hidden text-muted md:inline"> · terdekat dulu</span>}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleOpenNow}
                disabled={now == null}
                aria-pressed={openNowOnly}
                title="Tampilkan yang sedang buka saja"
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-all active:scale-95 disabled:opacity-60 ${
                  openNowOnly
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-[0_6px_16px_-6px] shadow-emerald-600'
                    : 'border-line bg-paper hover:-translate-y-0.5 hover:border-ink/30'
                }`}
              >
                <span aria-hidden>🕒</span>
                <span className="md:hidden">Buka</span>
                <span className="hidden md:inline">Buka sekarang</span>
              </button>
              <button
                type="button"
                onClick={toggleNearMe}
                disabled={locating}
                aria-pressed={!!origin}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all active:scale-95 disabled:opacity-60 ${
                  origin
                    ? 'border-blue-600 bg-blue-600 text-white shadow-[0_6px_16px_-6px] shadow-blue-600'
                    : 'border-line bg-paper hover:-translate-y-0.5 hover:border-ink/30'
                }`}
              >
                <span aria-hidden className={locating ? 'animate-spin' : ''}>
                  {locating ? '◌' : '📍'}
                </span>
                {locating ? 'Mencari lokasi…' : origin ? 'Dekat saya ✕' : 'Dekat saya'}
              </button>
            </div>
          </div>
        </div>

        {notice && (
          <p className="animate-fade-up border-b border-line bg-blue-50 px-5 py-2 text-xs text-blue-900">{notice}</p>
        )}
        {openNowOnly && (
          <p className="animate-fade-up border-b border-line bg-emerald-50 px-5 py-2 text-xs text-emerald-900">
            Jam buka baru tercatat untuk {schedules.size} dari {places.length} tempat, jadi tempat lain yang mungkin
            sedang buka belum ikut tampil.
          </p>
        )}

        {/* Daftar tetap di-mount saat detail dibuka supaya posisi scroll tidak hilang. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" hidden={!!selected}>
          <PlaceList
            results={results}
            favoriteIds={favorites.ids}
            onSelect={selectPlace}
            onHover={setHoveredId}
            onReset={resetSearch}
          />
        </div>
        {selected && (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <PlaceDetail
              key={selected.id}
              place={selected}
              origin={origin}
              distance={origin ? distanceMeters(origin, selected) : null}
              schedule={schedules.get(selected.id) ?? null}
              status={statusOf(selected)}
              today={now != null ? makassarTime(now).day : null}
              nearby={nearby}
              isFavorite={favorites.ids.has(selected.id)}
              onToggleFavorite={auth.enabled ? () => toggleFavorite(selected.id) : undefined}
              onBack={closeDetail}
              onSelect={selectPlace}
            />
          </div>
        )}

        <footer className="border-t border-line px-5 py-2 text-[11px] text-muted">
          <span className="font-bold text-ink">Nganre</span> · Data ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
            OpenStreetMap contributors
          </a>{' '}
          · {source === 'supabase' ? 'via Supabase' : 'data lokal'}
        </footer>
      </section>

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[1300] -translate-x-1/2 animate-pop-in rounded-full bg-ink px-5 py-3 text-sm font-semibold whitespace-nowrap text-paper shadow-2xl md:left-[calc(50%+210px)]"
        >
          {toast}
        </div>
      )}
    </div>
  )
}
