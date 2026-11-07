'use client'

import { Download, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cityLabel, stayRequestLabels } from '@/lib/i18n'
import { formatDate, formatEUR, getStays, nightsBetween, stayPayments, toISODate, totalRooms } from '@/lib/format'
import { printElement } from '@/lib/print'
import { useAttachmentDownload } from '@/hooks/use-attachment-download'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { Reservation } from '@/lib/types'

export type DocumentKind = 'voucher' | 'payment'

export function DocRow({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 border-b border-dashed py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

export function DocHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const { t, lang } = useApp()
  return (
    <div className="flex items-start justify-between gap-4 border-b-2 border-primary pb-4">
      <div>
        <p className="font-mono text-xs font-bold tracking-widest text-primary">SP-MOROCCO HOTEL DESK</p>
        <h2 className="mt-1 text-xl font-bold">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="text-right text-xs text-muted-foreground">
        <p>{t.issuedOn}</p>
        <p className="font-mono text-foreground">{formatDate(toISODate(new Date()), lang)}</p>
      </div>
    </div>
  )
}

export function PrintButton({ title }: { title?: string }) {
  const { t } = useApp()
  const handlePrint = (event: React.MouseEvent<HTMLButtonElement>) => {
    const scope = event.currentTarget.closest('[data-slot="dialog-content"], [role="dialog"]') ?? document
    const area = scope.querySelector<HTMLElement>('.print-area')
    if (area) printElement(area, title)
    else window.print()
  }
  return (
    <Button onClick={handlePrint} className="no-print">
      <Printer aria-hidden="true" />
      {t.print}
    </Button>
  )
}

function HotelPaymentList({ reservation }: { reservation: Reservation }) {
  const { t, lang, hotelById } = useApp()
  const payments = stayPayments(reservation)
  const total = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0)

  return (
    <section className="mt-4 flex flex-col gap-2.5" aria-label={t.stayPayments}>
      <h3 className="text-sm font-semibold">{t.stayPayments}</h3>
      <ol className="flex flex-col gap-2.5">
        {payments.map((p, index) => {
          const hotel = hotelById(p.stay.hotelId)
          const bank = hotel?.bank
          return (
            <li key={p.stay.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed pb-2">
                <span className="text-sm font-semibold">
                  <span className="font-mono text-muted-foreground">{index + 1}. </span>
                  {cityLabel(p.stay.city, lang)} · {hotel?.nameEs ?? t.unassigned}
                </span>
                {p.paid && (
                  <span className="rounded bg-success/10 px-1.5 py-0.5 text-[11px] font-semibold text-success">{t.paid}</span>
                )}
              </div>
              <dl>
                <DocRow
                  label={t.amountDue}
                  value={<span className="font-mono text-base font-bold text-primary">{formatEUR(p.amount, lang)}</span>}
                />
                <DocRow
                  label={t.payBefore}
                  value={
                    <span className={cn('font-mono font-bold', !p.paid && 'text-destructive')}>
                      {formatDate(p.limit, lang)}
                    </span>
                  }
                />
                <DocRow
                  label={t.bankInfo}
                  value={
                    bank?.iban ? (
                      <span className="flex flex-col gap-0.5 text-xs">
                        <span>
                          {bank.bankName} · {bank.holder}
                        </span>
                        <span className="font-mono text-sm tracking-wide">{bank.iban}</span>
                        {bank.bic && <span className="font-mono text-muted-foreground">BIC {bank.bic}</span>}
                      </span>
                    ) : (
                      <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-semibold text-destructive">
                        {t.bankMissing}
                      </span>
                    )
                  }
                />
              </dl>
            </li>
          )
        })}
      </ol>
      {payments.length > 1 && (
        <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm">
          <span className="font-medium">{t.totalAmount}</span>
          <span className="font-mono text-lg font-bold text-primary">{formatEUR(total, lang)}</span>
        </div>
      )}
    </section>
  )
}

export function DocumentDialog({
  reservation,
  kind,
  onOpenChange,
}: {
  reservation: Reservation | null
  kind: DocumentKind
  onOpenChange: (open: boolean) => void
}) {
  const { t, lang, hotelById, agencyName } = useApp()
  const download = useAttachmentDownload()
  if (!reservation) return null
  const stays = getStays(reservation)
  const nights = stays.reduce((sum, s) => sum + nightsBetween(s.checkIn, s.checkOut), 0)
  const { single, twin, triple } = reservation.rooms

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="no-print">
          <DialogTitle>{kind === 'voucher' ? t.voucher : t.paymentNotice}</DialogTitle>
          <DialogDescription className="font-mono">{reservation.id}</DialogDescription>
        </DialogHeader>

        <div className="print-area rounded-lg border bg-card p-5">
          <DocHeader
            title={kind === 'voucher' ? 'Hotel Voucher · 호텔 확정서' : 'Payment Notice · 결제 안내서'}
            subtitle={agencyName(reservation.agencyId)}
          />
          <dl className="mt-4">
            <DocRow label={t.reference} value={<span className="font-mono">{reservation.id}</span>} />
            <DocRow label={t.groupName} value={reservation.groupName} />
            <DocRow
              label={t.itinerary}
              value={
                <ol className="flex flex-col gap-1">
                  {stays.map((stay, index) => {
                    const hotel = hotelById(stay.hotelId)
                    const stayRequests = kind === 'voucher' ? stayRequestLabels(stay, lang) : []
                    return (
                      <li key={stay.id}>
                        <span className="font-mono text-muted-foreground">{index + 1}. </span>
                        {cityLabel(stay.city, lang)} · {hotel ? `${hotel.nameEs} · ${hotel.stars}★` : `${t.unassigned} · ${stay.stars}★`}
                        <span className="block font-mono text-xs text-muted-foreground">
                          {formatDate(stay.checkIn, lang)} – {formatDate(stay.checkOut, lang)} (
                          {nightsBetween(stay.checkIn, stay.checkOut)}
                          {t.nightsUnit})
                        </span>
                        {stayRequests.length > 0 && (
                          <span className="mt-1 block rounded bg-warning/15 px-2 py-1 text-xs font-normal">
                            <span className="font-semibold">{t.requests}: </span>
                            {stayRequests.join(', ')}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ol>
              }
            />
            <DocRow
              label={`${t.checkIn} / ${t.checkOut}`}
              value={`${formatDate(reservation.checkIn, lang)} – ${formatDate(reservation.checkOut, lang)} (${nights}${t.nightsUnit})`}
            />
            <DocRow
              label={t.guests}
              value={`Single ${single} · Twin ${twin} · Triple ${triple} = ${totalRooms(reservation.rooms)}${t.roomsUnit}`}
            />
            <DocRow label={t.board} value={reservation.breakfast ? t.boardBB : t.boardRO} />
            {kind === 'voucher' && reservation.requests?.trim() && (
              <DocRow label={t.commonRequests} value={reservation.requests} />
            )}
          </dl>
          {kind === 'payment' && <HotelPaymentList reservation={reservation} />}
          <p className="mt-4 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            {kind === 'voucher' ? t.voucherNote : t.paymentWarning}
          </p>
        </div>

        <div className="no-print flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {kind === 'voucher' && reservation.voucherFile && (
            <Button
              variant="outline"
              onClick={() => reservation.voucherFile && download(reservation.voucherFile)}
            >
              <Download aria-hidden="true" />
              {t.originalVoucher}
            </Button>
          )}
          <PrintButton />
        </div>
      </DialogContent>
    </Dialog>
  )
}
