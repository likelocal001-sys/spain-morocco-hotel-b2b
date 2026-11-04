'use client'

import { RequestTagChips } from '@/components/stay-request-tags'
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { cityLabel } from '@/lib/i18n'
import {
  type DeadlineLevel,
  formatDate,
  formatShortDate,
  getDeadline,
  getStays,
  nightsBetween,
  totalRooms,
} from '@/lib/format'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { Reservation, ReservationStatus } from '@/lib/types'

const STATUS_STYLES: Record<ReservationStatus, string> = {
  pending: 'bg-muted text-muted-foreground ring-border',
  in_progress: 'bg-secondary text-primary ring-primary/20',
  confirmed: 'bg-success/10 text-success ring-success/30',
  cancelled: 'bg-destructive/5 text-destructive/80 ring-destructive/20 line-through decoration-destructive/40',
}

export function StatusBadge({ status }: { status: ReservationStatus }) {
  const { t } = useApp()
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        STATUS_STYLES[status],
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5 rounded-full bg-current', status === 'in_progress' && 'animate-pulse')}
      />
      {t[`status_${status}`]}
    </span>
  )
}

export function DeadlineBadge({ reservation }: { reservation: Reservation }) {
  const { level, days } = getDeadline(reservation)
  return <DeadlineChip level={level} days={days} />
}

export function DeadlineChip({ level, days }: { level: DeadlineLevel; days?: number }) {
  const { t } = useApp()
  if (level === 'none') return null
  if (level === 'paid') {
    return (
      <span className="inline-flex h-5 items-center gap-1 rounded px-1.5 text-[11px] font-semibold text-success">
        <CheckCircle2 className="size-3" aria-hidden="true" />
        {t.paid}
      </span>
    )
  }

  const label = level === 'expired' ? t.expired : days === 0 ? 'D-Day' : `D-${days}`
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded px-1.5 font-mono text-[11px] font-bold whitespace-nowrap',
        level === 'ok' && 'bg-muted text-muted-foreground',
        level === 'warn' && 'animate-deadline bg-warning text-warning-foreground',
        (level === 'critical' || level === 'expired') && 'animate-deadline bg-destructive text-white',
      )}
    >
      {level === 'ok' ? (
        <Clock className="size-3" aria-hidden="true" />
      ) : (
        <AlertTriangle className="size-3" aria-hidden="true" />
      )}
      {label}
    </span>
  )
}

export function DeadlineCell({ reservation }: { reservation: Reservation }) {
  const { t, lang, hotelById } = useApp()
  const deadline = getDeadline(reservation)
  if (deadline.level === 'none' || !deadline.limit) {
    return <span className="text-xs text-muted-foreground">{reservation.status === 'cancelled' ? '—' : t.undecided}</span>
  }
  const nextHotel = deadline.next && hotelById(deadline.next.stay.hotelId)
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="font-mono text-xs tabular-nums">{formatDate(deadline.limit, lang)}</span>
      <DeadlineChip level={deadline.level} days={deadline.days} />
      {deadline.total > 1 && deadline.unpaid > 0 && (
        <span className="max-w-[150px] truncate text-[11px] text-muted-foreground">
          {nextHotel ? nextHotel.nameEs : deadline.next && cityLabel(deadline.next.stay.city, lang)} ·{' '}
          <span className="font-medium text-foreground">
            {t.unpaidHotels} {deadline.unpaid}/{deadline.total}
          </span>
        </span>
      )}
    </div>
  )
}

export function StayCell({ reservation }: { reservation: Reservation }) {
  const { t, lang } = useApp()
  return (
    <div className="flex flex-col">
      <span className="font-mono text-xs whitespace-nowrap tabular-nums">
        {formatShortDate(reservation.checkIn, lang)} → {formatShortDate(reservation.checkOut, lang)}
      </span>
      <span className="text-[11px] text-muted-foreground">
        {nightsBetween(reservation.checkIn, reservation.checkOut)}
        {t.nightsUnit} · {reservation.checkIn.slice(0, 4)}
      </span>
    </div>
  )
}

export function HotelCell({
  reservation,
  showRequests = false,
}: {
  reservation: Reservation
  showRequests?: boolean
}) {
  const { t, lang, hotelById } = useApp()
  const stays = getStays(reservation)
  return (
    <ul className="flex min-w-0 flex-col gap-0.5">
      {stays.map((stay) => {
        const hotel = hotelById(stay.hotelId)
        return (
          <li key={stay.id} className="flex min-w-0 flex-col gap-0.5 py-0.5">
            <div className="flex min-w-0 items-baseline gap-1.5">
              <span className="shrink-0 text-xs font-medium">{cityLabel(stay.city, lang)}</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {nightsBetween(stay.checkIn, stay.checkOut)}
                {t.nightsUnit}
              </span>
              <span className="max-w-[160px] truncate text-[11px] text-muted-foreground">
                {hotel ? hotel.nameEs : `${t.unassigned} · ${stay.stars}★`}
              </span>
            </div>
            {showRequests && <RequestTagChips tags={stay.requestTags ?? []} note={stay.requestNote} compact />}
          </li>
        )
      })}
    </ul>
  )
}

export function RoomsCell({ reservation }: { reservation: Reservation }) {
  const { t } = useApp()
  const { single, twin, triple } = reservation.rooms
  return (
    <div className="flex flex-col">
      <span className="font-mono text-xs font-semibold tabular-nums">
        {totalRooms(reservation.rooms)}
        <span className="ml-0.5 font-sans font-normal text-muted-foreground">{t.roomsUnit}</span>
      </span>
      <span className="font-mono text-[11px] whitespace-nowrap text-muted-foreground tabular-nums">
        S{single} · T{twin} · Tr{triple}
      </span>
    </div>
  )
}
