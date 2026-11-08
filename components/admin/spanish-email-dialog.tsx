'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, Copy, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cityLabel, REQUEST_TAG_LABELS } from '@/lib/i18n'
import { formatDate, getStays, nightsBetween, totalRooms } from '@/lib/format'
import type { Hotel, Reservation, Stay } from '@/lib/types'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'

const hasKorean = (text: string) => /[\u3131-\uD79D]/.test(text)

function stayPeticiones(stay: Stay) {
  const parts = (stay.requestTags ?? []).map((tag) => REQUEST_TAG_LABELS[tag]?.es).filter(Boolean)
  const note = stay.requestNote?.trim()
  if (note) parts.push(hasKorean(note) ? `${note} (texto original del cliente)` : note)
  return parts.join('; ')
}

function stayDates(stay: Stay) {
  const nights = nightsBetween(stay.checkIn, stay.checkOut)
  return `entrada ${formatDate(stay.checkIn, 'es')} – salida ${formatDate(stay.checkOut, 'es')} (${nights} noche${nights === 1 ? '' : 's'})`
}

interface HotelGroup {
  key: string
  hotel?: Hotel
  stays: Stay[]
}

function groupStaysByHotel(stays: Stay[], hotelById: (id?: string) => Hotel | undefined): HotelGroup[] {
  const groups: HotelGroup[] = []
  for (const stay of stays) {
    const hotel = hotelById(stay.hotelId)
    const existing = hotel && groups.find((g) => g.hotel?.id === hotel.id)
    if (existing) existing.stays.push(stay)
    else groups.push({ key: hotel?.id ?? stay.id, hotel, stays: [stay] })
  }
  return groups
}

function buildSpanishEmail(r: Reservation, group: HotelGroup) {
  const { hotel, stays } = group
  const roomParts = [
    r.rooms.single && `${r.rooms.single} individual${r.rooms.single > 1 ? 'es' : ''}`,
    r.rooms.twin && `${r.rooms.twin} doble${r.rooms.twin > 1 ? 's' : ''} (twin)`,
    r.rooms.triple && `${r.rooms.triple} triple${r.rooms.triple > 1 ? 's' : ''}`,
  ].filter(Boolean)
  const first = stays[0]

  const stayLines =
    stays.length === 1
      ? [
          `• Ciudad: ${cityLabel(first.city, 'es')}`,
          `• Fechas: ${stayDates(first)}`,
          ...(stayPeticiones(first) ? [`• Peticiones especiales: ${stayPeticiones(first)}`] : []),
        ]
      : [
          `• Ciudad: ${cityLabel(first.city, 'es')}`,
          '• Estancias:',
          ...stays.flatMap((s, i) => [
            `   ${i + 1}) ${stayDates(s)}`,
            ...(stayPeticiones(s) ? [`      Peticiones especiales: ${stayPeticiones(s)}`] : []),
          ]),
        ]

  const subject = `Solicitud de reserva de grupo – ${r.id} (${formatDate(first.checkIn, 'es')})`
  const body = [
    `Estimado equipo comercial${hotel ? ` de ${hotel.nameEs}` : ''}:`,
    '',
    'Nos ponemos en contacto con ustedes en nombre de nuestro cliente, una agencia de viajes coreana, para solicitar disponibilidad y tarifa de grupo con los siguientes datos:',
    '',
    `• Referencia: ${r.id}`,
    `• Grupo: ${r.groupName}`,
    ...stayLines,
    `• Habitaciones: ${roomParts.join(', ')} — total ${totalRooms(r.rooms)}`,
    `• Régimen: ${r.breakfast ? 'alojamiento y desayuno' : 'solo alojamiento'}`,
    ...(!hotel ? [`• Categoría deseada: ${first.stars} estrellas`] : []),
    ...(r.requests?.trim()
      ? [`• Observaciones generales${hasKorean(r.requests) ? ' (texto original del cliente)' : ''}: ${r.requests.trim()}`]
      : []),
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

function signatureOf(text: string) {
  let hash = 5381
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0
  return (hash >>> 0).toString(36)
}

type EmailState = 'unsent' | 'sent' | 'changed'

function groupEmailState(r: Reservation, group: HotelGroup): EmailState {
  const records = group.stays.map((s) => r.negotiation?.[s.id])
  if (records.some((n) => !n?.emailSentAt)) return 'unsent'
  const signature = signatureOf(buildSpanishEmail(r, group).body)
  return records.every((n) => n?.emailSignature === signature) ? 'sent' : 'changed'
}

export function emailNeedsAttention(r: Reservation, hotelById: (id?: string) => Hotel | undefined) {
  if (r.status === 'cancelled') return false
  return groupStaysByHotel(getStays(r), hotelById).some((g) => g.hotel && groupEmailState(r, g) !== 'sent')
}

export function SpanishEmailDialog({ reservation: initial, onClose }: { reservation: Reservation; onClose: () => void }) {
  const { t, lang, hotelById, reservations, updateReservation } = useApp()
  const reservation = reservations.find((r) => r.id === initial.id) ?? initial
  const groups = groupStaysByHotel(getStays(reservation), hotelById)
  const [groupIndex, setGroupIndex] = useState(0)
  const group = groups[groupIndex] ?? groups[0]
  const hotel = group.hotel
  const [email, setEmail] = useState(() => buildSpanishEmail(reservation, group))

  function selectGroup(index: number) {
    setGroupIndex(index)
    setEmail(buildSpanishEmail(reservation, groups[index]))
  }

  const recipients = (hotel?.contacts ?? []).map((c) => c.email).filter(Boolean)
  const mailto = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`

  const state = groupEmailState(reservation, group)
  const sentAt = group.stays.map((s) => reservation.negotiation?.[s.id]?.emailSentAt).filter(Boolean).sort().at(-1)

  function markSent() {
    const signature = signatureOf(buildSpanishEmail(reservation, group).body)
    const emailSentAt = new Date().toISOString()
    const negotiation = { ...reservation.negotiation }
    for (const s of group.stays) negotiation[s.id] = { ...negotiation[s.id], steps: negotiation[s.id]?.steps ?? [], emailSentAt, emailSignature: signature }
    updateReservation(reservation.id, { negotiation })
    toast.success(t.emailMarkedToast, { description: hotel?.nameEs })
  }

  async function copy() {
    const text = `${email.subject}\n\n${email.body}`
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard API is unavailable outside secure contexts (plain http) or when permission is denied.
      const area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      area.remove()
      if (!ok) return toast.error(t.copyFailed)
    }
    toast.success(t.copied)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.emailTitle}</DialogTitle>
          <DialogDescription>{t.emailDesc}</DialogDescription>
        </DialogHeader>
        {groups.length > 1 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.itinerary}>
            {groups.map((g, index) => (
              <Button
                key={g.key}
                type="button"
                size="sm"
                variant={index === groupIndex ? 'default' : 'outline'}
                aria-pressed={index === groupIndex}
                onClick={() => selectGroup(index)}
              >
                <span className="font-mono">{index + 1}</span>
                {g.hotel?.nameEs ?? `${cityLabel(g.stays[0].city, lang)} · ${g.stays[0].stars}★`}
                {g.stays.length > 1 && <span className="font-mono text-xs opacity-70">×{g.stays.length}</span>}
                {g.hotel && groupEmailState(reservation, g) !== 'sent' && (
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-destructive" />
                )}
              </Button>
            ))}
          </div>
        )}
        <div
          role="status"
          className={cn(
            'flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm',
            state === 'sent' && 'bg-success/10 text-success',
            state === 'unsent' && 'bg-muted text-muted-foreground',
            state === 'changed' && 'bg-destructive/10 text-destructive',
          )}
        >
          <span className="flex items-center gap-1.5 font-medium">
            {state === 'sent' ? (
              <CheckCircle2 className="size-4" aria-hidden="true" />
            ) : state === 'changed' ? (
              <AlertTriangle className="size-4" aria-hidden="true" />
            ) : (
              <Clock className="size-4" aria-hidden="true" />
            )}
            {state === 'sent' ? t.emailSent : state === 'changed' ? t.emailChanged : t.emailUnsent}
            {sentAt && state !== 'unsent' && (
              <span className="font-mono text-xs font-normal opacity-80">
                {new Date(sentAt).toLocaleString(lang === 'ko' ? 'ko-KR' : 'es-ES', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </span>
            )}
          </span>
          {state !== 'sent' && (
            <Button type="button" size="sm" variant="outline" className="bg-background" onClick={markSent}>
              {t.markEmailSent}
            </Button>
          )}
        </div>
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
