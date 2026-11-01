'use client'

import { useState } from 'react'
import { BadgeCheck, Check, ChevronDown, ChevronsDownUp, ChevronsUpDown, Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/reservation-cells'
import { StayRequestsBox } from '@/components/stay-request-tags'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  blockProgress,
  formatEUR,
  formatShortDate,
  getStays,
  isBlockSecured,
  negotiationProgress,
  nightsBetween,
  totalRooms,
} from '@/lib/format'
import {
  GROUP_CHECK_LABELS,
  GROUP_CHECKS,
  NEGOTIATION_STEP_LABELS,
  NEGOTIATION_STEPS,
  cityLabel,
} from '@/lib/i18n'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import type {
  GroupCheck,
  NegotiationStep,
  Reservation,
  RoomCounts,
  RoomType,
  Stay,
  StayNegotiation,
} from '@/lib/types'
import { RevisionPanel } from './revision-panel'

const ROOM_TYPES: { key: RoomType; label: string }[] = [
  { key: 'single', label: 'Single' },
  { key: 'twin', label: 'Twin' },
  { key: 'triple', label: 'Triple' },
]

interface Props {
  reservationId: string
  onClose: () => void
  onConfirm: (r: Reservation) => void
  onEmail: (r: Reservation) => void
}

function toggle<T>(list: T[], item: T, on: boolean) {
  return on ? (list.includes(item) ? list : [...list, item]) : list.filter((x) => x !== item)
}

export function NegotiationWorkspace({ reservationId, onClose, onConfirm, onEmail }: Props) {
  const { t, lang, reservations, agencyName, updateReservation, hotelById } = useApp()
  const r = reservations.find((x) => x.id === reservationId)
  const [openIds, setOpenIds] = useState<Set<string>>(() =>
    r ? new Set(getStays(r).filter((s) => !isBlockSecured(r, s.id)).map((s) => s.id)) : new Set(),
  )
  if (!r) return null

  const stays = getStays(r)
  const progress = negotiationProgress(r)
  const blocks = blockProgress(r)

  function toggleStay(stayId: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(stayId)) next.delete(stayId)
      else next.add(stayId)
      return next
    })
  }
  const rooms = totalRooms(r.rooms)
  const nights = stays.reduce((sum, s) => sum + nightsBetween(s.checkIn, s.checkOut), 0)

  function save(patch: Partial<Reservation>, startsWork = false) {
    if (!r) return
    updateReservation(r.id, startsWork && r.status === 'pending' ? { ...patch, status: 'in_progress' } : patch)
  }

  function patchStay(stayId: string, changes: Partial<StayNegotiation>, startsWork = false) {
    if (!r) return
    const current = r.negotiation?.[stayId] ?? { steps: [] }
    save({ negotiation: { ...r.negotiation, [stayId]: { ...current, ...changes } } }, startsWork)
  }

  function assignHotel(stayId: string, hotelId: string | undefined) {
    if (!r) return
    const next = stays.map((s) => (s.id === stayId ? { ...s, hotelId } : s))
    const current = r.negotiation?.[stayId] ?? { steps: [] }
    const hasRates = current.rate != null || Object.values(current.rates ?? {}).some((v) => v != null)
    const hotelRates = hotelById(hotelId)?.rates
    const negotiation =
      !hasRates && hotelRates && Object.keys(hotelRates).length
        ? { ...r.negotiation, [stayId]: { ...current, rates: { ...hotelRates }, rate: undefined } }
        : r.negotiation
    save({ stays: next, hotelId: next[0].hotelId, negotiation })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2 pr-6">
            <DialogTitle className="text-lg">{r.groupName}</DialogTitle>
            <StatusBadge status={r.status} />
          </div>
          <DialogDescription className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs">
            <span>{r.id}</span>
            <span>{agencyName(r.agencyId)}</span>
            <span>
              {formatShortDate(r.checkIn, lang)} – {formatShortDate(r.checkOut, lang)} · {nights}
              {t.nightsUnit}
            </span>
            <span>
              {rooms} rooms (S{r.rooms.single} / T{r.rooms.twin} / Tr{r.rooms.triple})
            </span>
          </DialogDescription>
        </DialogHeader>

        <RevisionPanel reservation={r} />

        {r.requests.trim() && (
          <div className="flex flex-col gap-1 rounded-lg border border-warning/60 bg-warning/10 px-3 py-2.5">
            <span className="text-xs font-semibold text-warning-foreground">{t.agencyFreeRequests}</span>
            <p className="text-sm whitespace-pre-wrap">{r.requests}</p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">{t.progress}</span>
            <span className="font-mono tabular-nums text-muted-foreground">
              {progress.done}/{progress.total} {t.stepsDone} · {progress.percent}%
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label={t.progress}
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn('h-full rounded-full transition-all', progress.percent === 100 ? 'bg-success' : 'bg-primary')}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t.groupChecklist}</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {GROUP_CHECKS.map((check) => {
              const checked = r.groupChecks?.includes(check) ?? false
              return (
                <Label
                  key={check}
                  className={cn(
                    'cursor-pointer rounded-lg border px-3 py-2.5 text-xs font-normal transition-colors',
                    checked ? 'border-primary/30 bg-secondary' : 'hover:bg-muted/60',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(on) =>
                      save({ groupChecks: toggle<GroupCheck>(r.groupChecks ?? [], check, Boolean(on)) }, true)
                    }
                  />
                  <span className={cn(checked && 'text-muted-foreground line-through')}>
                    {GROUP_CHECK_LABELS[check][lang]}
                  </span>
                </Label>
              )
            })}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              {t.stayNegotiation}
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 font-mono text-[11px] font-normal tabular-nums',
                  blocks.all ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground',
                )}
              >
                {t.blocksStatus} {blocks.secured}/{blocks.total}
              </span>
            </h3>
            <div className="flex gap-1">
              <Button variant="ghost" size="xs" onClick={() => setOpenIds(new Set(stays.map((s) => s.id)))}>
                <ChevronsUpDown aria-hidden="true" />
                {t.expandAll}
              </Button>
              <Button variant="ghost" size="xs" onClick={() => setOpenIds(new Set())}>
                <ChevronsDownUp aria-hidden="true" />
                {t.collapseAll}
              </Button>
            </div>
          </div>
          <ol className="flex flex-col gap-3">
            {stays.map((stay, index) => (
              <StayCard
                key={stay.id}
                index={index}
                stay={stay}
                open={openIds.has(stay.id)}
                onToggle={() => toggleStay(stay.id)}
                rooms={r.rooms}
                negotiation={r.negotiation?.[stay.id] ?? { steps: [] }}
                onPatch={(changes, startsWork) => patchStay(stay.id, changes, startsWork)}
                onAssignHotel={(hotelId) => assignHotel(stay.id, hotelId)}
              />
            ))}
          </ol>
        </section>

        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            {t.close}
          </Button>
          {r.status !== 'cancelled' && (
            <Button variant="outline" onClick={() => onEmail(r)}>
              <Mail aria-hidden="true" />
              {t.spanishEmail}
            </Button>
          )}
          {(r.status === 'pending' || r.status === 'in_progress') &&
            (blocks.all ? (
              <Button onClick={() => onConfirm(r)}>
                <BadgeCheck aria-hidden="true" />
                {t.finalComplete}
              </Button>
            ) : (
              <p className="flex items-center justify-center rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground sm:order-first sm:mr-auto">
                {t.allBlocksHint} ({blocks.secured}/{blocks.total})
              </p>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StayCard({
  index,
  stay,
  open,
  onToggle,
  rooms,
  negotiation,
  onPatch,
  onAssignHotel,
}: {
  index: number
  stay: Stay
  open: boolean
  onToggle: () => void
  rooms: RoomCounts
  negotiation: StayNegotiation
  onPatch: (changes: Partial<StayNegotiation>, startsWork?: boolean) => void
  onAssignHotel: (hotelId: string | undefined) => void
}) {
  const { t, lang, hotels, hotelById } = useApp()
  const nights = nightsBetween(stay.checkIn, stay.checkOut)
  const hotel = hotelById(stay.hotelId)
  const cityHotels = hotels.filter((h) => h.city === stay.city)
  const hotelItems = [
    { value: 'none', label: t.hotelNone },
    ...cityHotels.map((h) => ({ value: h.id, label: `${h.nameEs} · ${h.stars}★` })),
  ]
  const done = negotiation.steps.length
  const rateFor = (type: RoomType) => negotiation.rates?.[type] ?? negotiation.rate
  const perNight = ROOM_TYPES.reduce((sum, { key }) => sum + (rateFor(key) ?? 0) * rooms[key], 0)
  const estimate = perNight > 0 ? perNight * nights : undefined
  const fieldId = `neg-${stay.id}`
  const secured = negotiation.steps.includes('optionHeld')

  return (
    <li
      className={cn(
        'flex flex-col rounded-xl border',
        secured ? 'border-success/40 bg-success/5' : 'bg-card',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`${fieldId}-body`}
        className="flex flex-wrap items-center justify-between gap-2 rounded-xl p-4 text-left transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs',
              secured ? 'bg-success text-white' : 'bg-primary text-primary-foreground',
            )}
          >
            {secured ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
          </span>
          <span className="text-sm font-semibold">{cityLabel(stay.city, lang)}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {formatShortDate(stay.checkIn, lang)} – {formatShortDate(stay.checkOut, lang)} · {nights}
            {t.nightsUnit} · {stay.stars}★
          </span>
          <span className="truncate text-xs font-medium">{hotel ? hotel.nameEs : t.hotelNone}</span>
        </span>
        <span className="flex items-center gap-2">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-medium',
              secured ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning-foreground',
            )}
          >
            {secured ? t.blockSecured : t.blockPending}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
            {done}/{NEGOTIATION_STEPS.length}
          </span>
          <ChevronDown
            className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')}
            aria-hidden="true"
          />
        </span>
      </button>

      {open && (
      <div id={`${fieldId}-body`} className="flex flex-col gap-3 px-4 pb-4">
      <StayRequestsBox tags={stay.requestTags ?? []} note={stay.requestNote} />

      <div className="grid gap-4 md:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${fieldId}-hotel`} className="text-xs">
              {t.negotiationHotel}
            </Label>
            <Select
              items={hotelItems}
              value={stay.hotelId ?? 'none'}
              onValueChange={(v) => v && onAssignHotel(v === 'none' ? undefined : (v as string))}
            >
              <SelectTrigger id={`${fieldId}-hotel`} className="w-full">
                <SelectValue />
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

          <div className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-2.5">
            <span className="text-xs font-medium">{t.contacts}</span>
            {hotel?.contacts.length ? (
              <ul className="flex flex-col gap-1.5">
                {hotel.contacts.map((c) => (
                  <li key={c.id} className="flex flex-col gap-0.5 text-xs">
                    <span className="font-medium">{c.name}</span>
                    <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-primary">
                          <Mail className="size-3" aria-hidden="true" />
                          {c.email}
                        </a>
                      )}
                      {c.phone && (
                        <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 hover:text-primary">
                          <Phone className="size-3" aria-hidden="true" />
                          {c.phone}
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-xs text-muted-foreground">{t.noContacts}</span>
            )}
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">{t.ratesByType}</legend>
            <div className="flex items-center justify-between gap-2">
              <span aria-hidden="true" className="text-xs font-medium">
                {t.ratesByType}
              </span>
              {hotel?.rates && Object.keys(hotel.rates).length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    onPatch({ rates: { ...hotel.rates }, rate: undefined })
                    toast.success(t.hotelRatesApplied)
                  }}
                >
                  {t.applyHotelRates}
                </Button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ROOM_TYPES.map(({ key, label }) => {
                const count = rooms[key]
                return (
                  <div key={key} className={cn('flex flex-col gap-1', count === 0 && 'opacity-50')}>
                    <Label htmlFor={`${fieldId}-rate-${key}`} className="flex justify-between text-[11px] font-normal">
                      {label}
                      <span className="font-mono text-muted-foreground">×{count}</span>
                    </Label>
                    <Input
                      id={`${fieldId}-rate-${key}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      placeholder="€"
                      value={rateFor(key) ?? ''}
                      onChange={(e) => {
                        const value = Number(e.target.value)
                        const next = { ...negotiation.rates, [key]: e.target.value && value >= 0 ? value : undefined }
                        onPatch({ rates: next, rate: undefined })
                      }}
                      className="h-8 font-mono"
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5 text-xs">
              <span className="font-medium">{t.estimate}</span>
              <span className="font-mono tabular-nums">
                {estimate ? (
                  <>
                    <span className="text-muted-foreground">
                      {formatEUR(perNight, lang)} × {nights}
                      {t.nightsUnit} ={' '}
                    </span>
                    <span className="font-semibold">{formatEUR(estimate, lang)}</span>
                  </>
                ) : (
                  '—'
                )}
              </span>
            </div>
          </fieldset>
        </div>

        <div className="flex flex-col gap-3">
          <fieldset className="flex flex-col gap-1.5">
            <legend className="sr-only">{t.stayNegotiation}</legend>
            {NEGOTIATION_STEPS.map((step, i) => {
              const checked = negotiation.steps.includes(step)
              return (
                <Label
                  key={step}
                  className={cn(
                    'cursor-pointer rounded-lg border px-3 py-2 text-xs font-normal transition-colors',
                    checked ? 'border-primary/30 bg-secondary' : 'hover:bg-muted/60',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(on) =>
                      onPatch({ steps: toggle<NegotiationStep>(negotiation.steps, step, Boolean(on)) }, true)
                    }
                  />
                  <span className="font-mono text-[11px] text-muted-foreground">{i + 1}</span>
                  <span className={cn(checked && 'text-muted-foreground line-through')}>
                    {NEGOTIATION_STEP_LABELS[step][lang]}
                  </span>
                </Label>
              )
            })}
          </fieldset>

          <div className="flex flex-col gap-1">
            <Label htmlFor={`${fieldId}-memo`} className="text-xs">
              {t.memo}
            </Label>
            <Textarea
              id={`${fieldId}-memo`}
              value={negotiation.note ?? ''}
              placeholder={t.memoPlaceholder}
              onChange={(e) => onPatch({ note: e.target.value })}
              className="min-h-20 text-xs"
            />
          </div>
        </div>
      </div>
      </div>
      )}
    </li>
  )
}
