'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CITIES, CUSTOM_CITY, cityLabel } from '@/lib/i18n'
import { addDays, nightsBetween } from '@/lib/format'
import { useApp } from '@/lib/store'
import type { City } from '@/lib/types'

export interface StayDraft {
  id: string
  city: City
  checkIn: string
  checkOut: string
  stars: string
  hotelId: string
  customCity: boolean
}

const STAR_OPTIONS = ['3', '4', '5']

export function shiftISO(iso: string, days: number) {
  return addDays(new Date(`${iso}T00:00:00`), days)
}

export function createStayDraft(checkIn: string, city: City = 'Madrid', stars = '4', customCity = false): StayDraft {
  return {
    id: Math.random().toString(36).slice(2, 10),
    city,
    checkIn,
    checkOut: shiftISO(checkIn, 1),
    stars,
    hotelId: 'none',
    customCity,
  }
}

export function StayEditor({ stays, onChange }: { stays: StayDraft[]; onChange: (stays: StayDraft[]) => void }) {
  const { t, lang, hotels } = useApp()
  const totalNights = stays.reduce((sum, s) => sum + nightsBetween(s.checkIn, s.checkOut), 0)

  function patch(index: number, changes: Partial<StayDraft>) {
    const next = stays.map((s, i) => (i === index ? { ...s, ...changes } : s))
    if (changes.checkOut && next[index + 1]) {
      const following = next[index + 1]
      const nights = Math.max(1, nightsBetween(following.checkIn, following.checkOut))
      next[index + 1] = { ...following, checkIn: changes.checkOut, checkOut: shiftISO(changes.checkOut, nights) }
    }
    onChange(next)
  }

  function addStay() {
    const last = stays[stays.length - 1]
    onChange([...stays, createStayDraft(last.checkOut, last.city, last.stars, last.customCity)])
  }

  const cityItems = [
    ...CITIES.map((c) => ({ value: c as string, label: cityLabel(c, lang) })),
    { value: CUSTOM_CITY, label: t.customCity },
  ]

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 flex w-full items-center justify-between text-sm font-medium">
        {t.itinerary} *
        <span className="font-mono text-xs font-normal text-muted-foreground">
          {t.totalNights} {totalNights}
          {t.nightsUnit} · {stays.length}
          {t.stayLabel}
        </span>
      </legend>
      <p className="text-xs text-muted-foreground">{t.itineraryHint}</p>

      <ol className="flex flex-col gap-2">
        {stays.map((stay, index) => {
          const nights = nightsBetween(stay.checkIn, stay.checkOut)
          const matchingHotels = hotels.filter((h) => h.city === stay.city && String(h.stars) === stay.stars)
          const hotelItems = [
            { value: 'none', label: t.hotelNone },
            ...matchingHotels.map((h) => ({ value: h.id, label: h.nameEs })),
          ]
          const fieldId = `stay-${stay.id}`
          return (
            <li key={stay.id} className="flex flex-col gap-2.5 rounded-lg border bg-muted/40 p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-medium">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary font-mono text-[11px] text-primary-foreground">
                    {index + 1}
                  </span>
                  {stay.city.trim() ? cityLabel(stay.city, lang) : t.customCity}
                  <span className="font-mono font-normal text-muted-foreground">
                    {nights}
                    {t.nightsUnit}
                  </span>
                </span>
                {stays.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${t.removeStay} ${index + 1}`}
                    onClick={() => onChange(stays.filter((s) => s.id !== stay.id))}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`${fieldId}-in`} className="text-xs">
                    {t.checkIn}
                  </Label>
                  <Input
                    id={`${fieldId}-in`}
                    type="date"
                    value={stay.checkIn}
                    min={index > 0 ? stays[index - 1].checkOut : undefined}
                    onChange={(e) => e.target.value && patch(index, { checkIn: e.target.value })}
                    className="bg-background font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`${fieldId}-out`} className="text-xs">
                    {t.checkOut}
                  </Label>
                  <Input
                    id={`${fieldId}-out`}
                    type="date"
                    value={stay.checkOut}
                    min={shiftISO(stay.checkIn, 1)}
                    onChange={(e) => e.target.value && patch(index, { checkOut: e.target.value })}
                    className="bg-background font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`${fieldId}-city`} className="text-xs">
                    {t.city}
                  </Label>
                  <Select
                    items={cityItems}
                    value={stay.customCity ? CUSTOM_CITY : stay.city}
                    onValueChange={(v) => {
                      if (!v) return
                      if (v === CUSTOM_CITY) patch(index, { city: '', customCity: true, hotelId: 'none' })
                      else patch(index, { city: v as City, customCity: false, hotelId: 'none' })
                    }}
                  >
                    <SelectTrigger id={`${fieldId}-city`} className="w-full bg-background">
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
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`${fieldId}-stars`} className="text-xs">
                    {t.preferredStars}
                  </Label>
                  <Select
                    items={STAR_OPTIONS.map((s) => ({ value: s, label: `${s}${t.starsSuffix}` }))}
                    value={stay.stars}
                    onValueChange={(v) => v && patch(index, { stars: v as string, hotelId: 'none' })}
                  >
                    <SelectTrigger id={`${fieldId}-stars`} className="w-full bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAR_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                          {t.starsSuffix}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {stay.customCity && (
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`${fieldId}-custom`} className="text-xs">
                    {t.customCity}
                  </Label>
                  <Input
                    id={`${fieldId}-custom`}
                    value={stay.city}
                    placeholder={t.customCityPlaceholder}
                    onChange={(e) => patch(index, { city: e.target.value })}
                    aria-invalid={!stay.city.trim() || undefined}
                    className="bg-background"
                    autoFocus
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <Label htmlFor={`${fieldId}-hotel`} className="text-xs">
                  {t.hotel}
                </Label>
                <Select
                  items={hotelItems}
                  value={stay.hotelId}
                  onValueChange={(v) => v && patch(index, { hotelId: v as string })}
                >
                  <SelectTrigger id={`${fieldId}-hotel`} className="w-full bg-background">
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
            </li>
          )
        })}
      </ol>

      <Button type="button" variant="outline" onClick={addStay} className="w-full border-dashed">
        <Plus />
        {t.addStay}
      </Button>
    </fieldset>
  )
}
