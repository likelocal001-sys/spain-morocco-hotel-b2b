'use client'

import { Download, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CITY_LABELS, REQUEST_TAG_LABELS } from '@/lib/i18n'
import { formatDate, formatEUR, nightsBetween, toISODate, totalRooms } from '@/lib/format'
import { useApp } from '@/lib/store'
import type { Reservation } from '@/lib/types'

export type DocumentKind = 'voucher' | 'payment'

export function DocRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 border-b border-dashed py-2 text-sm last:border-0">
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

export function PrintButton() {
  const { t } = useApp()
  return (
    <Button onClick={() => window.print()} className="no-print">
      <Printer aria-hidden="true" />
      {t.print}
    </Button>
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
  if (!reservation) return null
  const hotel = hotelById(reservation.hotelId)
  const nights = nightsBetween(reservation.checkIn, reservation.checkOut)
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
              label={t.hotel}
              value={hotel ? `${hotel.nameEs} · ${hotel.stars}★` : t.unassigned}
            />
            <DocRow label={t.city} value={CITY_LABELS[reservation.city][lang]} />
            <DocRow
              label={`${t.checkIn} / ${t.checkOut}`}
              value={`${formatDate(reservation.checkIn, lang)} – ${formatDate(reservation.checkOut, lang)} (${nights}${t.nightsUnit})`}
            />
            <DocRow
              label={t.guests}
              value={`Single ${single} · Twin ${twin} · Triple ${triple} = ${totalRooms(reservation.rooms)}${t.roomsUnit}`}
            />
            <DocRow label={t.board} value={reservation.breakfast ? t.boardBB : t.boardRO} />
            {kind === 'voucher' && (reservation.requestTags.length > 0 || reservation.requests) && (
              <DocRow
                label={t.requests}
                value={[...reservation.requestTags.map((tag) => REQUEST_TAG_LABELS[tag][lang]), reservation.requests]
                  .filter(Boolean)
                  .join(', ')}
              />
            )}
            {kind === 'payment' && (
              <>
                <DocRow
                  label={t.amountDue}
                  value={<span className="text-lg font-bold text-primary">{formatEUR(reservation.finalAmount, lang)}</span>}
                />
                <DocRow
                  label={t.payBefore}
                  value={<span className="font-mono font-bold text-destructive">{formatDate(reservation.paymentLimit, lang)}</span>}
                />
                <DocRow label={t.bankInfo} value={<span className="font-mono text-xs">ES91 2100 0418 4502 0005 1332 · CAIXESBBXXX</span>} />
              </>
            )}
          </dl>
          <p className="mt-4 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            {kind === 'voucher' ? t.voucherNote : t.paymentWarning}
          </p>
        </div>

        <div className="no-print flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {kind === 'voucher' && reservation.voucherFile && (
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <a
                  href={reservation.voucherFile.url ?? '#'}
                  download={reservation.voucherFile.name}
                  aria-disabled={!reservation.voucherFile.url}
                  onClick={(e) => !reservation.voucherFile?.url && e.preventDefault()}
                />
              }
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
