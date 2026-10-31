'use client'

import { useState } from 'react'
import { FileCheck2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cityLabel } from '@/lib/i18n'
import {
  addDays,
  formatEUR,
  formatFileSize,
  formatShortDate,
  getStays,
  negotiatedTotal,
  nightsBetween,
  roomNights,
} from '@/lib/format'
import { useApp } from '@/lib/store'
import type { AttachedFile, Reservation } from '@/lib/types'

export function ConfirmDialog({ reservation, onClose }: { reservation: Reservation; onClose: () => void }) {
  const { t, lang, hotels, updateReservation } = useApp()
  const [stays, setStays] = useState(() => getStays(reservation))
  const [amount, setAmount] = useState(() => {
    if (reservation.finalAmount) return reservation.finalAmount.toString()
    const total = negotiatedTotal(reservation)
    return total > 0 ? (Math.round(total * 100) / 100).toString() : ''
  })
  const [limit, setLimit] = useState(reservation.paymentLimit ?? addDays(new Date(), 7))
  const [voucher, setVoucher] = useState<AttachedFile | undefined>(reservation.voucherFile)
  const [error, setError] = useState<string | null>(null)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const value = Number(amount)
    if (stays.some((s) => !s.hotelId)) return setError(t.errHotel)
    if (!amount || Number.isNaN(value) || value <= 0) return setError(t.errAmount)
    if (!limit) return setError(t.errLimit)
    updateReservation(reservation.id, {
      status: 'confirmed',
      stays,
      hotelId: stays[0].hotelId,
      finalAmount: Math.round(value * 100) / 100,
      paymentLimit: limit,
      voucherFile: voucher,
    })
    toast.success(t.confirmedToast, { description: reservation.id })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.confirmTitle}</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{reservation.id}</span> · {reservation.groupName} · {roomNights(reservation)}{' '}
            {t.roomNights}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="flex flex-col gap-4" noValidate>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">{t.assignHotel} *</legend>
            {stays.map((stay, index) => {
              const hotelItems = hotels
                .filter((h) => h.city === stay.city)
                .sort((a, b) => Number(b.stars === stay.stars) - Number(a.stars === stay.stars))
                .map((h) => ({ value: h.id, label: `${h.nameEs} · ${h.stars}★ · ${formatEUR(h.feeRate, lang)}/RN` }))
              const id = `confirm-hotel-${stay.id}`
              return (
                <div key={stay.id} className="flex flex-col gap-1 rounded-lg border bg-muted/40 p-2.5">
                  <Label htmlFor={id} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                    <span className="font-mono text-primary">{index + 1}</span>
                    {cityLabel(stay.city, lang)}
                    <span className="font-mono font-normal text-muted-foreground">
                      {formatShortDate(stay.checkIn, lang)} → {formatShortDate(stay.checkOut, lang)} ·{' '}
                      {nightsBetween(stay.checkIn, stay.checkOut)}
                      {t.nightsUnit} · {stay.stars}★
                    </span>
                  </Label>
                  <Select
                    items={hotelItems}
                    value={stay.hotelId ?? null}
                    onValueChange={(v) =>
                      v && setStays((prev) => prev.map((s) => (s.id === stay.id ? { ...s, hotelId: v as string } : s)))
                    }
                  >
                    <SelectTrigger id={id} className="w-full bg-background">
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
                </div>
              )
            })}
          </fieldset>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="final-amount">{t.finalAmount} *</Label>
              <Input
                id="final-amount"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="font-mono"
                placeholder="0.00"
                aria-describedby="final-amount-hint"
              />
              <p id="final-amount-hint" className="text-[11px] text-muted-foreground">
                {t.finalAmountHint}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payment-limit">{t.paymentLimit} *</Label>
              <Input
                id="payment-limit"
                type="date"
                value={limit}
                max={reservation.checkIn}
                onChange={(e) => setLimit(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
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
