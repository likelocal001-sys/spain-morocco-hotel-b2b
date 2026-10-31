'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CITIES, CITY_LABELS } from '@/lib/i18n'
import { useApp } from '@/lib/store'
import type { City, Hotel } from '@/lib/types'

const EMPTY: Omit<Hotel, 'id'> = {
  nameEs: '',
  nameKo: '',
  city: 'Madrid',
  stars: 4,
  salesEmail: '',
  salesPhone: '',
  busParking: true,
  notes: '',
}

export function HotelFormDialog({ hotel, onClose }: { hotel: Hotel | null; onClose: () => void }) {
  const { t, lang, saveHotel } = useApp()
  const [form, setForm] = useState<Omit<Hotel, 'id'>>(hotel ?? EMPTY)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((p) => ({ ...p, [key]: value }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nameEs.trim() || !/^\S+@\S+\.\S+$/.test(form.salesEmail.trim())) return setError(t.errHotelName)
    saveHotel({
      ...form,
      nameEs: form.nameEs.trim(),
      nameKo: form.nameKo.trim() || form.nameEs.trim(),
      salesEmail: form.salesEmail.trim(),
      id: hotel?.id ?? `h-${Date.now()}`,
    })
    toast.success(t.hotelSaved)
    onClose()
  }

  const cityItems = CITIES.map((c) => ({ value: c, label: CITY_LABELS[c][lang] }))
  const starItems = [3, 4, 5].map((s) => ({ value: String(s), label: `${s}${t.starsSuffix}` }))

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{hotel ? t.editHotel : t.addHotel}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="h-name-es">{t.hotelNameEs} *</Label>
              <Input id="h-name-es" value={form.nameEs} onChange={(e) => set('nameEs', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="h-name-ko">{t.hotelNameKo}</Label>
              <Input id="h-name-ko" value={form.nameKo} onChange={(e) => set('nameKo', e.target.value)} />
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
              <Label htmlFor="h-email">{t.salesEmail} *</Label>
              <Input
                id="h-email"
                type="email"
                value={form.salesEmail}
                onChange={(e) => set('salesEmail', e.target.value)}
                placeholder="grupos@hotel.es"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="h-phone">{t.salesPhone}</Label>
              <Input
                id="h-phone"
                type="tel"
                value={form.salesPhone}
                onChange={(e) => set('salesPhone', e.target.value)}
                placeholder="+34 900 000 000"
                className="font-mono"
              />
            </div>
          </div>
          <Label className="flex w-fit items-center gap-2 font-normal">
            <Checkbox checked={form.busParking} onCheckedChange={(checked) => set('busParking', checked)} />
            {t.busParking} — {t.available}
          </Label>
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
