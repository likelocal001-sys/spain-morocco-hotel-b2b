'use client'

import { useState } from 'react'
import { ExternalLink, MapPin, Route } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cityLabel } from '@/lib/i18n'
import { directionsUrl, hasLocation, mapsEmbedFor, mapsLinkFor } from '@/lib/maps'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { Hotel } from '@/lib/types'

export function HotelMapEmbed({ hotel, className }: { hotel: Hotel | Omit<Hotel, 'id'>; className?: string }) {
  return (
    <iframe
      title={hotel.location?.placeName ?? hotel.nameEs}
      src={mapsEmbedFor(hotel)}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className={cn('h-56 w-full rounded-md border bg-muted', className)}
    />
  )
}

/** Opens a dialog with the hotel on a map. Renders nothing for hotels without a location. */
export function HotelMapButton({
  hotel,
  compact = false,
  className,
}: {
  hotel?: Hotel
  compact?: boolean
  className?: string
}) {
  const { t, lang } = useApp()
  const [open, setOpen] = useState(false)
  if (!hotel || !hasLocation(hotel)) return null
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex shrink-0 items-center gap-0.5 text-[11px] text-brand hover:underline focus-visible:underline focus-visible:outline-none',
          className,
        )}
        aria-label={`${t.viewMap}: ${hotel.nameEs}`}
      >
        <MapPin className="size-3" aria-hidden="true" />
        {!compact && t.viewMap}
      </button>
      {open && (
        <Dialog open onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{hotel.nameEs}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {cityLabel(hotel.city, lang)}
                {hotel.location?.placeName && hotel.location.placeName !== hotel.nameEs && (
                  <> · {t.googleName}: {hotel.location.placeName}</>
                )}
              </p>
            </DialogHeader>
            <HotelMapEmbed hotel={hotel} className="h-80" />
            <a
              href={mapsLinkFor(hotel)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1 text-sm text-brand hover:underline"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              {t.openInMaps}
            </a>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

/** Driving route between two consecutive stays' hotels. Renders nothing unless both are known. */
export function RouteLink({
  from,
  to,
  label,
  className,
}: {
  from?: Hotel
  to?: Hotel
  label: string
  className?: string
}) {
  if (!from || !to || from.id === to.id) return null
  return (
    <a
      href={directionsUrl(from, to)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('inline-flex items-center gap-1 text-[11px] text-brand hover:underline', className)}
    >
      <Route className="size-3" aria-hidden="true" />
      {label}
    </a>
  )
}
