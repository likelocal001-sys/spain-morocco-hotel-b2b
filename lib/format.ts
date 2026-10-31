import type { BookingSnapshot, Lang, Reservation, RoomCounts, Stay, StayNegotiation } from './types'

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
  requestTags: r.requestTags,
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

export function isBlockSecured(r: Reservation, stayId: string) {
  return r.negotiation?.[stayId]?.steps.includes('optionHeld') ?? false
}

export function blockProgress(r: Reservation) {
  const stays = getStays(r)
  const secured = stays.filter((s) => isBlockSecured(r, s.id)).length
  return { secured, total: stays.length, all: secured === stays.length }
}

const RATE_TYPES = ['single', 'twin', 'triple'] as const

export function stayEstimate(r: Reservation, stay: Stay) {
  const n = r.negotiation?.[stay.id]
  if (!n) return 0
  const perNight = RATE_TYPES.reduce((sum, k) => sum + (n.rates?.[k] ?? n.rate ?? 0) * r.rooms[k], 0)
  return perNight * nightsBetween(stay.checkIn, stay.checkOut)
}

export function negotiatedTotal(r: Reservation) {
  return getStays(r).reduce((sum, s) => sum + stayEstimate(r, s), 0)
}

export function roomNights(r: Reservation) {
  return getStays(r).reduce((sum, s) => sum + totalRooms(r.rooms) * nightsBetween(s.checkIn, s.checkOut), 0)
}

export const DEFAULT_PAYMENT_DAYS = 14

export function defaultStayLimit(checkIn: string, daysBefore = DEFAULT_PAYMENT_DAYS, today = new Date()) {
  const limit = addDays(parseISO(checkIn), -daysBefore)
  const todayISO = toISODate(today)
  return limit < todayISO ? todayISO : limit
}

export interface StayPayment {
  stay: Stay
  amount?: number
  limit?: string
  paid: boolean
}

export function stayPayments(r: Reservation): StayPayment[] {
  const stays = getStays(r)
  const totalNights = stays.reduce((sum, s) => sum + nightsBetween(s.checkIn, s.checkOut), 0)
  return stays.map((stay) => {
    const n = r.negotiation?.[stay.id]
    const share =
      r.finalAmount && totalNights
        ? Math.round(((r.finalAmount * nightsBetween(stay.checkIn, stay.checkOut)) / totalNights) * 100) / 100
        : undefined
    const fallback = stays.length === 1 ? r.finalAmount : stayEstimate(r, stay) || share
    return {
      stay,
      amount: n?.amount ?? fallback,
      limit: n?.paymentLimit ?? r.paymentLimit,
      paid: n?.paid ?? r.paid,
    }
  })
}

export function paymentPatch(
  r: Reservation,
  changes: Record<string, Partial<StayNegotiation>>,
): Pick<Reservation, 'negotiation' | 'paid'> {
  const negotiation: Record<string, StayNegotiation> = { ...r.negotiation }
  for (const p of stayPayments(r)) {
    const current = negotiation[p.stay.id]
    negotiation[p.stay.id] = { ...current, steps: current?.steps ?? [], paid: p.paid, ...changes[p.stay.id] }
  }
  const paid = getStays(r).every((s) => negotiation[s.id]?.paid)
  return { negotiation, paid }
}

export type DeadlineLevel = 'none' | 'paid' | 'ok' | 'warn' | 'critical' | 'expired'

export function deadlineLevel(limit: string | undefined, paid: boolean): { level: DeadlineLevel; days?: number } {
  if (!limit) return { level: 'none' }
  if (paid) return { level: 'paid' }
  const days = daysUntil(limit)
  if (days < 0) return { level: 'expired', days }
  if (days <= 1) return { level: 'critical', days }
  if (days <= 3) return { level: 'warn', days }
  return { level: 'ok', days }
}

export interface DeadlineInfo {
  level: DeadlineLevel
  days?: number
  limit?: string
  next?: StayPayment
  unpaid: number
  total: number
}

export function getDeadline(r: Reservation): DeadlineInfo {
  if (r.status !== 'confirmed') return { level: 'none', unpaid: 0, total: 0 }
  const payments = stayPayments(r)
  const unpaid = payments.filter((p) => !p.paid)
  const base = { unpaid: unpaid.length, total: payments.length }
  if (unpaid.length === 0) {
    const last = payments.map((p) => p.limit).filter(Boolean).sort().at(-1)
    return last ? { level: 'paid', limit: last, ...base } : { level: 'none', ...base }
  }
  const next = unpaid.filter((p) => p.limit).sort((a, b) => a.limit!.localeCompare(b.limit!))[0]
  if (!next) return { level: 'none', ...base }
  return { ...deadlineLevel(next.limit, false), limit: next.limit, next, ...base }
}
