// Parser kecil untuk format jam buka OpenStreetMap, misalnya:
//   "Mo-Fr 08:30-20:00"   "Sa-Fr 08:30-17:00" (Sabtu s/d Jumat = setiap hari)
//   "10:00-23:00"          "Mo-Sa 07:00-12:00,16:00-22:00; Su off"   "24/7"
// Hanya bagian yang umum dipakai yang didukung. Format lain dikembalikan null
// supaya UI menampilkan teks aslinya saja.
import { useSyncExternalStore } from 'react'
import type { OpenStatus } from './types'

type Interval = { start: number; end: number } // menit sejak 00:00; end > 1440 berarti lewat tengah malam
export type WeeklySchedule = Interval[][] // 7 hari, mulai Senin

const DAY_CODES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const DAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
const DAY_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

function parseDays(spec: string): number[] | null {
  const days = new Set<number>()
  for (const item of spec.split(',')) {
    if (item === 'PH') continue // hari libur nasional: diabaikan
    const [from, to = from] = item.split('-').map((code) => DAY_CODES.indexOf(code))
    if (from < 0 || to < 0) return null
    for (let i = 0; i < 7; i++) {
      const day = (from + i) % 7
      days.add(day)
      if (day === to) break
    }
  }
  return [...days]
}

function parseTimes(spec: string): Interval[] | null {
  if (spec === 'off' || spec === 'closed') return []
  const intervals: Interval[] = []
  for (const range of spec.split(',')) {
    const match = range.trim().match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/)
    if (!match) return null
    const [h1, m1, h2, m2] = match.slice(1).map(Number)
    const start = h1 * 60 + m1
    let end = h2 * 60 + m2
    if (end <= start) end += 1440
    intervals.push({ start, end })
  }
  return intervals
}

export function parseOpeningHours(raw: string): WeeklySchedule | null {
  const text = raw.trim()
  if (text === '24/7') return Array.from({ length: 7 }, () => [{ start: 0, end: 1440 }])

  const week: WeeklySchedule = Array.from({ length: 7 }, () => [])
  for (const rule of text.split(';').map((r) => r.trim()).filter(Boolean)) {
    const match = rule.match(/^((?:PH|Mo|Tu|We|Th|Fr|Sa|Su)(?:[-,](?:PH|Mo|Tu|We|Th|Fr|Sa|Su))*)?\s*(.+)$/)
    if (!match) return null
    const days = match[1] ? parseDays(match[1]) : [0, 1, 2, 3, 4, 5, 6]
    const times = parseTimes(match[2].trim())
    if (!days || !times) return null
    // Sesuai aturan OSM, aturan yang lebih belakang menimpa aturan sebelumnya.
    for (const day of days) week[day] = times
  }
  return week
}

// Jam sekarang di Makassar (WITA, UTC+8, tanpa daylight saving), apa pun zona waktu pengunjung.
export function makassarTime(timestamp: number): { day: number; minutes: number } {
  const wita = new Date(timestamp + 8 * 3_600_000)
  return { day: (wita.getUTCDay() + 6) % 7, minutes: wita.getUTCHours() * 60 + wita.getUTCMinutes() }
}

// Waktu sekarang (dibulatkan per menit) yang diperbarui otomatis. Saat render di server
// nilainya null, supaya status buka/tutup tidak bentrok dengan jam di browser pengunjung.
function subscribeClock(onChange: () => void) {
  const id = window.setInterval(onChange, 30_000)
  return () => window.clearInterval(id)
}
const getMinute = () => Math.floor(Date.now() / 60_000)
const getServerMinute = () => null

export function useCurrentTime(): number | null {
  const minute = useSyncExternalStore(subscribeClock, getMinute, getServerMinute)
  return minute == null ? null : minute * 60_000
}

function formatClock(minutes: number): string {
  const m = minutes % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}.${String(m % 60).padStart(2, '0')}`
}

export function getOpenStatus(schedule: WeeklySchedule, timestamp: number): OpenStatus {
  const { day, minutes } = makassarTime(timestamp)
  const yesterday = (day + 6) % 7

  const current =
    schedule[day].find((i) => i.start <= minutes && minutes < i.end) ??
    schedule[yesterday].map((i) => ({ start: i.start - 1440, end: i.end - 1440 })).find((i) => minutes < i.end)
  if (current) {
    if (current.start <= 0 && current.end >= 1440) return { open: true, label: 'Buka 24 jam' }
    return { open: true, label: `Buka · tutup ${formatClock(current.end)}` }
  }

  for (let offset = 0; offset <= 7; offset++) {
    const d = (day + offset) % 7
    const next = schedule[d].find((i) => offset > 0 || i.start > minutes)
    if (!next) continue
    const when = offset === 0 ? '' : offset === 1 ? 'besok ' : `${DAY_NAMES[d]} `
    return { open: false, label: `Tutup · buka ${when}${formatClock(next.start)}` }
  }
  return { open: false, label: 'Tutup' }
}

// Hari dengan jam yang sama digabung: "Sen–Jum 08.30–20.00", "Sab–Min Tutup".
export function describeSchedule(schedule: WeeklySchedule): { days: string; hours: string; includes: number[] }[] {
  const hoursOf = (d: number) =>
    schedule[d].length === 0
      ? 'Tutup'
      : schedule[d].map((i) => (i.start === 0 && i.end === 1440 ? '24 jam' : `${formatClock(i.start)}–${formatClock(i.end)}`)).join(', ')

  const rows: { days: string; hours: string; includes: number[] }[] = []
  for (let d = 0; d < 7; d++) {
    const last = rows.at(-1)
    if (last && last.hours === hoursOf(d)) last.includes.push(d)
    else rows.push({ days: '', hours: hoursOf(d), includes: [d] })
  }
  for (const row of rows) {
    const first = row.includes[0]
    const lastDay = row.includes.at(-1)!
    row.days =
      row.includes.length === 7 ? 'Setiap hari' : first === lastDay ? DAY_NAMES[first] : `${DAY_SHORT[first]}–${DAY_SHORT[lastDay]}`
  }
  return rows
}
