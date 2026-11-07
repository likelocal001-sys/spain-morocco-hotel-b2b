'use client'

import { useId, useRef, useState } from 'react'
import { FileSpreadsheet, Minus, Plus, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StayEditor, createStayDraft, type StayDraft } from '@/components/client/stay-editor'
import { uploadAttachment } from '@/lib/attachments'
import { addDays, formatFileSize, getStays, nightsBetween } from '@/lib/format'
import { CITIES } from '@/lib/i18n'
import { useApp } from '@/lib/store'
import type { AttachedFile, Reservation, RoomCounts, Stay } from '@/lib/types'

const ROOM_TYPES: { key: keyof RoomCounts; label: string; pax: string }[] = [
  { key: 'single', label: 'Single', pax: '1 pax' },
  { key: 'twin', label: 'Twin', pax: '2 pax' },
  { key: 'triple', label: 'Triple', pax: '3 pax' },
]

const ALLOWED_EXT = ['xlsx', 'xls', 'pdf']

function RoomStepper({
  label,
  pax,
  value,
  onChange,
}: {
  label: string
  pax: string
  value: number
  onChange: (value: number) => void
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-2.5">
      <Label htmlFor={id} className="flex items-baseline justify-between text-xs">
        {label}
        <span className="font-normal text-muted-foreground">{pax}</span>
      </Label>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`${label} -1`}
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          <Minus />
        </Button>
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          max={99}
          value={value}
          onChange={(e) => onChange(Math.min(99, Math.max(0, Number(e.target.value) || 0)))}
          className="h-7 text-center font-mono tabular-nums"
        />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`${label} +1`}
          onClick={() => onChange(Math.min(99, value + 1))}
        >
          <Plus />
        </Button>
      </div>
    </div>
  )
}

function initialForm(reservation?: Reservation) {
  if (reservation) {
    return {
      groupName: reservation.groupName,
      stays: getStays(reservation).map<StayDraft>((s) => ({
        id: s.id,
        city: s.city,
        checkIn: s.checkIn,
        checkOut: s.checkOut,
        stars: String(s.stars),
        hotelId: s.hotelId ?? 'none',
        customCity: !(CITIES as string[]).includes(s.city),
        requestTags: s.requestTags ?? [],
        requestNote: s.requestNote ?? '',
        noteOpen: Boolean(s.requestNote?.trim()),
      })),
      rooms: { ...reservation.rooms } as RoomCounts,
      breakfast: reservation.breakfast,
      requests: reservation.requests ?? '',
      roomingList: reservation.roomingList as AttachedFile | undefined,
    }
  }
  return {
    groupName: '',
    stays: [createStayDraft(addDays(new Date(), 30))] as StayDraft[],
    rooms: { single: 0, twin: 10, triple: 0 } as RoomCounts,
    breakfast: true,
    requests: '',
    roomingList: undefined as AttachedFile | undefined,
  }
}

type FormState = ReturnType<typeof initialForm>

export function NewBookingDialog({
  open,
  onOpenChange,
  reservation,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservation?: Reservation
}) {
  const { t, addReservation, editReservation } = useApp()
  const isEdit = Boolean(reservation)
  const [form, setForm] = useState<FormState>(() => initialForm(reservation))
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const nights = form.stays.reduce((sum, s) => sum + nightsBetween(s.checkIn, s.checkOut), 0)
  const total = form.rooms.single + form.rooms.twin + form.rooms.triple

  async function handleFile(file: File | undefined) {
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXT.includes(ext)) {
      setError(t.errFile)
      return
    }
    setError(null)
    setUploading(true)
    try {
      update('roomingList', await uploadAttachment(file, 'rooming'))
    } catch {
      setError(t.uploadFailed)
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (uploading) return
    if (!form.groupName.trim()) return setError(t.errGroup)
    if (form.stays.some((s) => !s.city.trim())) return setError(t.errCity)
    if (form.stays.some((s) => nightsBetween(s.checkIn, s.checkOut) <= 0)) return setError(t.errDates)
    if (form.stays.some((s, i) => i > 0 && s.checkIn < form.stays[i - 1].checkOut)) return setError(t.errStayOrder)
    if (total <= 0) return setError(t.errRooms)

    const stays: Stay[] = form.stays.map((s) => ({
      id: s.id,
      city: s.city.trim(),
      checkIn: s.checkIn,
      checkOut: s.checkOut,
      stars: Number(s.stars),
      hotelId: s.hotelId === 'none' ? undefined : s.hotelId,
      requestTags: s.requestTags,
      ...(s.requestNote.trim() ? { requestNote: s.requestNote.trim() } : {}),
    }))
    const allRequestTags = [...new Set(stays.flatMap((s) => s.requestTags ?? []))]
    const first = stays[0]
    const input = {
      groupName: form.groupName.trim(),
      checkIn: first.checkIn,
      checkOut: stays[stays.length - 1].checkOut,
      city: first.city,
      hotelId: first.hotelId,
      preferredStars: first.stars,
      stays,
      rooms: form.rooms,
      breakfast: form.breakfast,
      roomingList: form.roomingList,
      requestTags: allRequestTags,
      requests: form.requests.trim(),
    }

    if (reservation) {
      if (!editReservation(reservation.id, input)) {
        toast.info(t.noChanges)
        onOpenChange(false)
        return
      }
      toast.success(t.updated, { description: `${reservation.id} · ${t.updatedDesc}` })
      setError(null)
      onOpenChange(false)
      return
    }

    const created = await addReservation(input)
    if (!created) return
    toast.success(t.submitted, { description: created.id })
    setForm(initialForm())
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t.editFormTitle : t.formTitle}
            {reservation && (
              <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">{reservation.id}</span>
            )}
          </DialogTitle>
          <DialogDescription>{isEdit ? t.editFormDesc : t.formDesc}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="group-name">{t.groupName} *</Label>
            <Input
              id="group-name"
              value={form.groupName}
              placeholder={t.groupNamePh}
              onChange={(e) => update('groupName', e.target.value)}
              required
            />
          </div>

          <StayEditor stays={form.stays} onChange={(stays) => update('stays', stays)} />

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 flex w-full items-center justify-between text-sm font-medium">
              {t.roomsByType} *
              <span className="font-mono text-xs font-normal text-muted-foreground">
                {t.summaryRooms} {total}
                {t.roomsUnit} · {Math.max(nights, 0)}
                {t.nightsUnit}
              </span>
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {ROOM_TYPES.map((type) => (
                <RoomStepper
                  key={type.key}
                  label={type.label}
                  pax={type.pax}
                  value={form.rooms[type.key]}
                  onChange={(value) => update('rooms', { ...form.rooms, [type.key]: value })}
                />
              ))}
            </div>
            <Label className="mt-1 flex w-fit items-center gap-2 font-normal">
              <Checkbox checked={form.breakfast} onCheckedChange={(checked) => update('breakfast', checked)} />
              {t.breakfast}
            </Label>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t.roomingUpload}</span>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.pdf"
              className="sr-only"
              id="rooming-file"
              onChange={(e) => {
                handleFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            {form.roomingList ? (
              <div className="flex items-center gap-3 rounded-lg border bg-secondary/60 px-3 py-2">
                <FileSpreadsheet className="size-5 text-primary" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{form.roomingList.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(form.roomingList.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t.removeFile}
                  onClick={() => update('roomingList', undefined)}
                >
                  <X />
                </Button>
              </div>
            ) : (
              <label
                htmlFor="rooming-file"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  handleFile(e.dataTransfer.files?.[0])
                }}
                className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-input px-4 py-5 text-center transition-colors hover:border-primary hover:bg-secondary/40"
              >
                <Upload className="size-5 text-primary" aria-hidden="true" />
                <span className="text-sm font-medium text-primary">{t.chooseFile}</span>
                <span className="text-xs text-muted-foreground">{t.roomingHint}</span>
              </label>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="requests">{t.requests}</Label>
            <Textarea
              id="requests"
              rows={2}
              value={form.requests}
              placeholder={t.requestsPh}
              onChange={(e) => update('requests', e.target.value)}
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit">{isEdit ? t.saveChanges : t.submit}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
