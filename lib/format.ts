import type { BookingSnapshot, Lang, Reservation, RoomCounts, Stay } from './types'

export function toISODate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(base: Date, days: number) {
  const next = new Date(base)
  next.setDate(next.getDate() + days)
  return toISODate(next)
}

function parseISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function daysUntil(iso: string, today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((parseISO(iso).getTime() - start.getTime()) / 86_400_000)
}

export function nightsBetween(checkIn: string, checkOut: string) {
  return Math.max(0, Math.round((parseISO(checkOut).getTime() - parseISO(checkIn).getTime()) / 86_400_000))
}

export function formatDate(iso: string | undefined, lang: Lang) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return lang === 'ko' ? `${y}.${m}.${d}` : `${d}/${m}/${y}`
}

export function formatShortDate(iso: string, lang: Lang) {
  const [, m, d] = iso.split('-')
  return lang === 'ko' ? `${m}.${d}` : `${d}/${m}`
}

export function formatEUR(amount: number | undefined, lang: Lang) {
  if (amount === undefined) return '—'
  return new Intl.NumberFormat(lang === 'ko' ? 'ko-KR' : 'es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatMonth(key: string, lang: Lang) {
  const [y, m] = key.split('-')
  if (lang === 'ko') return `${y}년 ${Number(m)}월`
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${months[Number(m) - 1]} ${y}`
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function totalRooms(rooms: RoomCounts) {
  return rooms.single + rooms.twin + rooms.triple
}

export function getStays(r: Reservation): Stay[] {
  if (r.stays?.length) return r.stays
  return [
    {
      id: `${r.id}-1`,
      city: r.city,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      stars: r.preferredStars ?? 4,
      hotelId: r.hotelId,
    },
  ]
}

export const NEGOTIATION_STEP_COUNT = 5
export const GROUP_CHECK_COUNT = 4

export function snapshotOf(r: Reservation): BookingSnapshot {
  return {
    groupName: r.groupName,
    stays: getStays(r).map((s) => ({ ...s, requestTags: s.requestTags ?? [] })),
    rooms: { ...r.rooms },
    breakfast: r.breakfast,
    roomingList: r.roomingList ? { name: r.roomingList.name, size: r.roomingList.size } : undefined,
    requests: r.requests,
  }
}

export function unseenRevisions(r: Reservation) {
  return (r.revisions ?? []).filter((rev) => !rev.seen)
}

export function negotiationProgress(r: Reservation) {
  const stays = getStays(r)
  const total = stays.length * NEGOTIATION_STEP_COUNT + GROUP_CHECK_COUNT
  const done =
    stays.reduce((sum, s) => sum + (r.negotiation?.[s.id]?.steps.length ?? 0), 0) + (r.groupChecks?.length ?? 0)
  return { done, total, percent: Math.round((done / total) * 100) }
}

export function roomNights(r: Reservation) {
  return getStays(r).reduce((sum, s) => sum + totalRooms(r.rooms) * nightsBetween(s.checkIn, s.checkOut), 0)
}

export type DeadlineLevel = 'none' | 'paid' | 'ok' | 'warn' | 'critical' | 'expired'

export function getDeadline(r: Reservation): { level: DeadlineLevel; days?: number } {
  if (r.status !== 'confirmed' || !r.paymentLimit) return { level: 'none' }
  if (r.paid) return { level: 'paid' }
  const days = daysUntil(r.paymentLimit)
  if (days < 0) return { level: 'expired', days }
  if (days <= 1) return { level: 'critical', days }
  if (days <= 3) return { level: 'warn', days }
  return { level: 'ok', days }
}
