'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, FileCheck2, Landmark, Upload, Wand2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { uploadAttachment, validateAttachment } from '@/lib/attachments'
import { cityLabel } from '@/lib/i18n'
import {
  defaultStayLimit,
  formatEUR,
  formatFileSize,
  formatShortDate,
  nightsBetween,
  paymentPatch,
  roomNights,
  stayEstimateBreakdown,
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

type AmountCheck =
  | { kind: 'match'; estimate: number }
  | { kind: 'mismatch'; estimate: number; diff: number }
  | { kind: 'incomplete'; estimate: number }
  | { kind: 'none' }

/**
 * Compares the amount typed for a stay with the negotiated estimate (rate x rooms x nights).
 * "incomplete" means some booked room types still have no negotiated rate.
 */
function checkAmount(reservation: Reservation, stay: Stay, amount: number): AmountCheck {
  const b = stayEstimateBreakdown(reservation, stay)
  if (b.total <= 0) return { kind: 'none' }
  if (b.missing.length) return { kind: 'incomplete', estimate: b.total }
  const diff = round2(amount - b.total)
  return Math.abs(diff) < 0.01 ? { kind: 'match', estimate: b.total } : { kind: 'mismatch', estimate: b.total, diff }
}

/** Saved amount wins (editing a confirmation); otherwise start from the negotiated estimate. */
function initialAmount(reservation: Reservation, stay: Stay, fallback?: number) {
  const saved = reservation.negotiation?.[stay.id]?.amount ?? (reservation.status === 'confirmed' ? fallback : undefined)
  const amount = saved ?? (stayEstimateBreakdown(reservation, stay).total || fallback)
  return amount ? round2(amount).toString() : ''
}

/** Hotel picked in the confirm dialog differs from the one whose rates were negotiated. */
function negotiatedHotelChanged(reservation: Reservation, stay: Stay) {
  const original = reservation.stays?.find((s) => s.id === stay.id)?.hotelId ?? reservation.hotelId
  return Boolean(original && stay.hotelId && original !== stay.hotelId && stayEstimateBreakdown(reservation, stay).total > 0)
}

export function ConfirmDialog({ reservation: initial, onClose }: { reservation: Reservation; onClose: () => void }) {
  const { t, lang, hotels, hotelById, reservations, updateReservation } = useApp()
  // Read the latest copy: rates may have been edited in the negotiation workspace just before opening.
  const reservation = reservations.find((r) => r.id === initial.id) ?? initial
  const [drafts, setDrafts] = useState<StayDraft[]>(() =>
    stayPayments(reservation).map((p) => ({
      stay: p.stay,
      amount: initialAmount(reservation, p.stay, p.amount),
      limit:
        reservation.negotiation?.[p.stay.id]?.paymentLimit ??
        defaultStayLimit(p.stay.checkIn, hotelById(p.stay.hotelId)?.paymentDaysBefore),
      limitTouched: Boolean(reservation.negotiation?.[p.stay.id]?.paymentLimit),
    })),
  )
  const [voucher, setVoucher] = useState<AttachedFile | undefined>(reservation.voucherFile)
  const [error, setError] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [uploading, setUploading] = useState(false)

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
    setError(null)
    setReviewing(true)
  }

  function commit() {
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
        {reviewing ? (
          <ReviewStep
            reservation={reservation}
            drafts={drafts}
            total={total}
            hasVoucher={Boolean(voucher)}
            onBack={() => setReviewing(false)}
            onConfirm={commit}
          />
        ) : (
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
                reservation={reservation}
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
                {uploading ? t.uploading : `${t.chooseFile} (${t.voucherHint})`}
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="sr-only"
                  disabled={uploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (!file) return
                    const problem = validateAttachment(file, 'voucher')
                    if (problem) {
                      setError(problem === 'type' ? t.errVoucherFile : t.errFileSize)
                      return
                    }
                    setUploading(true)
                    setError(null)
                    try {
                      setVoucher(await uploadAttachment(file, 'voucher'))
                    } catch {
                      setError(t.uploadFailed)
                    } finally {
                      setUploading(false)
                    }
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
            <Button type="submit" disabled={uploading}>{t.save}</Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ReviewStep({
  reservation,
  drafts,
  total,
  hasVoucher,
  onBack,
  onConfirm,
}: {
  reservation: Reservation
  drafts: StayDraft[]
  total: number
  hasVoucher: boolean
  onBack: () => void
  onConfirm: () => void
}) {
  const { t, lang, hotelById } = useApp()
  const [acknowledged, setAcknowledged] = useState(false)
  const checks = drafts.map((d) => checkAmount(reservation, d.stay, round2(Number(d.amount))))
  const hotelChanged = drafts.map((d) => negotiatedHotelChanged(reservation, d.stay))
  const needsAck = checks.some((c) => c.kind !== 'match') || hotelChanged.some(Boolean)
  const estimatedTotal = round2(checks.reduce((sum, c) => sum + (c.kind === 'none' ? 0 : c.estimate), 0))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold">{t.reviewTitle}</h3>
        <p className="text-xs text-muted-foreground text-pretty">{t.reviewDesc}</p>
      </div>
      <ul className="flex flex-col divide-y rounded-lg border">
        {drafts.map((d, index) => {
          const amount = round2(Number(d.amount))
          return (
            <li key={d.stay.id} className="flex flex-col gap-1 p-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">
                  <span className="mr-1.5 font-mono text-primary">{index + 1}</span>
                  {hotelById(d.stay.hotelId)?.nameEs}
                </span>
                <span className="font-mono font-semibold">{formatEUR(amount, lang)}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="font-mono">
                  {formatShortDate(d.stay.checkIn, lang)} → {formatShortDate(d.stay.checkOut, lang)} · {t.paymentLimit}{' '}
                  {formatShortDate(d.limit, lang)}
                </span>
                <AmountCheckBadge check={checks[index]} />
              </div>
              {hotelChanged[index] && (
                <p className="flex items-center gap-1 text-xs font-medium text-destructive">
                  <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
                  {t.hotelChangedWarn}
                </p>
              )}
            </li>
          )
        })}
      </ul>
      <dl className="flex flex-col gap-1 rounded-lg bg-secondary px-3 py-2 text-sm">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <dt>{t.estimatedTotal}</dt>
          <dd className="font-mono">{estimatedTotal > 0 ? formatEUR(estimatedTotal, lang) : '—'}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="font-medium">{t.totalAmount}</dt>
          <dd className="font-mono text-base font-bold text-primary">{formatEUR(total, lang)}</dd>
        </div>
      </dl>
      {needsAck ? (
        <Label className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs font-normal leading-relaxed">
          <Checkbox checked={acknowledged} onCheckedChange={(checked) => setAcknowledged(checked)} className="mt-0.5" />
          {t.ackAmountMismatch}
        </Label>
      ) : (
        <p className="flex items-center gap-1.5 rounded-md bg-success/10 px-3 py-2 text-xs font-medium text-success">
          <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
          {t.allAmountsMatch}
        </p>
      )}
      {!hasVoucher && (
        <p className="flex items-center gap-1.5 rounded-md bg-warning/15 px-3 py-2 text-xs text-warning-foreground">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
          {t.voucherMissingWarn}
        </p>
      )}
      <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onBack}>
          {t.backToEdit}
        </Button>
        <Button type="button" onClick={onConfirm} disabled={needsAck && !acknowledged}>
          {t.confirmFinal}
        </Button>
      </div>
    </div>
  )
}

function StayPaymentRow({
  index,
  draft,
  hotels,
  hotel,
  reservation,
  onHotel,
  onAmount,
  onLimit,
}: {
  index: number
  draft: StayDraft
  hotels: Hotel[]
  hotel?: Hotel
  reservation: Reservation
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
      <EstimateCheck reservation={reservation} stay={stay} amount={draft.amount} onApply={onAmount} />
      <p id={`${base}-limit-hint`} className="text-[11px] text-muted-foreground">
        {t.autoLimitHint}
        {hotel?.paymentDaysBefore !== undefined && ` (D-${hotel.paymentDaysBefore})`}
      </p>
    </div>
  )
}

function AmountCheckBadge({ check }: { check: AmountCheck }) {
  const { t, lang } = useApp()
  if (check.kind === 'match')
    return (
      <span className="flex items-center gap-1 font-medium text-success">
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
        {t.amountMatches}
      </span>
    )
  if (check.kind === 'mismatch')
    return (
      <span className="flex items-center gap-1 font-medium text-destructive">
        <AlertTriangle className="size-3.5" aria-hidden="true" />
        {t.amountMismatch} · {formatEUR(check.estimate, lang)} ({check.diff > 0 ? '+' : ''}
        {formatEUR(check.diff, lang)})
      </span>
    )
  if (check.kind === 'incomplete')
    return (
      <span className="flex items-center gap-1 font-medium text-warning-foreground">
        <AlertTriangle className="size-3.5" aria-hidden="true" />
        {t.estimateIncomplete}
      </span>
    )
  return <span className="text-warning-foreground">{t.noEstimate}</span>
}

function EstimateCheck({
  reservation,
  stay,
  amount,
  onApply,
}: {
  reservation: Reservation
  stay: Stay
  amount: string
  onApply: (amount: string) => void
}) {
  const { t, lang } = useApp()
  const b = stayEstimateBreakdown(reservation, stay)
  const check = checkAmount(reservation, stay, round2(Number(amount)))

  return (
    <div className="flex flex-col gap-1 rounded-md bg-background px-2.5 py-2 text-[11px]">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="font-medium">{t.estimate}</span>
        <AmountCheckBadge check={check} />
      </div>
      {b.total > 0 && (
        <p className="font-mono tabular-nums text-muted-foreground">
          (
          {b.lines.map((l, i) => (
            <span key={l.type}>
              {i > 0 && ' + '}
              <span className={l.rate == null ? 'text-warning-foreground' : undefined}>
                {l.rate == null ? '?' : formatEUR(l.rate, lang)} × {l.rooms} {l.type}
              </span>
            </span>
          ))}
          ) × {b.nights}
          {t.nightsUnit} = <span className="font-semibold text-foreground">{formatEUR(b.total, lang)}</span>
        </p>
      )}
      {negotiatedHotelChanged(reservation, stay) && (
        <p className="flex items-center gap-1 font-medium text-destructive">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
          {t.hotelChangedWarn}
        </p>
      )}
      {check.kind === 'mismatch' && (
        <Button type="button" size="xs" variant="outline" className="self-start" onClick={() => onApply(b.total.toFixed(2))}>
          <Wand2 aria-hidden="true" />
          {t.applyEstimate}
        </Button>
      )}
    </div>
  )
}
