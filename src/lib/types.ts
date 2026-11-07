export type CategoryId =
  | 'coto'
  | 'konro'
  | 'pallubasa'
  | 'sop-saudara'
  | 'mie'
  | 'seafood'
  | 'jajanan'
  | 'khas-daerah'
  | 'warkop'

export type Place = {
  id: string
  name: string
  category: CategoryId
  lat: number
  lng: number
  address: string | null
  district: string | null
  openingHours: string | null
  openingHoursSource: string | null
  openingHoursUrl: string | null
  osmUrl: string
}

export type LatLng = { lat: number; lng: number }

export type Origin = LatLng & { label: string }

export type DataSource = 'supabase' | 'seed'

export type OpenStatus = { open: boolean; label: string }

export type PlaceResult = { place: Place; distance: number | null; status?: OpenStatus | null }

// Perintah untuk menggerakkan peta: ke sekumpulan titik, atau ke satu titik.
export type MapFocus = { bounds: [number, number][] } | { center: LatLng; zoom: number }
