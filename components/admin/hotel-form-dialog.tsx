'use client'

import { useState } from 'react'
import { Loader2, MapPin, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { HotelMapEmbed } from '@/components/hotel-map'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DEFAULT_PAYMENT_DAYS, formatEUR } from '@/lib/format'
import { CITIES, CUSTOM_CITY, cityLabel, isKnownCity } from '@/lib/i18n'
import { isShortMapsLink, parseMapsUrl } from '@/lib/maps'
import { DEFAULT_FEE_RATE, FEE_RATES, useApp } from '@/lib/store'
import type { City, Hotel, HotelBank, HotelContact, HotelLocation, RoomType } from '@/lib/types'

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/

const ROOM_TYPES: { key: RoomType; label: string }[] = [
  { key: 'single', label: 'Single' },
  { key: 'twin', label: 'Twin' },
  { key: 'triple', label: 'Triple' },
]

function cleanRates(rates: Hotel['rates']): Hotel['rates'] {
  if (!rates) return undefined
  const entries = Object.entries(rates).filter(([, v]) => typeof v === 'number' && Number.isFinite(v) && v > 0)
  return entries.length ? (Object.fromEntries(entries) as Hotel['rates']) : undefined
}

const newContact = (): HotelContact => ({ id: `c-${crypto.randomUUID()}`, name: '', email: '', phone: '' })

const emptyHotel = (): Omit<Hotel, 'id'> => ({
  nameEs: '',
  city: 'Madrid',
  stars: 4,
  contacts: [newContact()],
  feeRate: DEFAULT_FEE_RATE,
  busParking: true,
  notes: '',
  bank: emptyBank(),
  paymentDaysBefore: DEFAULT_PAYMENT_DAYS,
})

const emptyBank = (): HotelBank => ({ bankName: '', holder: '', iban: '', bic: '' })

function cleanBank(bank: HotelBank | undefined): HotelBank | undefined {
  if (!bank) return undefined
  const next = {
    bankName: bank.bankName.trim(),
    holder: bank.holder.trim(),
    iban: bank.iban.trim().toUpperCase(),
    bic: bank.bic.trim().toUpperCase(),
  }
  return Object.values(next).some(Boolean) ? next : undefined
}

export function HotelFormDialog({ hotel, onClose }: { hotel: Hotel | null; onClose: () => void }) {
  const { t, lang, saveHotel } = useApp()
  const [form, setForm] = useState<Omit<Hotel, 'id'>>(() =>
    hotel
      ? {
          ...hotel,
          contacts: hotel.contacts.length ? hotel.contacts : [newContact()],
          bank: hotel.bank ?? emptyBank(),
          paymentDaysBefore: hotel.paymentDaysBefore ?? DEFAULT_PAYMENT_DAYS,
        }
      : emptyHotel(),
  )
  const bank = form.bank ?? emptyBank()
  const setBank = (patch: Partial<HotelBank>) => set('bank', { ...bank, ...patch })
  const [error, setError] = useState<string | null>(null)
  const [customCity, setCustomCity] = useState(() => (hotel ? !isKnownCity(hotel.city) : false))
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((p) => ({ ...p, [key]: value }))

  const [mapsInput, setMapsInput] = useState(hotel?.location?.mapsUrl ?? '')
  const [mapsStatus, setMapsStatus] = useState<'idle' | 'resolving' | 'invalid' | 'unresolved'>('idle')

  async function applyMapsLink(raw: string) {
    const text = raw.trim()
    if (mapsStatus === 'resolving' || text === (form.location?.mapsUrl ?? '')) return
    if (!text) {
      setMapsStatus('idle')
      return set('location', undefined)
    }
    let location: HotelLocation | null
    if (isShortMapsLink(text)) {
      setMapsStatus('resolving')
      try {
        const res = await fetch(`/api/maps/resolve?url=${encodeURIComponent(text)}`)
        const body = (await res.json()) as { url?: string }
        location = body.url ? parseMapsUrl(body.url) : null
        if (location) location.mapsUrl = text
        if (!location) return setMapsStatus('unresolved')
      } catch {
        return setMapsStatus('unresolved')
      }
    } else {
      location = parseMapsUrl(text)
      if (!location) return setMapsStatus('invalid')
    }
    setMapsStatus('idle')
    const placeName = location.placeName
    setForm((p) => ({ ...p, location, nameEs: !p.nameEs.trim() && placeName ? placeName : p.nameEs }))
  }

  const googleName = form.location?.placeName

  const updateContact = (id: string, patch: Partial<HotelContact>) =>
    set(
      'contacts',
      form.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    )
  const removeContact = (id: string) => set('contacts', form.contacts.filter((c) => c.id !== id))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const contacts = form.contacts
      .map((c) => ({ ...c, name: c.name.trim(), email: c.email.trim(), phone: c.phone.trim() }))
      .filter((c) => c.name || c.email || c.phone)
    if (!form.nameEs.trim() || !contacts.some((c) => c.email)) return setError(t.errHotelName)
    if (!form.city.trim()) return setError(t.errCity)
    if (contacts.some((c) => c.email && !EMAIL_PATTERN.test(c.email))) return setError(t.errContactEmail)
    saveHotel({
      ...form,
      nameEs: form.nameEs.trim(),
      city: form.city.trim(),
      contacts,
      bank: cleanBank(form.bank),
      rates: cleanRates(form.rates),
      paymentDaysBefore: Math.max(0, Math.round(form.paymentDaysBefore ?? DEFAULT_PAYMENT_DAYS)),
      id: hotel?.id ?? `h-${Date.now()}`,
    })
    toast.success(t.hotelSaved)
    onClose()
  }

  const cityItems = [
    ...CITIES.map((c) => ({ value: c as string, label: cityLabel(c, lang) })),
    { value: CUSTOM_CITY, label: t.customCity },
  ]
  const starItems = [3, 4, 5].map((s) => ({ value: String(s), label: `${s}${t.starsSuffix}` }))
  const rateItems = FEE_RATES.map((r) => ({ value: String(r), label: formatEUR(r, lang) }))

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{hotel ? t.editHotel : t.addHotel}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="h-maps">{t.mapsLink}</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin
                    className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="h-maps"
                    type="url"
                    inputMode="url"
                    placeholder="https://maps.app.goo.gl/…"
                    value={mapsInput}
                    onChange={(e) => setMapsInput(e.target.value)}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text')
                      e.preventDefault()
                      setMapsInput(pasted.trim())
                      void applyMapsLink(pasted)
                    }}
                    onBlur={() => void applyMapsLink(mapsInput)}
                    aria-invalid={mapsStatus === 'invalid' || mapsStatus === 'unresolved' || undefined}
                    aria-describedby="h-maps-hint"
                    className="pl-8"
                  />
                </div>
                {form.location && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={t.removeLocation}
                    onClick={() => {
                      setMapsInput('')
                      setMapsStatus('idle')
                      set('location', undefined)
                    }}
                  >
                    <X />
                  </Button>
                )}
              </div>
              <p id="h-maps-hint" className="text-xs text-muted-foreground" aria-live="polite">
                {mapsStatus === 'resolving' ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                    {t.mapsResolving}
                  </span>
                ) : mapsStatus === 'invalid' ? (
                  <span className="text-destructive">{t.mapsInvalid}</span>
                ) : mapsStatus === 'unresolved' ? (
                  <span className="text-destructive">{t.mapsUnresolved}</span>
                ) : form.location && form.location.lat == null ? (
                  t.mapsNoPin
                ) : (
                  t.mapsLinkHint
                )}
              </p>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="h-name-es">{t.hotelNameEs} *</Label>
              <Input id="h-name-es" value={form.nameEs} onChange={(e) => set('nameEs', e.target.value)} />
              {googleName && googleName !== form.nameEs.trim() && (
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span>
                    {t.googleName}: <span className="font-medium text-foreground">{googleName}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => set('nameEs', googleName)}
                    className="text-brand hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    {t.useGoogleName}
                  </button>
                </p>
              )}
            </div>
            {form.location && <HotelMapEmbed hotel={form} className="sm:col-span-2" />}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="h-city">{t.city}</Label>
              <Select
                items={cityItems}
                value={customCity ? CUSTOM_CITY : form.city}
                onValueChange={(v) => {
                  if (!v) return
                  if (v === CUSTOM_CITY) {
                    setCustomCity(true)
                    set('city', '')
                  } else {
                    setCustomCity(false)
                    set('city', v as City)
                  }
                }}
              >
                <SelectTrigger id="h-city" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cityItems.map((item) => (
                    <SelectItem
                      key={item.value}
                      value={item.value}
                      className={item.value === CUSTOM_CITY ? 'border-t font-medium' : undefined}
                    >
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customCity && (
                <>
                  <Label htmlFor="h-city-custom" className="sr-only">
                    {t.customCity}
                  </Label>
                  <Input
                    id="h-city-custom"
                    value={form.city}
                    placeholder={t.customCityPlaceholder}
                    autoFocus
                    onChange={(e) => set('city', e.target.value)}
                  />
                </>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="h-stars">{t.grade}</Label>
              <Select items={starItems} value={String(form.stars)} onValueChange={(v) => v && set('stars', Number(v))}>
                <SelectTrigger id="h-stars" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {starItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="h-fee">{t.feeRateLabel}</Label>
              <Select
                items={rateItems}
                value={String(form.feeRate)}
                onValueChange={(v) => v && set('feeRate', Number(v))}
              >
                <SelectTrigger id="h-fee" className="w-full font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rateItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Label className="flex w-fit items-center gap-2 self-end pb-2 font-normal">
              <Checkbox checked={form.busParking} onCheckedChange={(checked) => set('busParking', checked)} />
              {t.busParking} — {t.available}
            </Label>
          </div>

          <fieldset className="flex flex-col gap-2 rounded-lg border p-3">
            <legend className="px-1 text-sm font-medium">{t.hotelDefaultRates}</legend>
            <div className="grid grid-cols-3 gap-2">
              {ROOM_TYPES.map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-1">
                  <Label htmlFor={`h-rate-${key}`} className="text-xs text-muted-foreground">
                    {label}
                  </Label>
                  <Input
                    id={`h-rate-${key}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    placeholder="€"
                    value={form.rates?.[key] ?? ''}
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      set('rates', { ...form.rates, [key]: e.target.value && value >= 0 ? value : undefined })
                    }}
                    className="font-mono"
                    aria-describedby="h-rates-hint"
                  />
                </div>
              ))}
            </div>
            <p id="h-rates-hint" className="text-[11px] text-muted-foreground">
              {t.hotelDefaultRatesHint}
            </p>
          </fieldset>

          <fieldset className="flex flex-col gap-2 rounded-lg border p-3">
            <legend className="px-1 text-sm font-medium">{t.contacts} *</legend>
            {form.contacts.map((c, i) => (
              <div key={c.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.3fr_1fr_auto] sm:items-end">
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`${c.id}-name`} className={i > 0 ? 'sm:sr-only' : 'text-xs text-muted-foreground'}>
                    {t.contactName}
                  </Label>
                  <Input
                    id={`${c.id}-name`}
                    value={c.name}
                    onChange={(e) => updateContact(c.id, { name: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`${c.id}-email`} className={i > 0 ? 'sm:sr-only' : 'text-xs text-muted-foreground'}>
                    {t.salesEmail}
                  </Label>
                  <Input
                    id={`${c.id}-email`}
                    type="email"
                    value={c.email}
                    placeholder="grupos@hotel.es"
                    onChange={(e) => updateContact(c.id, { email: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`${c.id}-phone`} className={i > 0 ? 'sm:sr-only' : 'text-xs text-muted-foreground'}>
                    {t.salesPhone}
                  </Label>
                  <Input
                    id={`${c.id}-phone`}
                    type="tel"
                    value={c.phone}
                    placeholder="+34 900 000 000"
                    className="font-mono"
                    onChange={(e) => updateContact(c.id, { phone: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t.removeContact}
                  disabled={form.contacts.length === 1}
                  onClick={() => removeContact(c.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => set('contacts', [...form.contacts, newContact()])}
            >
              <Plus aria-hidden="true" />
              {t.addContact}
            </Button>
          </fieldset>

          <fieldset className="flex flex-col gap-3 rounded-lg border p-3">
            <legend className="px-1 text-sm font-medium">{t.paymentSettings}</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="h-bank-name" className="text-xs text-muted-foreground">
                  {t.bankName}
                </Label>
                <Input id="h-bank-name" value={bank.bankName} onChange={(e) => setBank({ bankName: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="h-bank-holder" className="text-xs text-muted-foreground">
                  {t.accountHolder}
                </Label>
                <Input id="h-bank-holder" value={bank.holder} onChange={(e) => setBank({ holder: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2 sm:grid sm:grid-cols-[1fr_auto] sm:gap-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="h-bank-iban" className="text-xs text-muted-foreground">
                    {t.iban}
                  </Label>
                  <Input
                    id="h-bank-iban"
                    value={bank.iban}
                    placeholder="ES00 0000 0000 0000 0000 0000"
                    autoComplete="off"
                    spellCheck={false}
                    className="font-mono uppercase"
                    onChange={(e) => setBank({ iban: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1 sm:w-40">
                  <Label htmlFor="h-bank-bic" className="text-xs text-muted-foreground">
                    {t.bic}
                  </Label>
                  <Input
                    id="h-bank-bic"
                    value={bank.bic}
                    placeholder="XXXXESMMXXX"
                    autoComplete="off"
                    spellCheck={false}
                    className="font-mono uppercase"
                    onChange={(e) => setBank({ bic: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="h-pay-days" className="text-xs">
                {t.paymentDaysBefore}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="h-pay-days"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={120}
                  value={form.paymentDaysBefore ?? ''}
                  onChange={(e) => set('paymentDaysBefore', e.target.value === '' ? undefined : Number(e.target.value))}
                  className="w-24 font-mono"
                  aria-describedby="h-pay-days-hint"
                />
                <span className="text-xs text-muted-foreground">{t.daysBeforeCheckIn}</span>
              </div>
              <p id="h-pay-days-hint" className="text-[11px] text-muted-foreground">
                {t.paymentDaysHint}
              </p>
            </div>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="h-notes">{t.priceNotes}</Label>
            <Textarea id="h-notes" rows={4} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
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
