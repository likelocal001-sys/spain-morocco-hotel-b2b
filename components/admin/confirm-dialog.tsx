'use client'

import { useState } from 'react'
import { AlertTriangle, FileCheck2, Landmark, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cityLabel } from '@/lib/i18n'
import {
  defaultStayLimit,
  formatEUR,
  formatFileSize,
  formatShortDate,
  nightsBetween,
  paymentPatch,
  roomNights,
  stayPayments,
} from '@/lib/format'
import { useApp } from '@/lib/store'
import type { AttachedFile, Hotel, Reservation, Stay } from '@/lib/types'

interface StayDraft {
  stay: Stay
  amount: string
  limit: string
  limitTouched: boolean
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function ConfirmDialog({ reservation, onClose }: { reservation: Reservation; onClose: () => void }) {
  const { t, lang, hotels, hotelById, updateReservation } = useApp()
  const [drafts, setDrafts] = useState<StayDraft[]>(() =>
    stayPayments(reservation).map((p) => ({
      stay: p.stay,
      amount: p.amount ? round2(p.amount).toString() : '',
      limit:
        reservation.negotiation?.[p.stay.id]?.paymentLimit ??
        defaultStayLimit(p.stay.checkIn, hotelById(p.stay.hotelId)?.paymentDaysBefore),
      limitTouched: Boolean(reservation.negotiation?.[p.stay.id]?.paymentLimit),
    })),
  )
  const [voucher, setVoucher] = useState<AttachedFile | undefined>(reservation.voucherFile)
  const [error, setError] = useState<string | null>(null)

  const total = drafts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0)

  function patchDraft(stayId: string, patch: Partial<StayDraft>) {
    setDrafts((prev) => prev.map((d) => (d.stay.id === stayId ? { ...d, ...patch } : d)))
  }

  function selectHotel(draft: StayDraft, hotelId: string) {
    const hotel = hotelById(hotelId)
    patchDraft(draft.stay.id, {
      stay: { ...draft.stay, hotelId },
      ...(draft.limitTouched ? {} : { limit: defaultStayLimit(draft.stay.checkIn, hotel?.paymentDaysBefore) }),
    })
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (drafts.some((d) => !d.stay.hotelId)) return setError(t.errHotel)
    if (drafts.some((d) => !(Number(d.amount) > 0))) return setError(t.errAmount)
    if (drafts.some((d) => !d.limit)) return setError(t.errLimit)

    const stays = drafts.map((d) => d.stay)
    const changes = Object.fromEntries(
      drafts.map((d) => [d.stay.id, { amount: round2(Number(d.amount)), paymentLimit: d.limit }]),
    )
    const next = { ...reservation, stays }
    const earliest = drafts.map((d) => d.limit).sort()[0]
    updateReservation(reservation.id, {
      status: 'confirmed',
      stays,
      hotelId: stays[0].hotelId,
      finalAmount: round2(total),
      paymentLimit: earliest,
      voucherFile: voucher,
      ...paymentPatch(next, changes),
    })
    toast.success(t.confirmedToast, { description: reservation.id })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t.confirmTitle}</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{reservation.id}</span> · {reservation.groupName} · {roomNights(reservation)}{' '}
            {t.roomNights}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="flex flex-col gap-4" noValidate>
          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-1 text-sm font-medium">{t.perHotelPayment} *</legend>
            {drafts.map((draft, index) => (
              <StayPaymentRow
                key={draft.stay.id}
                index={index}
                draft={draft}
                hotels={hotels}
                hotel={hotelById(draft.stay.hotelId)}
                onHotel={(id) => selectHotel(draft, id)}
                onAmount={(amount) => patchDraft(draft.stay.id, { amount })}
                onLimit={(limit) => patchDraft(draft.stay.id, { limit, limitTouched: true })}
              />
            ))}
            {drafts.length > 1 && (
              <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm">
                <span className="font-medium">{t.totalAmount}</span>
                <span className="font-mono text-base font-bold text-primary">{formatEUR(total, lang)}</span>
              </div>
            )}
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t.voucherUpload}</span>
            {voucher ? (
              <div className="flex items-center gap-3 rounded-lg border bg-secondary/60 px-3 py-2">
                <FileCheck2 className="size-5 text-primary" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{voucher.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(voucher.size)}</p>
                </div>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t.removeFile} onClick={() => setVoucher(undefined)}>
                  <X />
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-input px-4 py-4 text-sm font-medium text-primary transition-colors hover:border-primary hover:bg-secondary/40">
                <Upload className="size-4" aria-hidden="true" />
                {t.chooseFile} (.pdf)
                <input
                  type="file"
                  accept=".pdf,image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setVoucher({ name: file.name, size: file.size, url: URL.createObjectURL(file) })
                  }}
                />
              </label>
            )}
          </div>
          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              {t.cancel}
            </Button>
            <Button type="submit">{t.save}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StayPaymentRow({
  index,
  draft,
  hotels,
  hotel,
  onHotel,
  onAmount,
  onLimit,
}: {
  index: number
  draft: StayDraft
  hotels: Hotel[]
  hotel?: Hotel
  onHotel: (id: string) => void
  onAmount: (v: string) => void
  onLimit: (v: string) => void
}) {
  const { t, lang } = useApp()
  const { stay } = draft
  const hotelItems = hotels
    .filter((h) => h.city === stay.city)
    .sort((a, b) => Number(b.stars === stay.stars) - Number(a.stars === stay.stars))
    .map((h) => ({ value: h.id, label: `${h.nameEs} · ${h.stars}★` }))
  const base = `confirm-${stay.id}`

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
      <Label htmlFor={`${base}-hotel`} className="flex flex-wrap items-baseline gap-x-2 text-xs">
        <span className="font-mono text-primary">{index + 1}</span>
        {cityLabel(stay.city, lang)}
        <span className="font-mono font-normal text-muted-foreground">
          {formatShortDate(stay.checkIn, lang)} → {formatShortDate(stay.checkOut, lang)} ·{' '}
          {nightsBetween(stay.checkIn, stay.checkOut)}
          {t.nightsUnit} · {stay.stars}★
        </span>
      </Label>
      <Select items={hotelItems} value={stay.hotelId ?? null} onValueChange={(v) => v && onHotel(v as string)}>
        <SelectTrigger id={`${base}-hotel`} className="w-full bg-background">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {hotelItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hotel && (
        <p
          className={
            hotel.bank?.iban
              ? 'flex items-center gap-1.5 text-[11px] text-muted-foreground'
              : 'flex items-center gap-1.5 text-[11px] font-semibold text-destructive'
          }
        >
          {hotel.bank?.iban ? (
            <>
              <Landmark className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {hotel.bank.bankName} · <span className="font-mono">{hotel.bank.iban}</span>
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
              {t.bankMissing}
            </>
          )}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${base}-amount`} className="text-xs text-muted-foreground">
            {t.stayAmount}
          </Label>
          <Input
            id={`${base}-amount`}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={draft.amount}
            onChange={(e) => onAmount(e.target.value)}
            className="bg-background font-mono"
            placeholder="0.00"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${base}-limit`} className="text-xs text-muted-foreground">
            {t.paymentLimit}
          </Label>
          <Input
            id={`${base}-limit`}
            type="date"
            value={draft.limit}
            max={stay.checkIn}
            onChange={(e) => onLimit(e.target.value)}
            className="bg-background font-mono"
            aria-describedby={`${base}-limit-hint`}
          />
        </div>
      </div>
      <p id={`${base}-limit-hint`} className="text-[11px] text-muted-foreground">
        {t.autoLimitHint}
        {hotel?.paymentDaysBefore !== undefined && ` (D-${hotel.paymentDaysBefore})`}
      </p>
    </div>
  )
}
