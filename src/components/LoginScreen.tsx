'use client'

import { useState, type CSSProperties } from 'react'
import { useAuth } from '@/lib/auth'
import AuthForm from './AuthForm'

const FEATURES = [
  ['🗺️', '223 warung khas Makassar dengan data asli OpenStreetMap'],
  ['🎲', 'Bingung makan apa? Biar Nganre yang mengacak'],
  ['🕒', 'Status buka/tutup live dalam waktu WITA'],
  ['❤️', 'Simpan warung favoritmu di akunmu'],
]

// Emoji dekoratif yang melayang di area kosong (kanan dan bawah) supaya tidak menutupi teks:
// [emoji, kiri %, atas %, jeda animasi detik]
const FLOATING: [string, number, number, number][] = [
  ['🍲', 78, 8, 0],
  ['🍖', 88, 28, 0.6],
  ['🥣', 76, 48, 1.2],
  ['☕', 89, 67, 0.9],
  ['🐟', 70, 82, 0.3],
  ['🍌', 44, 86, 1.5],
  ['🍜', 20, 82, 0.4],
]

// Hanya izinkan kembali ke path di situs ini sendiri.
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get('next')
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/masuk') ? next : '/'
}

export default function LoginScreen() {
  const auth = useAuth()
  const [success, setSuccess] = useState<string | null>(null)

  function handleSuccess(message: string) {
    setSuccess(message)
    // Muat ulang penuh supaya proxy membaca cookie login yang baru.
    window.location.replace(nextPath())
  }

  return (
    <main className="grid min-h-dvh grid-rows-[auto_1fr] bg-cream md:grid-cols-[1.1fr_1fr] md:grid-rows-1">
      <section className="relative flex flex-col justify-between gap-8 overflow-hidden bg-accent p-7 text-white md:p-12">
        {FLOATING.map(([emoji, left, top, delay]) => (
          <span
            key={emoji}
            aria-hidden
            className="pointer-events-none absolute hidden animate-float text-5xl opacity-25 select-none md:block"
            style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${delay}s` } as CSSProperties}
          >
            {emoji}
          </span>
        ))}

        <div className="relative flex items-center gap-3">
          <span aria-hidden className="grid size-12 -rotate-6 place-items-center rounded-2xl bg-white text-2xl shadow-lg">
            🍲
          </span>
          <span className="text-2xl font-extrabold tracking-tight">Nganre</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl leading-[1.05] font-extrabold tracking-tight text-balance md:text-5xl">
            Mau makan apa hari ini, Daeng?
          </h1>
          <p className="mt-3 text-white/85 md:text-lg">Peta kuliner Makassar, dari coto sampai pisang ijo.</p>
          <ul className="mt-7 hidden space-y-3 md:block">
            {FEATURES.map(([icon, text], i) => (
              <li
                key={text}
                className="flex animate-fade-up items-center gap-3 font-medium"
                style={{ animationDelay: `${200 + i * 90}ms` }}
              >
                <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15 text-lg">
                  {icon}
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative hidden text-xs text-white/70 md:block">Data © OpenStreetMap contributors</p>
      </section>

      <section className="grid items-start justify-items-center p-6 md:items-center md:p-12">
        <div className="w-full max-w-sm animate-slide-up rounded-3xl border border-line bg-paper p-7 shadow-xl">
          {auth.enabled ? (
            <AuthForm onSignIn={auth.signIn} onSignUp={auth.signUp} onSuccess={handleSuccess} />
          ) : (
            <p className="text-sm text-muted">Login belum dikonfigurasi. Isi .env.local terlebih dahulu.</p>
          )}
          {success && (
            <p role="status" className="mt-4 animate-fade-up text-center text-sm font-semibold text-emerald-700">
              {success} Membuka peta…
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
