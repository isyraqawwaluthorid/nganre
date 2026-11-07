'use client'

import { memo, useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import maplibreGL from '@maplibre/maplibre-gl-leaflet'
import type { Map as GLMap } from 'maplibre-gl'
import { MapContainer, Marker, Tooltip, ZoomControl, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import 'leaflet/dist/leaflet.css'
import 'maplibre-gl/dist/maplibre-gl.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css'
import { CATEGORIES } from '@/lib/categories'
import { MAKASSAR_CENTER } from '@/lib/geo'
import type { CategoryId, MapFocus, Origin, Place } from '@/lib/types'

// Peta vektor gratis tanpa API key dari OpenFreeMap.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'
const BASEMAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> · Data © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'

// Warna peta disesuaikan dengan tema krem aplikasi.
type PaintProperty = Parameters<GLMap['setPaintProperty']>[1]
const MAP_TINT: [layer: string, property: PaintProperty, value: string][] = [
  ['background', 'background-color', '#f5efe4'],
  ['landuse_residential', 'fill-color', '#efe7d9'],
  ['park', 'fill-color', '#e2e8cf'],
  ['landcover_wood', 'fill-color', '#dce4c8'],
  ['water', 'fill-color', '#bcd8de'],
  ['waterway', 'line-color', '#bcd8de'],
  ['building', 'fill-color', '#ebe1d1'],
  ['building', 'fill-outline-color', '#dfd3bf'],
  ['highway_major_casing', 'line-color', '#e3d8c4'],
]

function VectorBasemap() {
  const map = useMap()

  useEffect(() => {
    const layer = maplibreGL({ style: STYLE_URL, attributionControl: false })
    layer.addTo(map)
    map.attributionControl.addAttribution(BASEMAP_ATTRIBUTION)

    const gl = layer.getMaplibreMap()
    gl.once('style.load', () => {
      for (const [id, property, value] of MAP_TINT) {
        if (gl.getLayer(id)) gl.setPaintProperty(id, property, value)
      }
    })

    return () => {
      map.attributionControl.removeAttribution(BASEMAP_ATTRIBUTION)
      layer.remove()
    }
  }, [map])

  return null
}

type PinState = 'idle' | 'hover' | 'active'

// Icon dibuat sekali per kombinasi kategori + state, supaya marker tidak
// membuat ulang elemen DOM setiap kali komponen dirender.
const iconCache = new Map<string, L.DivIcon>()

function pinIcon(category: CategoryId, state: PinState): L.DivIcon {
  const key = `${category}:${state}`
  const cached = iconCache.get(key)
  if (cached) return cached

  const { emoji, color } = CATEGORIES[category]
  const size = state === 'active' ? 46 : 34
  const icon = L.divIcon({
    className: 'pin-wrap',
    html: `<div class="pin pin--${state}" style="--pin:${color}"><span>${emoji}</span></div>`,
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 8],
    tooltipAnchor: [0, -(size + 6)],
  })
  iconCache.set(key, icon)
  return icon
}

function clusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount()
  const size = count < 10 ? 38 : count < 50 ? 46 : 54
  return L.divIcon({ className: 'pin-wrap', html: `<div class="cluster">${count}</div>`, iconSize: [size, size] })
}

const originIcon = L.divIcon({ className: '', html: '<div class="origin-dot"></div>', iconSize: [18, 18] })

// Di HP, bagian atas peta tertutup kolom pencarian dan bagian bawah tertutup panel,
// jadi titik tujuan digeser ke area yang masih kelihatan.
function FocusController({ focus }: { focus: MapFocus | null }) {
  const map = useMap()

  useEffect(() => {
    if (!focus) return
    const isMobile = window.matchMedia('(max-width: 767px)').matches

    if ('bounds' in focus) {
      map.flyToBounds(focus.bounds, {
        paddingTopLeft: isMobile ? [24, 130] : [48, 48],
        paddingBottomRight: isMobile ? [24, 150] : [48, 48],
        maxZoom: 15,
        duration: 0.8,
      })
      return
    }

    const zoom = Math.max(map.getZoom(), focus.zoom)
    const offsetY = isMobile ? map.getSize().y * 0.25 - 55 : 0
    const target = map.unproject(map.project([focus.center.lat, focus.center.lng], zoom).add([0, offsetY]), zoom)
    map.flyTo(target, zoom, { duration: 0.8 })
  }, [map, focus])

  return null
}

type PlaceMarkerProps = {
  place: Place
  state: PinState
  onSelect: (id: string) => void
}

const PlaceMarker = memo(function PlaceMarker({ place, state, onSelect }: PlaceMarkerProps) {
  const markerRef = useRef<L.Marker>(null)
  const eventHandlers = useMemo(() => ({ click: () => onSelect(place.id) }), [place.id, onSelect])

  // Saat kartu di daftar di-hover, tampilkan juga nama tempatnya di atas pin.
  useEffect(() => {
    const marker = markerRef.current
    if (!marker?.getElement()) return
    if (state === 'hover') marker.openTooltip()
    else marker.closeTooltip()
  }, [state])

  return (
    <Marker
      ref={markerRef}
      position={[place.lat, place.lng]}
      icon={pinIcon(place.category, state)}
      zIndexOffset={state === 'active' ? 1000 : state === 'hover' ? 500 : 0}
      eventHandlers={eventHandlers}
    >
      <Tooltip direction="top" className="pin-tooltip">
        {place.name}
      </Tooltip>
    </Marker>
  )
})

type MapViewProps = {
  places: Place[]
  selectedId: string | null
  hoveredId: string | null
  origin: Origin | null
  focus: MapFocus | null
  onSelect: (id: string) => void
  onReady: () => void
}

export default function MapView({ places, selectedId, hoveredId, origin, focus, onSelect, onReady }: MapViewProps) {
  return (
    <MapContainer
      whenReady={onReady}
      center={[MAKASSAR_CENTER.lat, MAKASSAR_CENTER.lng]}
      zoom={13}
      minZoom={11}
      maxZoom={19}
      maxBounds={[
        [-5.45, 119.2],
        [-4.85, 119.75],
      ]}
      maxBoundsViscosity={0.8}
      zoomControl={false}
      className="h-full w-full"
    >
      <VectorBasemap />
      <ZoomControl position="bottomright" />
      <FocusController focus={focus} />

      <MarkerClusterGroup
        chunkedLoading
        showCoverageOnHover={false}
        maxClusterRadius={48}
        disableClusteringAtZoom={16}
        iconCreateFunction={clusterIcon}
      >
        {places.map((place) => (
          <PlaceMarker
            key={place.id}
            place={place}
            state={place.id === selectedId ? 'active' : place.id === hoveredId ? 'hover' : 'idle'}
            onSelect={onSelect}
          />
        ))}
      </MarkerClusterGroup>

      {origin && (
        <Marker position={[origin.lat, origin.lng]} icon={originIcon} zIndexOffset={2000}>
          <Tooltip permanent direction="top" offset={[0, -12]} className="origin-label">
            {origin.label}
          </Tooltip>
        </Marker>
      )}
    </MapContainer>
  )
}
