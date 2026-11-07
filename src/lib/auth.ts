import { useCallback, useEffect, useState } from 'react'
import type { AuthError, User } from '@supabase/supabase-js'
import { getSupabaseBrowser } from './supabase/client'
import { isSupabaseConfigured } from './supabase/config'

export const MIN_PASSWORD_LENGTH = 8

const AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: 'Email atau password salah.',
  user_already_exists: 'Email ini sudah terdaftar. Silakan masuk.',
  email_exists: 'Email ini sudah terdaftar. Silakan masuk.',
  weak_password: `Password terlalu lemah. Gunakan minimal ${MIN_PASSWORD_LENGTH} karakter.`,
  email_address_invalid: 'Format email tidak valid.',
  over_request_rate_limit: 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.',
  signup_disabled: 'Pendaftaran akun sedang ditutup.',
  email_not_confirmed: 'Email belum dikonfirmasi. Cek kotak masuk email kamu.',
}

function describeAuthError(error: AuthError): string {
  if (error.name === 'AuthRetryableFetchError') return 'Tidak bisa terhubung ke server. Cek koneksi internet kamu.'
  return (error.code && AUTH_ERRORS[error.code]) || `Terjadi kesalahan: ${error.message}`
}

type AuthResult = { error: string | null; needsConfirmation?: boolean }

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseBrowser()
    if (!supabase) return
    // Langsung terpanggil sekali dengan sesi saat ini (INITIAL_SESSION), lalu setiap login/logout.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const supabase = getSupabaseBrowser()
    if (!supabase) return { error: 'Login belum dikonfigurasi.' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? describeAuthError(error) : null }
  }, [])

  const signUp = useCallback(async (name: string, email: string, password: string): Promise<AuthResult> => {
    const supabase = getSupabaseBrowser()
    if (!supabase) return { error: 'Login belum dikonfigurasi.' }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    if (error) return { error: describeAuthError(error) }
    // Kalau "Confirm email" aktif di Supabase, user harus klik link di email dulu sebelum bisa masuk.
    return { error: null, needsConfirmation: !data.session }
  }, [])

  const signOut = useCallback(async () => {
    await getSupabaseBrowser()?.auth.signOut()
  }, [])

  return { enabled: isSupabaseConfigured, ready, user, signIn, signUp, signOut }
}

const NO_FAVORITES: ReadonlySet<string> = new Set()

function withFavorite(ids: ReadonlySet<string>, placeId: string, favorite: boolean): Set<string> {
  const next = new Set(ids)
  if (favorite) next.add(placeId)
  else next.delete(placeId)
  return next
}

export function useFavorites(user: User | null) {
  const userId = user?.id ?? null
  const [state, setState] = useState<{ userId: string | null; ids: ReadonlySet<string> }>({
    userId: null,
    ids: NO_FAVORITES,
  })

  useEffect(() => {
    const supabase = getSupabaseBrowser()
    if (!supabase || !userId) return
    let cancelled = false
    supabase
      .from('favorites')
      .select('place_id')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Gagal memuat favorit:', error.message)
          return
        }
        setState({ userId, ids: new Set(data.map((row) => row.place_id as string)) })
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  // Favorit milik user sebelumnya tidak ikut tampil setelah ganti akun atau logout.
  const ids = state.userId === userId ? state.ids : NO_FAVORITES

  // Tampilan langsung diubah (optimistic), lalu dikembalikan kalau penyimpanan gagal.
  const toggle = useCallback(
    async (placeId: string): Promise<{ ok: boolean; favorite: boolean }> => {
      const supabase = getSupabaseBrowser()
      const favorite = !ids.has(placeId)
      if (!supabase || !userId) return { ok: false, favorite: !favorite }

      setState((prev) => ({ userId, ids: withFavorite(prev.ids, placeId, favorite) }))
      const { error } = favorite
        ? await supabase.from('favorites').insert({ user_id: userId, place_id: placeId })
        : await supabase.from('favorites').delete().match({ user_id: userId, place_id: placeId })

      if (error) {
        console.error('Gagal menyimpan favorit:', error.message)
        setState((prev) => ({ userId, ids: withFavorite(prev.ids, placeId, !favorite) }))
        return { ok: false, favorite: !favorite }
      }
      return { ok: true, favorite }
    },
    [ids, userId],
  )

  return { ids, toggle }
}
