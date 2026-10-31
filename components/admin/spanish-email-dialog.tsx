'use client'

import { useState } from 'react'
import { Copy, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CITY_LABELS, REQUEST_TAG_LABELS } from '@/lib/i18n'
import { formatDate, nightsBetween, totalRooms } from '@/lib/format'
import type { Hotel, Reservation } from '@/lib/types'
import { useApp } from '@/lib/store'

function buildSpanishEmail(r: Reservation, hotel?: Hotel) {
  const nights = nightsBetween(r.checkIn, r.checkOut)
  const roomParts = [
    r.rooms.single && `${r.rooms.single} individual${r.rooms.single > 1 ? 'es' : ''}`,
    r.rooms.twin && `${r.rooms.twin} doble${r.rooms.twin > 1 ? 's' : ''} (twin)`,
    r.rooms.triple && `${r.rooms.triple} triple${r.rooms.triple > 1 ? 's' : ''}`,
  ].filter(Boolean)
  const requests = r.requestTags.map((tag) => REQUEST_TAG_LABELS[tag].es)
  const hasKorean = /[\u3131-\uD79D]/.test(r.requests)

  const subject = `Solicitud de reserva de grupo – ${r.id} (${formatDate(r.checkIn, 'es')})`
  const body = [
    `Estimado equipo comercial${hotel ? ` de ${hotel.nameEs}` : ''}:`,
    '',
    'Nos ponemos en contacto con ustedes en nombre de nuestro cliente, una agencia de viajes coreana, para solicitar disponibilidad y tarifa de grupo con los siguientes datos:',
    '',
    `• Referencia: ${r.id}`,
    `• Grupo: ${r.groupName}`,
    `• Ciudad: ${CITY_LABELS[r.city].es}`,
    `• Fechas: entrada ${formatDate(r.checkIn, 'es')} – salida ${formatDate(r.checkOut, 'es')} (${nights} noche${nights === 1 ? '' : 's'})`,
    `• Habitaciones: ${roomParts.join(', ')} — total ${totalRooms(r.rooms)}`,
    `• Régimen: ${r.breakfast ? 'alojamiento y desayuno' : 'solo alojamiento'}`,
    ...(!hotel && r.preferredStars ? [`• Categoría deseada: ${r.preferredStars} estrellas`] : []),
    ...(requests.length ? [`• Peticiones especiales: ${requests.join('; ')}`] : []),
    ...(r.requests ? [`• Observaciones${hasKorean ? ' (texto original del cliente)' : ''}: ${r.requests}`] : []),
    ...(r.roomingList ? ['• Adjuntamos la rooming list del grupo.'] : []),
    '',
    'Les agradeceríamos que nos indicaran la tarifa neta por habitación y noche, las condiciones de cancelación y la fecha límite de pago (payment limit).',
    '',
    'Quedamos a la espera de su respuesta.',
    '',
    'Atentamente,',
    'SP-Morocco Hotel Desk',
    'Operaciones DMC Marruecos – España',
  ].join('\n')

  return { subject, body }
}

export function SpanishEmailDialog({ reservation, onClose }: { reservation: Reservation; onClose: () => void }) {
  const { t, hotelById } = useApp()
  const hotel = hotelById(reservation.hotelId)
  const [email, setEmail] = useState(() => buildSpanishEmail(reservation, hotel))

  const recipients = (hotel?.contacts ?? []).map((c) => c.email).filter(Boolean)
  const mailto = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`

  async function copy() {
    await navigator.clipboard.writeText(`${email.subject}\n\n${email.body}`)
    toast.success(t.copied)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.emailTitle}</DialogTitle>
          <DialogDescription>{t.emailDesc}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email-to" className="text-xs text-muted-foreground">
            Para
          </Label>
          <p id="email-to" className="font-mono text-sm">
            {recipients.length ? recipients.join(', ') : '—'}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email-subject" className="text-xs text-muted-foreground">
            Asunto
          </Label>
          <input
            id="email-subject"
            value={email.subject}
            onChange={(e) => setEmail((prev) => ({ ...prev, subject: e.target.value }))}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm font-medium outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email-body" className="sr-only">
            Mensaje
          </Label>
          <Textarea
            id="email-body"
            rows={16}
            value={email.body}
            onChange={(e) => setEmail((prev) => ({ ...prev, body: e.target.value }))}
            className="max-h-[50vh] font-mono text-xs leading-relaxed"
          />
        </div>
        <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={copy}>
            <Copy aria-hidden="true" />
            {t.copy}
          </Button>
          <Button nativeButton={false} render={<a href={mailto} />}>
            <Send aria-hidden="true" />
            {t.openMail}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
