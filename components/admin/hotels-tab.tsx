'use client'

import { useState } from 'react'
import { Bus, Mail, Pencil, Phone, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CITIES, CITY_LABELS } from '@/lib/i18n'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { Hotel } from '@/lib/types'
import { HotelFormDialog } from './hotel-form-dialog'

export function HotelsTab() {
  const { t, lang, hotels } = useApp()
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('all')
  const [editing, setEditing] = useState<Hotel | 'new' | null>(null)

  const cityItems = [{ value: 'all', label: t.allCities }, ...CITIES.map((c) => ({ value: c, label: CITY_LABELS[c][lang] }))]

  const rows = hotels.filter((h) => {
    const q = query.trim().toLowerCase()
    return (
      (city === 'all' || h.city === city) &&
      (!q || h.nameEs.toLowerCase().includes(q) || h.nameKo.includes(q))
    )
  })

  return (
    <section className="rounded-xl border bg-card shadow-xs">
      <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center">
        <label htmlFor="hotel-search" className="sr-only">
          {t.searchHotels}
        </label>
        <Input
          id="hotel-search"
          type="search"
          placeholder={t.searchHotels}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select items={cityItems} value={city} onValueChange={(v) => v && setCity(v as string)}>
          <SelectTrigger className="w-full sm:w-44" aria-label={t.city}>
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
        <span className="text-xs text-muted-foreground sm:ml-auto">
          {rows.length}
          {t.hotelCount}
        </span>
        <Button onClick={() => setEditing('new')}>
          <Plus aria-hidden="true" />
          {t.addHotel}
        </Button>
      </div>

      <Table className="min-w-[1000px]">
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="pl-4">{t.hotelNameEs}</TableHead>
            <TableHead>{t.city}</TableHead>
            <TableHead>{t.grade}</TableHead>
            <TableHead>{t.contact}</TableHead>
            <TableHead>{t.busParking}</TableHead>
            <TableHead>{t.priceNotes}</TableHead>
            <TableHead className="pr-4 text-right">
              <span className="sr-only">{t.edit}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((h) => (
            <TableRow key={h.id}>
              <TableCell className="pl-4">
                <p className="text-sm font-medium">{h.nameEs}</p>
                <p className="text-xs text-muted-foreground">{h.nameKo}</p>
              </TableCell>
              <TableCell className="text-xs">{CITY_LABELS[h.city][lang]}</TableCell>
              <TableCell>
                <span className="font-mono text-xs text-warning-foreground" aria-label={`${h.stars}${t.starsSuffix}`}>
                  {'★'.repeat(h.stars)}
                  <span className="text-border">{'★'.repeat(5 - h.stars)}</span>
                </span>
              </TableCell>
              <TableCell>
                <a href={`mailto:${h.salesEmail}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <Mail className="size-3" aria-hidden="true" />
                  {h.salesEmail}
                </a>
                <a
                  href={`tel:${h.salesPhone.replace(/\s/g, '')}`}
                  className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <Phone className="size-3" aria-hidden="true" />
                  {h.salesPhone}
                </a>
              </TableCell>
              <TableCell>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium',
                    h.busParking ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
                  )}
                >
                  <Bus className="size-3" aria-hidden="true" />
                  {h.busParking ? t.available : t.unavailable}
                </span>
              </TableCell>
              <TableCell className="max-w-[340px] text-xs whitespace-normal text-muted-foreground">{h.notes}</TableCell>
              <TableCell className="pr-4 text-right">
                <Button variant="ghost" size="icon-sm" aria-label={`${t.edit}: ${h.nameEs}`} onClick={() => setEditing(h)}>
                  <Pencil />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editing && <HotelFormDialog hotel={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </section>
  )
}
