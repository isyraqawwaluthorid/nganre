import { cacheLife } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import seed from '../../data/places.json'
import { SUPABASE_KEY, SUPABASE_URL } from './supabase/config'
import type { DataSource, Place } from './types'

const seedPlaces = seed.places as Place[]

// Kalau Supabase sudah dikonfigurasi (lihat .env.example), data diambil dari database.
// Kalau belum, pakai data/places.json supaya aplikasi tetap bisa jalan.
export async function getPlaces(): Promise<{ places: Place[]; source: DataSource }> {
  'use cache'
  cacheLife('hours')

  if (!SUPABASE_URL || !SUPABASE_KEY) return { places: seedPlaces, source: 'seed' }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  const { data, error } = await supabase
    .from('places')
    .select(
      'id, name, category, lat, lng, address, district, openingHours:opening_hours, openingHoursSource:opening_hours_source, openingHoursUrl:opening_hours_url, osmUrl:osm_url',
    )

  if (error) {
    console.error('Gagal mengambil data dari Supabase, memakai data lokal:', error.message)
    return { places: seedPlaces, source: 'seed' }
  }
  return { places: data as Place[], source: 'supabase' }
}
