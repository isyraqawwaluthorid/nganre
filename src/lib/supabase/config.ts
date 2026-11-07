// Diisi dari .env.local (lihat .env.example). Kalau kosong, aplikasi tetap jalan
// dengan data lokal, hanya saja fitur login dan favorit disembunyikan.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY)
