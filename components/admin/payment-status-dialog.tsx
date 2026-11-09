'use client'

import { CircleCheck, Clock, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { DeadlineChip } from '@/components/reservation-cells'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { deadlineLevel, formatDate, formatEUR, paymentPatch, stayPayments } from '@/lib/format'
import { cityLabel } from '@/lib/i18n'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'

export function PaymentStatusDialog({
  reservationId,
  mode,
  onClose,
}: {
  reservationId: string
  mode: 'client' | 'admin'
  onClose: () => void
}) {
  const { t, lang, reservations, hotelById, updateReservation } = useApp()
  const reservation = reservations.find((r) => r.id === reservationId)
  if (!reservation) return null
  const payments = stayPayments(reservation)
  const paidCount = payments.filter((p) => p.paid).length
  const isClient = mode === 'client'

  function setDeposited(stayId: string, paid: boolean) {
    if (!reservation) return
    const paidAt = paid ? new Date().toISOString().slice(0, 10) : undefined
    updateReservation(reservation.id, paymentPatch(reservation, { [stayId]: { paid, paidAt } }))
    if (paid) toast.success(t.depositToast, { description: reservation.id })
    else toast(t.depositUndoToast, { description: reservation.id })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isClient ? t.depositStatus : t.stayPayments}</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{reservation.id}</span> · {reservation.groupName} ·{' '}
            <span className="font-medium text-foreground">
              {t.deposited} {paidCount}/{payments.length}
            </span>
          </DialogDescription>
        </DialogHeader>
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          {isClient ? t.clientDepositHint : t.adminDepositHint}
        </p>
        <ul className="flex flex-col gap-2">
          {payments.map((p, index) => {
            const hotel = hotelById(p.stay.hotelId)
            const { level, days } = deadlineLevel(p.limit, p.paid)
            const ready = p.amount != null && Boolean(p.limit)
            return (
              <li
                key={p.stay.id}
                className={cn(
                  'flex flex-col gap-2 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center',
                  p.paid ? 'border-success/40 bg-success/5' : 'bg-background',
                )}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-x-2 text-sm font-semibold">
                    <span className="font-mono text-primary">{index + 1}</span>
                    {cityLabel(p.stay.city, lang)} · {hotel?.nameEs ?? t.unassigned}
                  </span>
                  {ready ? (
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-mono font-semibold text-foreground">{formatEUR(p.amount, lang)}</span>
                      <span className="font-mono">{formatDate(p.limit, lang)}</span>
                      <DeadlineChip level={level} days={days} />
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" aria-hidden="true" />
                      {t.awaitingAmount}
                    </span>
                  )}
                  {hotel?.bank?.iban ? (
                    <span className="truncate font-mono text-[11px] text-muted-foreground">{hotel.bank.iban}</span>
                  ) : (
                    <span className="text-[11px] font-semibold text-destructive">
                      {isClient ? t.bankMissingShort : t.bankMissing}
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
                  {p.paid ? (
                    <>
                      <span className="flex items-center gap-1 rounded-sm bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                        <CircleCheck className="size-3.5" aria-hidden="true" />
                        {t.deposited}
                        {p.paidAt && <span className="font-mono font-normal">{formatDate(p.paidAt, lang)}</span>}
                      </span>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label={t.undoDeposit}
                        title={t.undoDeposit}
                        onClick={() => setDeposited(p.stay.id, false)}
                      >
                        <Undo2 />
                      </Button>
                    </>
                  ) : isClient ? (
                    <Button size="sm" disabled={!ready} onClick={() => setDeposited(p.stay.id, true)}>
                      <CircleCheck aria-hidden="true" />
                      {t.markDeposited}
                    </Button>
                  ) : (
                    <span className="rounded-sm bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {t.notDeposited}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
