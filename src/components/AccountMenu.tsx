import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import type { User } from '@supabase/supabase-js'

type Props = {
  user: User | null
  favoriteCount: number
  onLogin: () => void
  onShowFavorites: () => void
  onLogout: () => void
}

export default function AccountMenu({ user, favoriteCount, onLogin, onShowFavorites, onLogout }: Props) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Tutup menu saat klik di luar menu.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  if (!user) {
    return (
      <button
        type="button"
        onClick={onLogin}
        className="shrink-0 rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-paper shadow-[0_6px_16px_-6px_rgba(0,0,0,0.5)] transition hover:-translate-y-0.5 active:scale-95 md:py-2"
      >
        Masuk
      </button>
    )
  }

  const name = (user.user_metadata.full_name as string | undefined) ?? user.email ?? 'Kamu'
  const avatar = user.user_metadata.avatar_url as string | undefined

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Akun ${name}`}
        className="grid size-12 place-items-center overflow-hidden rounded-full border-2 border-paper bg-accent text-lg font-bold text-paper shadow-[0_4px_14px_-4px_rgba(0,0,0,0.35)] transition hover:scale-105 active:scale-95 md:size-10"
      >
        {avatar ? (
          <Image src={avatar} alt="" width={48} height={48} unoptimized referrerPolicy="no-referrer" className="size-full object-cover" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 z-[1200] mt-2 w-64 origin-top-right animate-pop-in rounded-2xl border border-line bg-paper p-2 shadow-xl">
          <div className="px-3 py-2">
            <p className="truncate font-bold">{name}</p>
            {user.email && <p className="truncate text-xs text-muted">{user.email}</p>}
          </div>
          <div className="my-1 h-px bg-line" />
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onShowFavorites()
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-cream"
          >
            <span>❤️ Favorit saya</span>
            <span className="text-xs text-muted tabular-nums">{favoriteCount}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
            className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"
          >
            Keluar
          </button>
        </div>
      )}
    </div>
  )
}
