import type { LatLng, Origin } from './types'

export const MAKASSAR_CENTER: LatLng = { lat: -5.1477, lng: 119.4327 }

export const PANTAI_LOSARI: Origin = { lat: -5.1437, lng: 119.4071, label: 'Pantai Losari' }

// Jarak garis lurus antara dua titik di permukaan bumi (rumus haversine), dalam meter.
export function distanceMeters(a: LatLng, b: LatLng): number {
  const rad = (deg: number) => (deg * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`
}
