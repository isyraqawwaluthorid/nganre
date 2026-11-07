// Ambil data tempat makan khas Makassar dari OpenStreetMap lalu simpan ke data/places.json.
// Pakai: node scripts/fetch-osm.mjs            (ambil data + lengkapi alamat via Nominatim)
//        node scripts/fetch-osm.mjs --no-geocode (lebih cepat, tanpa alamat tambahan)
// Alamat yang sudah ada di data/places.json dipakai ulang, jadi hanya tempat baru yang di-geocode.
// Jam buka dari data/opening-hours.json dipakai untuk tempat yang belum punya jam buka di OSM.
import { readFile, writeFile } from 'node:fs/promises'

const USER_AGENT = 'nganre/0.1 (github.com/isyraqawwaluthorid)'
const BBOX = '-5.25,119.37,-5.05,119.56' // selatan, barat, utara, timur — kira-kira Kota Makassar
const GEOCODE = !process.argv.includes('--no-geocode')

// Urutan penting: nama yang cocok dengan lebih dari satu pola masuk ke kategori pertama.
const RULES = [
  ['konro', /konro/i],
  ['pallubasa', /pall?u ?basa/i],
  ['sop-saudara', /s ?audara/i],
  ['coto', /coto/i],
  ['mie', /\bmie? titi\b|\bmie awa\b|\bmie? pangsit\b|pangsit mie|\bmie kering\b/i],
  ['seafood', /ikan bakar|seafood|kepiting|pallumara|paotere/i],
  ['jajanan', /pisang (epe|ijo)|otak.?otak|jalangkote|barongko|pallu butung/i],
  ['khas-daerah', /kapurung|nasu palekko/i],
  ['warkop', /warkop|warung kopi|kedai kopi|phoenam|\bkopi\b/i],
]

const query = `[out:json][timeout:90];
nwr["amenity"~"^(restaurant|cafe|fast_food|food_court)$"]["name"](${BBOX});
out center tags;`

function categorize(name) {
  return RULES.find(([, pattern]) => pattern.test(name))?.[0] ?? null
}

// "SOP KONRO TABARIA" / "pallu basa serigala" → "Sop Konro Tabaria" / "Pallu Basa Serigala"
function prettifyName(name) {
  const trimmed = name.trim().replace(/\s+/g, ' ')
  if (trimmed !== trimmed.toUpperCase() && trimmed !== trimmed.toLowerCase()) return trimmed
  return trimmed.toLowerCase().replace(/(^|[\s(&/.-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase())
}

function distanceMeters(a, b) {
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

function addressFromTags(tags) {
  if (tags['addr:full']) return tags['addr:full']
  if (!tags['addr:street']) return null
  return [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' No. ')
}

async function reverseGeocode({ lat, lng }) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&accept-language=id&lat=${lat}&lon=${lng}`
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) return {}
  const { address = {} } = await res.json()
  return {
    street: address.road ?? null,
    district: address.city_district ?? address.suburb ?? null,
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
  } catch {
    return fallback
  }
}

async function main() {
  console.log('Mengambil data dari Overpass API...')
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ data: query }),
  })
  if (!res.ok) throw new Error(`Overpass gagal: ${res.status} ${res.statusText}`)
  const { elements } = await res.json()

  const places = []
  for (const el of elements) {
    const { tags } = el
    // Fokus ke usaha lokal: lewati jaringan franchise yang punya tag brand.
    if (tags.brand || tags['brand:wikidata']) continue

    const category = categorize(tags.name)
    if (!category) continue

    const lat = el.lat ?? el.center?.lat
    const lng = el.lon ?? el.center?.lon
    if (lat == null || lng == null) continue

    const place = {
      id: `osm-${el.type}-${el.id}`,
      name: prettifyName(tags.name),
      category,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      address: addressFromTags(tags),
      district: null,
      openingHours: tags.opening_hours ?? null,
      openingHoursSource: tags.opening_hours ? 'OpenStreetMap' : null,
      openingHoursUrl: null,
      osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    }

    // Satu tempat kadang tercatat dua kali (titik + bangunan). Anggap duplikat
    // kalau namanya sama dan jaraknya kurang dari 150 m.
    const key = place.name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
    const duplicate = places.find(
      (p) => p.name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '') === key && distanceMeters(p, place) < 150,
    )
    if (duplicate) {
      duplicate.address ??= place.address
      if (!duplicate.openingHours && place.openingHours) {
        duplicate.openingHours = place.openingHours
        duplicate.openingHoursSource = place.openingHoursSource
      }
      continue
    }
    places.push(place)
  }

  const curatedHours = await readJson('../data/opening-hours.json', {})
  for (const place of places) {
    const curated = curatedHours[place.id]
    if (place.openingHours || !curated) continue
    place.openingHours = curated.hours
    place.openingHoursSource = curated.source
    place.openingHoursUrl = curated.url
  }

  const previous = await readJson('../data/places.json', { places: [] })
  const cachedAddress = new Map(previous.places.map((p) => [p.id, p]))
  const needGeocode = []
  for (const place of places) {
    const cached = cachedAddress.get(place.id)
    if (!cached) needGeocode.push(place)
    else {
      place.address ??= cached.address
      place.district = cached.district
    }
  }

  if (GEOCODE && needGeocode.length > 0) {
    console.log(`Melengkapi alamat ${needGeocode.length} tempat baru via Nominatim (±1 detik per tempat)...`)
    for (const [i, place] of needGeocode.entries()) {
      const { street, district } = await reverseGeocode(place)
      place.address ??= street
      place.district = district ?? null
      process.stdout.write(`\r  ${i + 1}/${needGeocode.length}`)
      await sleep(1100) // batas pemakaian Nominatim: maksimal 1 request per detik
    }
    process.stdout.write('\n')
  }

  places.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))

  const output = {
    attribution: '© OpenStreetMap contributors, ODbL 1.0 — https://www.openstreetmap.org/copyright',
    fetchedAt: new Date().toISOString(),
    places,
  }
  await writeFile(new URL('../data/places.json', import.meta.url), JSON.stringify(output, null, 2) + '\n')

  const counts = Object.groupBy(places, (p) => p.category)
  console.log(`Tersimpan ${places.length} tempat ke data/places.json (${places.filter((p) => p.openingHours).length} dengan jam buka)`)
  for (const [category, list] of Object.entries(counts)) console.log(`  ${category}: ${list.length}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
