'use client'

import { useMemo } from 'react'
import { BedDouble, CalendarCheck, Euro, Info } from 'lucide-react'
import { StatCard } from '@/components/stat-card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatEUR, formatMonth, roomNights, totalRooms } from '@/lib/format'
import { FEE_RATES, useApp } from '@/lib/store'

interface Aggregate {
  bookings: number
  rooms: number
  roomNights: number
  fee: number
}

const empty = (): Aggregate => ({ bookings: 0, rooms: 0, roomNights: 0, fee: 0 })

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-muted" aria-hidden="true">
      <div className="h-full rounded-full bg-primary" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
    </div>
  )
}

export function BillingTab() {
  const { t, lang, reservations, hotels, feeFor, setHotelFeeRate } = useApp()

  const { byHotel, monthRows, totals } = useMemo(() => {
    const byHotel = new Map<string, Aggregate>()
    const byMonth = new Map<string, Aggregate>()
    const totals = empty()
    for (const r of reservations) {
      if (r.status !== 'confirmed') continue
      const rn = roomNights(r)
      const fee = feeFor(r)
      const month = r.checkIn.slice(0, 7)
      const hotelKey = r.hotelId ?? ''
      if (!byHotel.has(hotelKey)) byHotel.set(hotelKey, empty())
      if (!byMonth.has(month)) byMonth.set(month, empty())
      for (const agg of [byHotel.get(hotelKey)!, byMonth.get(month)!, totals]) {
        agg.bookings += 1
        agg.rooms += totalRooms(r.rooms)
        agg.roomNights += rn
        agg.fee += fee
      }
    }
    const monthRows = Array.from(byMonth.entries()).sort(([a], [b]) => b.localeCompare(a))
    return { byHotel, monthRows, totals }
  }, [reservations, feeFor])

  const hotelRows = [...hotels].sort(
    (a, b) => (byHotel.get(b.id)?.fee ?? 0) - (byHotel.get(a.id)?.fee ?? 0) || a.nameEs.localeCompare(b.nameEs),
  )
  const rateItems = FEE_RATES.map((r) => ({ value: String(r), label: formatEUR(r, lang) }))
  const maxHotelFee = Math.max(0, ...Array.from(byHotel.values()).map((a) => a.fee))
  const maxMonthFee = Math.max(0, ...monthRows.map(([, a]) => a.fee))

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-start gap-2 rounded-lg border bg-secondary/50 px-3 py-2 text-xs text-secondary-foreground">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        {t.feeHint}
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t.confirmedBookings} value={totals.bookings} icon={CalendarCheck} />
        <StatCard label={t.rooms} value={totals.rooms} icon={BedDouble} />
        <StatCard label={t.roomNights} value={totals.roomNights} />
        <StatCard
          label={t.totalFee}
          value={formatEUR(totals.fee, lang)}
          icon={Euro}
          tone="primary"
          hint={`${t.avgRate}: ${formatEUR(totals.roomNights ? totals.fee / totals.roomNights : 0, lang)}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-xl border bg-card shadow-xs" aria-labelledby="by-hotel">
          <h2 id="by-hotel" className="border-b px-4 py-3 text-sm font-semibold">
            {t.byHotel}
          </h2>
          <Table className="min-w-[560px]">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="pl-4">{t.hotelNameEs}</TableHead>
                <TableHead className="text-right">{t.bookings}</TableHead>
                <TableHead className="text-right">{t.roomNights}</TableHead>
                <TableHead>{t.rate}</TableHead>
                <TableHead className="pr-4 text-right">{t.fee}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hotelRows.map((h) => {
                const agg = byHotel.get(h.id) ?? empty()
                return (
                  <TableRow key={h.id}>
                    <TableCell className="pl-4">
                      <p className="text-sm font-medium">{h.nameEs}</p>
                      <Bar value={agg.fee} max={maxHotelFee} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">{agg.bookings}</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">{agg.roomNights}</TableCell>
                    <TableCell>
                      <Select
                        items={rateItems}
                        value={String(h.feeRate)}
                        onValueChange={(v) => v && setHotelFeeRate(h.id, Number(v))}
                      >
                        <SelectTrigger size="sm" className="w-24 font-mono" aria-label={`${t.rate} – ${h.nameEs}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {rateItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="pr-4 text-right font-mono text-sm font-semibold tabular-nums">
                      {formatEUR(agg.fee, lang)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="pl-4 font-semibold">{t.total}</TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums">{totals.bookings}</TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums">{totals.roomNights}</TableCell>
                <TableCell />
                <TableCell className="pr-4 text-right font-mono font-bold text-primary tabular-nums">
                  {formatEUR(totals.fee, lang)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </section>

        <section className="rounded-xl border bg-card shadow-xs" aria-labelledby="by-month">
          <h2 id="by-month" className="border-b px-4 py-3 text-sm font-semibold">
            {t.byMonth}
          </h2>
          {monthRows.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">{t.noData}</p>
          ) : (
            <Table className="min-w-[520px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="pl-4">{t.month}</TableHead>
                  <TableHead className="text-right">{t.bookings}</TableHead>
                  <TableHead className="text-right">{t.rooms}</TableHead>
                  <TableHead className="text-right">{t.roomNights}</TableHead>
                  <TableHead className="pr-4 text-right">{t.fee}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthRows.map(([month, agg]) => (
                  <TableRow key={month}>
                    <TableCell className="pl-4">
                      <p className="text-sm font-medium">{formatMonth(month, lang)}</p>
                      <Bar value={agg.fee} max={maxMonthFee} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">{agg.bookings}</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">{agg.rooms}</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">{agg.roomNights}</TableCell>
                    <TableCell className="pr-4 text-right font-mono text-sm font-semibold tabular-nums">
                      {formatEUR(agg.fee, lang)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
    </div>
  )
}
