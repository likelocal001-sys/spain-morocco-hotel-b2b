'use client'

import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  CircleDollarSign,
  FileSpreadsheet,
  Handshake,
  Mail,
  Pencil,
  PencilLine,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { DeadlineCell, HotelCell, RoomsCell, StatusBadge, StayCell } from '@/components/reservation-cells'
import { StatusFilter } from '@/components/status-filter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { blockProgress, formatEUR, getDeadline, negotiationProgress, stayPayments, unseenRevisions } from '@/lib/format'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { Reservation, ReservationStatus } from '@/lib/types'
import { ConfirmAction } from './confirm-action'
import { ConfirmDialog } from './confirm-dialog'
import { emailNeedsAttention } from './spanish-email-dialog'
import { NegotiationWorkspace } from './negotiation-workspace'
import { PaymentStatusDialog } from './payment-status-dialog'
import { SpanishEmailDialog } from './spanish-email-dialog'

export function PipelineTab() {
  const { t, lang, reservations, agencies, agencyName, updateReservation, hotelById } = useApp()
  const [status, setStatus] = useState<ReservationStatus | 'all'>('all')
  const [agency, setAgency] = useState('all')
  const [query, setQuery] = useState('')
  const [confirming, setConfirming] = useState<Reservation | null>(null)
  const [emailing, setEmailing] = useState<Reservation | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<Reservation | null>(null)

  const byAgency = useMemo(
    () => reservations.filter((r) => agency === 'all' || r.agencyId === agency),
    [reservations, agency],
  )
  const counts = useMemo(() => {
    const c: Partial<Record<ReservationStatus | 'all', number>> = { all: byAgency.length }
    for (const r of byAgency) c[r.status] = (c[r.status] ?? 0) + 1
    return c
  }, [byAgency])

  const rows = byAgency
    .filter((r) => status === 'all' || r.status === status)
    .filter((r) => {
      const q = query.trim().toLowerCase()
      return !q || r.groupName.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      const urgency = (r: Reservation) => {
        const { level, days } = getDeadline(r)
        if (level === 'expired' || level === 'critical' || level === 'warn') return days ?? -1
        if (r.status === 'pending') return 10
        if (r.status === 'in_progress') return 20
        if (r.status === 'confirmed') return 30
        return 40
      }
      return urgency(a) - urgency(b) || a.checkIn.localeCompare(b.checkIn)
    })

  const agencyItems = [
    { value: 'all', label: t.allAgencies },
    ...agencies.map((a) => ({ value: a.id, label: lang === 'ko' ? a.nameKo : a.nameEs })),
  ]

  return (
    <section className="rounded-xl border bg-card shadow-xs">
      <div className="flex flex-col gap-2 border-b p-3 lg:flex-row lg:items-center">
        <label htmlFor="admin-search" className="sr-only">
          {t.searchPlaceholder}
        </label>
        <Input
          id="admin-search"
          type="search"
          placeholder={t.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="lg:max-w-xs"
        />
        <Select items={agencyItems} value={agency} onValueChange={(v) => v && setAgency(v as string)}>
          <SelectTrigger className="w-full lg:w-44" aria-label={t.colAgency}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {agencyItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <StatusFilter value={status} onChange={setStatus} counts={counts} />
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">{t.noResults}</p>
      ) : (
        <Table className="min-w-[1180px]">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="pl-4">{t.colId}</TableHead>
              <TableHead>{t.colAgency}</TableHead>
              <TableHead>{t.colGroup}</TableHead>
              <TableHead>{t.colStay}</TableHead>
              <TableHead>{t.colHotel}</TableHead>
              <TableHead>{t.colRooms}</TableHead>
              <TableHead>{t.colStatus}</TableHead>
              <TableHead>{t.colLimit}</TableHead>
              <TableHead className="text-right">{t.colAmount}</TableHead>
              <TableHead className="pr-4 text-right">{t.colActions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const level = getDeadline(r).level
              return (
                <TableRow
                  key={r.id}
                  className={cn(
                    (level === 'critical' || level === 'expired') && 'bg-destructive/[0.04]',
                    level === 'warn' && 'bg-warning/[0.07]',
                  )}
                >
                  <TableCell className="pl-4 font-mono text-xs font-medium">{r.id}</TableCell>
                  <TableCell className="text-xs">{agencyName(r.agencyId)}</TableCell>
                  <TableCell className="max-w-[220px] whitespace-normal">
                    <button
                      type="button"
                      onClick={() => setWorkspaceId(r.id)}
                      title={t.openWorkspace}
                      className="text-left text-sm font-medium underline-offset-4 hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                    {r.groupName}
                  </button>
                  {unseenRevisions(r).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setWorkspaceId(r.id)}
                      className="mt-1 flex w-fit items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-[11px] font-semibold text-warning-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <PencilLine className="size-3" aria-hidden="true" />
                      {t.revisionBadge} {unseenRevisions(r).length}
                    </button>
                  )}
                    {r.status !== 'cancelled' && (
                      <div className="mt-1 flex items-center gap-1.5" aria-label={t.progress}>
                        <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              negotiationProgress(r).percent === 100 ? 'bg-success' : 'bg-primary',
                            )}
                            style={{ width: `${negotiationProgress(r).percent}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                          {negotiationProgress(r).done}/{negotiationProgress(r).total}
                        </span>
                      </div>
                    )}
                    {r.roomingList && (
                      <a
                        href={r.roomingList.url ?? '#'}
                        download={r.roomingList.name}
                        className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        <FileSpreadsheet className="size-3" aria-hidden="true" />
                        {r.roomingList.name}
                      </a>
                    )}
                  </TableCell>
                  <TableCell>
                    <StayCell reservation={r} />
                  </TableCell>
                  <TableCell>
                    <HotelCell reservation={r} showRequests />
                  </TableCell>
                  <TableCell>
                    <RoomsCell reservation={r} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell>
                    <DeadlineCell reservation={r} />
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {formatEUR(r.finalAmount, lang)}
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex items-center justify-end gap-1">
                      {r.status === 'pending' && (
                        <Button
                          size="xs"
                          onClick={() => {
                            updateReservation(r.id, { status: 'in_progress' })
                            toast.success(t.negotiationToast, { description: r.id })
                          }}
                        >
                          <Handshake aria-hidden="true" />
                          {t.startNegotiation}
                        </Button>
                      )}
                      {r.status === 'in_progress' &&
                        (blockProgress(r).all ? (
                          <Button size="xs" onClick={() => setConfirming(r)}>
                            <BadgeCheck aria-hidden="true" />
                            {t.finalComplete}
                          </Button>
                        ) : (
                          <span
                            className="rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground tabular-nums"
                            title={t.allBlocksHint}
                          >
                            {t.blocksStatus} {blockProgress(r).secured}/{blockProgress(r).total}
                          </span>
                        ))}
                      {r.status === 'confirmed' && !r.paid && (
                        <Button
                          size="xs"
                          variant="outline"
                          className="border-success/40 text-success hover:bg-success/10 hover:text-success"
                      onClick={() => setPayingId(r.id)}
                    >
                          <CircleDollarSign aria-hidden="true" />
                          {t.depositStatus} {stayPayments(r).filter((p) => p.paid).length}/{stayPayments(r).length}
                        </Button>
                      )}
                      {r.status === 'confirmed' && (
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label={t.editConfirmation}
                          title={t.editConfirmation}
                          onClick={() => setConfirming(r)}
                        >
                          <Pencil />
                        </Button>
                      )}
                      {r.status !== 'cancelled' && (
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label={
                            emailNeedsAttention(r, hotelById) ? `${t.spanishEmail} · ${t.emailNeedsAttention}` : t.spanishEmail
                          }
                          title={emailNeedsAttention(r, hotelById) ? t.emailNeedsAttention : t.spanishEmail}
                          onClick={() => setEmailing(r)}
                          className="relative"
                        >
                          <Mail />
                          {emailNeedsAttention(r, hotelById) && (
                            <span
                              aria-hidden="true"
                              className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-destructive"
                            />
                          )}
                        </Button>
                      )}
                      {r.status !== 'cancelled' && !r.paid && (
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={t.cancelBooking}
                          title={t.cancelBooking}
                          onClick={() => setCancelling(r)}
                        >
                          <XCircle />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      {payingId && <PaymentStatusDialog reservationId={payingId} mode="admin" onClose={() => setPayingId(null)} />}
      {workspaceId && (
        <NegotiationWorkspace
          reservationId={workspaceId}
          onClose={() => setWorkspaceId(null)}
          onConfirm={(r) => {
            setWorkspaceId(null)
            setConfirming(r)
          }}
          onEmail={(r) => {
            setWorkspaceId(null)
            setEmailing(r)
          }}
        />
      )}
      {confirming && <ConfirmDialog reservation={confirming} onClose={() => setConfirming(null)} />}
      {emailing && <SpanishEmailDialog reservation={emailing} onClose={() => setEmailing(null)} />}
      {cancelling && (
        <ConfirmAction
          title={t.cancelBookingTitle}
          description={`${cancelling.id} · ${cancelling.groupName} — ${t.cancelBookingDesc}`}
          confirmLabel={t.cancelBooking}
          destructive
          onCancel={() => setCancelling(null)}
          onConfirm={() => {
            updateReservation(cancelling.id, { status: 'cancelled' })
            toast(t.cancelledToast, { description: cancelling.id })
            setCancelling(null)
          }}
        />
      )}
    </section>
  )
}
