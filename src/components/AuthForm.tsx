import { useState, type FormEvent } from 'react'
import { MIN_PASSWORD_LENGTH } from '@/lib/auth'

type Mode = 'masuk' | 'daftar'
type AuthResult = { error: string | null; needsConfirmation?: boolean }

type Props = {
  onSignIn: (email: string, password: string) => Promise<AuthResult>
  onSignUp: (name: string, email: string, password: string) => Promise<AuthResult>
  onSuccess: (message: string) => void
}

const inputClass =
  'mt-1 h-12 w-full rounded-2xl border border-line bg-paper px-4 text-[15px] transition outline-none placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/15'

export default function AuthForm({ onSignIn, onSignUp, onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>('masuk')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setInfo(null)
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setInfo(null)
    const result =
      mode === 'masuk' ? await onSignIn(email.trim(), password) : await onSignUp(name.trim(), email.trim(), password)

    if (result.error) {
      setSubmitting(false)
      setError(result.error)
      return
    }
    if (result.needsConfirmation) {
      setSubmitting(false)
      setInfo('Akun berhasil dibuat. Cek email kamu untuk konfirmasi, lalu masuk.')
      switchMode('masuk')
      return
    }
    // Tombol tetap "Memproses…" sampai halaman berpindah.
    const firstName = name.trim().split(' ')[0]
    onSuccess(mode === 'masuk' ? 'Berhasil masuk!' : `Akun dibuat. Selamat datang${firstName ? `, ${firstName}` : ''}!`)
  }

  return (
    <div>
      <h2 className="text-2xl font-extrabold tracking-tight">
        {mode === 'masuk' ? 'Masuk ke Nganre' : 'Buat akun Nganre'}
      </h2>
      <p className="mt-1.5 text-sm text-muted">
        {mode === 'masuk' ? 'Masuk dulu untuk membuka peta kuliner.' : 'Gratis, cukup email dan password.'}
      </p>

      <div role="tablist" className="mt-5 grid grid-cols-2 rounded-2xl bg-cream p-1 text-sm font-bold">
        {(['masuk', 'daftar'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={`rounded-xl py-2 transition ${mode === m ? 'bg-paper text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            {m === 'masuk' ? 'Masuk' : 'Daftar'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
        {mode === 'daftar' && (
          <label className="block text-sm font-semibold">
            Nama <span className="font-normal text-muted">(opsional)</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={50}
              placeholder="Nama panggilanmu"
              className={inputClass}
            />
          </label>
        )}
        <label className="block text-sm font-semibold">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            required
            placeholder="nama@gmail.com"
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-semibold">
          Password
          <span className="relative block">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'masuk' ? 'current-password' : 'new-password'}
              minLength={mode === 'daftar' ? MIN_PASSWORD_LENGTH : undefined}
              required
              placeholder={mode === 'daftar' ? `Minimal ${MIN_PASSWORD_LENGTH} karakter` : 'Password kamu'}
              className={`${inputClass} pr-20`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-3 mt-0.5 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-muted hover:bg-cream hover:text-ink"
            >
              {showPassword ? 'Sembunyi' : 'Lihat'}
            </button>
          </span>
        </label>

        {error && (
          <p role="alert" className="animate-fade-up rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="animate-fade-up rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-ink px-4 py-3.5 text-sm font-bold text-paper shadow-[0_8px_20px_-8px_rgba(0,0,0,0.5)] transition hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? 'Memproses…' : mode === 'masuk' ? 'Masuk' : 'Buat akun'}
        </button>
      </form>
    </div>
  )
}
