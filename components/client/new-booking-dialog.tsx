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
import { REQUEST_TAGS, REQUEST_TAG_LABELS } from '@/lib/i18n'
import { addDays, formatFileSize, nightsBetween } from '@/lib/format'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { AttachedFile, RequestTag, RoomCounts, Stay } from '@/lib/types'

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

function initialForm() {
  return {
    groupName: '',
    stays: [createStayDraft(addDays(new Date(), 30))] as StayDraft[],
    rooms: { single: 0, twin: 10, triple: 0 } as RoomCounts,
    breakfast: true,
    requestTags: [] as RequestTag[],
    requests: '',
    roomingList: undefined as AttachedFile | undefined,
  }
}

export function NewBookingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, lang, addReservation } = useApp()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const update = <K extends keyof ReturnType<typeof initialForm>>(key: K, value: ReturnType<typeof initialForm>[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const nights = form.stays.reduce((sum, s) => sum + nightsBetween(s.checkIn, s.checkOut), 0)
  const total = form.rooms.single + form.rooms.twin + form.rooms.triple

  function handleFile(file: File | undefined) {
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXT.includes(ext)) {
      setError(t.errFile)
      return
    }
    setError(null)
    update('roomingList', { name: file.name, size: file.size, url: URL.createObjectURL(file) })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
    }))
    const first = stays[0]
    const created = addReservation({
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
      requestTags: form.requestTags,
      requests: form.requests.trim(),
    })
    toast.success(t.submitted, { description: created.id })
    setForm(initialForm())
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.formTitle}</DialogTitle>
          <DialogDescription>{t.formDesc}</DialogDescription>
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

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{t.quickRequests}</span>
            <div className="flex flex-wrap gap-1.5">
              {REQUEST_TAGS.map((tag) => {
                const active = form.requestTags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      update(
                        'requestTags',
                        active ? form.requestTags.filter((x) => x !== tag) : [...form.requestTags, tag],
                      )
                    }
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background hover:border-primary hover:text-primary',
                    )}
                  >
                    {REQUEST_TAG_LABELS[tag][lang]}
                  </button>
                )
              })}
            </div>
            <Label htmlFor="requests" className="sr-only">
              {t.requests}
            </Label>
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
            <Button type="submit">{t.submit}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
