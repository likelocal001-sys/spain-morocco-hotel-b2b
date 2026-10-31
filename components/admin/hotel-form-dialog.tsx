'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatEUR } from '@/lib/format'
import { CITIES, CITY_LABELS } from '@/lib/i18n'
import { DEFAULT_FEE_RATE, FEE_RATES, useApp } from '@/lib/store'
import type { City, Hotel, HotelContact } from '@/lib/types'

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/

const newContact = (): HotelContact => ({ id: `c-${crypto.randomUUID()}`, name: '', email: '', phone: '' })

const emptyHotel = (): Omit<Hotel, 'id'> => ({
  nameEs: '',
  city: 'Madrid',
  stars: 4,
  contacts: [newContact()],
  feeRate: DEFAULT_FEE_RATE,
  busParking: true,
  notes: '',
})

export function HotelFormDialog({ hotel, onClose }: { hotel: Hotel | null; onClose: () => void }) {
  const { t, lang, saveHotel } = useApp()
  const [form, setForm] = useState<Omit<Hotel, 'id'>>(() =>
    hotel ? { ...hotel, contacts: hotel.contacts.length ? hotel.contacts : [newContact()] } : emptyHotel(),
  )
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((p) => ({ ...p, [key]: value }))

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
    if (contacts.some((c) => c.email && !EMAIL_PATTERN.test(c.email))) return setError(t.errContactEmail)
    saveHotel({ ...form, nameEs: form.nameEs.trim(), contacts, id: hotel?.id ?? `h-${Date.now()}` })
    toast.success(t.hotelSaved)
    onClose()
  }

  const cityItems = CITIES.map((c) => ({ value: c, label: CITY_LABELS[c][lang] }))
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
              <Label htmlFor="h-name-es">{t.hotelNameEs} *</Label>
              <Input id="h-name-es" value={form.nameEs} onChange={(e) => set('nameEs', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="h-city">{t.city}</Label>
              <Select items={cityItems} value={form.city} onValueChange={(v) => v && set('city', v as City)}>
                <SelectTrigger id="h-city" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cityItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
