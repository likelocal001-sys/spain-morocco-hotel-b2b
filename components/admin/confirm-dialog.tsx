'use client'

import { useState } from 'react'
import { FileCheck2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { addDays, formatEUR, formatFileSize, roomNights } from '@/lib/format'
import { useApp } from '@/lib/store'
import type { AttachedFile, Reservation } from '@/lib/types'

export function ConfirmDialog({ reservation, onClose }: { reservation: Reservation; onClose: () => void }) {
  const { t, lang, hotels, updateReservation } = useApp()
  const [hotelId, setHotelId] = useState(reservation.hotelId ?? '')
  const [amount, setAmount] = useState(reservation.finalAmount?.toString() ?? '')
  const [limit, setLimit] = useState(reservation.paymentLimit ?? addDays(new Date(), 7))
  const [voucher, setVoucher] = useState<AttachedFile | undefined>(reservation.voucherFile)
  const [error, setError] = useState<string | null>(null)

  const cityHotels = hotels.filter((h) => h.city === reservation.city)
  const hotelItems = cityHotels.map((h) => ({ value: h.id, label: `${h.nameEs} · ${h.stars}★ · ${formatEUR(h.feeRate, lang)}/RN` }))

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const value = Number(amount)
    if (!hotelId) return setError(t.errHotel)
    if (!amount || Number.isNaN(value) || value <= 0) return setError(t.errAmount)
    if (!limit) return setError(t.errLimit)
    updateReservation(reservation.id, {
      status: 'confirmed',
      hotelId,
      finalAmount: Math.round(value * 100) / 100,
      paymentLimit: limit,
      voucherFile: voucher,
    })
    toast.success(t.confirmedToast, { description: reservation.id })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.confirmTitle}</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{reservation.id}</span> · {reservation.groupName} · {roomNights(reservation)}{' '}
            {t.roomNights}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-hotel">{t.assignHotel} *</Label>
            <Select items={hotelItems} value={hotelId || null} onValueChange={(v) => v && setHotelId(v as string)}>
              <SelectTrigger id="confirm-hotel" className="w-full">
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
              />
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
