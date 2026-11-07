// Ubah data/places.json menjadi supabase/seed.sql.
// Pakai: node scripts/seed-sql.mjs
import { readFile, writeFile } from 'node:fs/promises'

const { places } = JSON.parse(await readFile(new URL('../data/places.json', import.meta.url), 'utf8'))

const sql = (value) => (value == null ? 'null' : `'${String(value).replaceAll("'", "''")}'`)

const rows = places.map((p) =>
  `  (${[sql(p.id), sql(p.name), sql(p.category), p.lat, p.lng, sql(p.address), sql(p.district), sql(p.openingHours), sql(p.openingHoursSource), sql(p.openingHoursUrl), sql(p.osmUrl)].join(', ')})`,
)

const output = `-- Dibuat otomatis oleh scripts/seed-sql.mjs dari data/places.json. Jangan diedit manual.
-- Data © OpenStreetMap contributors, ODbL 1.0.

insert into public.places (id, name, category, lat, lng, address, district, opening_hours, opening_hours_source, opening_hours_url, osm_url) values
${rows.join(',\n')}
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  lat = excluded.lat,
  lng = excluded.lng,
  address = excluded.address,
  district = excluded.district,
  opening_hours = excluded.opening_hours,
  opening_hours_source = excluded.opening_hours_source,
  opening_hours_url = excluded.opening_hours_url,
  osm_url = excluded.osm_url;
`

await writeFile(new URL('../supabase/seed.sql', import.meta.url), output)
console.log(`supabase/seed.sql berisi ${places.length} tempat`)
