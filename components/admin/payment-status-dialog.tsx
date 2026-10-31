'use client'

import { toast } from 'sonner'
import { DeadlineChip } from '@/components/reservation-cells'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { deadlineLevel, formatDate, formatEUR, paymentPatch, stayPayments } from '@/lib/format'
import { cityLabel } from '@/lib/i18n'
import { useApp } from '@/lib/store'
import type { Reservation } from '@/lib/types'
import { cn } from '@/lib/utils'

export function PaymentStatusDialog({ reservationId, onClose }: { reservationId: string; onClose: () => void }) {
  const { t, lang, reservations, hotelById, updateReservation } = useApp()
  const reservation = reservations.find((r) => r.id === reservationId)
  if (!reservation) return null
  const payments = stayPayments(reservation)
  const paidCount = payments.filter((p) => p.paid).length

  function toggle(r: Reservation, stayId: string, paid: boolean) {
    const patch = paymentPatch(r, { [stayId]: { paid } })
    updateReservation(r.id, patch)
    if (patch.paid) toast.success(t.paidToast, { description: r.id })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.stayPayments}</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{reservation.id}</span> · {reservation.groupName} ·{' '}
            <span className="font-medium text-foreground">
              {t.paid} {paidCount}/{payments.length}
            </span>
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2">
          {payments.map((p, index) => {
            const hotel = hotelById(p.stay.hotelId)
            const { level, days } = deadlineLevel(p.limit, p.paid)
            const id = `paid-${p.stay.id}`
            return (
              <li
                key={p.stay.id}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                  p.paid ? 'border-success/30 bg-success/5' : 'bg-background',
                )}
              >
                <Checkbox
                  id={id}
                  checked={p.paid}
                  onCheckedChange={(checked) => toggle(reservation, p.stay.id, checked === true)}
                  className="mt-0.5"
                />
                <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-x-2 text-sm font-semibold">
                    <span className="font-mono text-primary">{index + 1}</span>
                    {cityLabel(p.stay.city, lang)} · {hotel?.nameEs ?? t.unassigned}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-mono font-semibold text-foreground">{formatEUR(p.amount, lang)}</span>
                    <span className="font-mono">{formatDate(p.limit, lang)}</span>
                    <DeadlineChip level={level} days={days} />
                  </span>
                  {hotel?.bank?.iban ? (
                    <span className="truncate font-mono text-[11px] text-muted-foreground">{hotel.bank.iban}</span>
                  ) : (
                    <span className="text-[11px] font-semibold text-destructive">{t.bankMissing}</span>
                  )}
                </label>
              </li>
            )
          })}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
