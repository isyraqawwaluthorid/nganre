import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_KEY, SUPABASE_URL } from './config'

// Client untuk komponen di browser. createBrowserClient mengembalikan instance yang sama
// setiap dipanggil, dan sesi login disimpan di cookie lalu di-refresh otomatis.
export function getSupabaseBrowser() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY)
}
