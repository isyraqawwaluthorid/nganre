import { useEffect, useRef } from 'react'

type Props = {
  value: string
  onChange: (value: string) => void
}

export default function SearchBox({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Tekan "/" di mana saja untuk langsung mengetik di kolom pencarian.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
      if (e.key !== '/' || typing) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <label className="group relative block">
      <span className="sr-only">Cari tempat makan</span>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted transition-colors group-focus-within:text-accent"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
        placeholder="Cari coto, konro, nama jalan…"
        className="h-12 w-full rounded-2xl border border-line bg-paper pr-12 pl-11 text-[15px] shadow-[0_4px_14px_-6px_rgba(28,25,23,0.18)] transition outline-none placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/15 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange('')
            inputRef.current?.focus()
          }}
          aria-label="Hapus pencarian"
          className="absolute top-1/2 right-3 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-cream text-xs text-muted transition hover:bg-line hover:text-ink"
        >
          ✕
        </button>
      ) : (
        <kbd className="pointer-events-none absolute top-1/2 right-3.5 hidden -translate-y-1/2 rounded-md border border-line bg-cream px-2 py-0.5 font-sans text-xs font-semibold text-muted md:block">
          /
        </kbd>
      )}
    </label>
  )
}
