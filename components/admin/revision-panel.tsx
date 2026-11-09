'use client'

import { BellRing, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { formatShortDate, nightsBetween } from '@/lib/format'
import { cityLabel, stayRequestLabels } from '@/lib/i18n'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { BookingSnapshot, Lang, Reservation, Revision, Stay } from '@/lib/types'

interface Change {
  label: string
  before: string[]
  after: string[]
}

function formatTimestamp(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : 'es-ES', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function RevisionPanel({ reservation }: { reservation: Reservation }) {
  const { t, lang, acknowledgeRevisions } = useApp()
  const revisions = reservation.revisions ?? []
  if (revisions.length === 0) return null

  const unseen = revisions.filter((r) => !r.seen)
  const seen = revisions.filter((r) => r.seen)

  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-md border p-4',
        unseen.length ? 'border-warning/50 bg-warning/[0.06]' : 'bg-muted/30',
      )}
      aria-labelledby="revision-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="revision-title" className="flex items-center gap-2 text-sm font-semibold">
          <BellRing className={cn('size-4', unseen.length ? 'text-warning' : 'text-muted-foreground')} aria-hidden="true" />
          {t.changesTitle}
          {unseen.length > 0 && (
            <span className="rounded-sm bg-warning px-2 py-0.5 font-mono text-[11px] text-warning-foreground">
              {unseen.length}
            </span>
          )}
        </h3>
        {unseen.length > 0 && (
          <Button
            size="sm"
            onClick={() => {
              acknowledgeRevisions(reservation.id)
              toast.success(t.seenToast, { description: reservation.id })
            }}
          >
            <Check aria-hidden="true" />
            {t.markSeen}
          </Button>
        )}
      </div>

      {unseen.map((rev) => (
        <RevisionDiff key={rev.id} revision={rev} />
      ))}

      {seen.length > 0 && (
        <details className="group text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            {t.pastRevisions} ({seen.length})
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            {[...seen].reverse().map((rev) => (
              <RevisionDiff key={rev.id} revision={rev} muted />
            ))}
          </div>
        </details>
      )}
    </section>
  )

  function RevisionDiff({ revision, muted = false }: { revision: Revision; muted?: boolean }) {
    const changes = diffSnapshots(revision.before, revision.after)
    return (
      <div className={cn('flex flex-col gap-2 rounded-lg border bg-card p-3', muted && 'opacity-80')}>
        <span className="font-mono text-[11px] text-muted-foreground">{formatTimestamp(revision.at, lang)}</span>
        <dl className="flex flex-col gap-2">
          {changes.map((c) => (
            <div key={c.label} className="grid gap-1 text-xs sm:grid-cols-[96px_1fr_1fr] sm:gap-3">
              <dt className="font-semibold">{c.label}</dt>
              <dd className="flex flex-col gap-0.5 rounded-md bg-destructive/[0.06] px-2 py-1.5">
                <span className="text-[10px] font-medium text-destructive">{t.beforeLabel}</span>
                {c.before.map((line, i) => (
                  <span key={i} className="text-muted-foreground line-through decoration-destructive/40">
                    {line}
                  </span>
                ))}
              </dd>
              <dd className="flex flex-col gap-0.5 rounded-md bg-success/[0.08] px-2 py-1.5">
                <span className="text-[10px] font-medium text-success">{t.afterLabel}</span>
                {c.after.map((line, i) => (
                  <span key={i} className="font-medium">
                    {line}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    )
  }

  function describeStay(stay: Stay) {
    const tags = stayRequestLabels(stay, lang).join(', ')
    return [
      `${cityLabel(stay.city, lang)} ${formatShortDate(stay.checkIn, lang)}–${formatShortDate(stay.checkOut, lang)}`,
      `${nightsBetween(stay.checkIn, stay.checkOut)}${t.nightsUnit} · ${stay.stars}★`,
      tags,
    ]
      .filter(Boolean)
      .join(' · ')
  }

  function diffSnapshots(a: BookingSnapshot, b: BookingSnapshot): Change[] {
    const out: Change[] = []
    const none = t.noneValue
    if (a.groupName !== b.groupName) out.push({ label: t.fieldGroupName, before: [a.groupName], after: [b.groupName] })

    const beforeStays = a.stays.map(describeStay)
    const afterStays = b.stays.map(describeStay)
    if (JSON.stringify(beforeStays) !== JSON.stringify(afterStays)) {
      const removed = beforeStays.filter((s) => !afterStays.includes(s))
      const added = afterStays.filter((s) => !beforeStays.includes(s))
      out.push({
        label: t.fieldStays,
        before: removed.length ? removed : beforeStays,
        after: added.length ? added : afterStays,
      })
    }

    const rooms = (r: BookingSnapshot['rooms']) => `Single ${r.single} · Twin ${r.twin} · Triple ${r.triple}`
    if (rooms(a.rooms) !== rooms(b.rooms)) out.push({ label: t.fieldRooms, before: [rooms(a.rooms)], after: [rooms(b.rooms)] })

    if (a.breakfast !== b.breakfast) {
      const label = (v: boolean) => (v ? t.included : t.notIncluded)
      out.push({ label: t.fieldBreakfast, before: [label(a.breakfast)], after: [label(b.breakfast)] })
    }

    if ((a.roomingList?.name ?? '') !== (b.roomingList?.name ?? '')) {
      out.push({ label: t.fieldRooming, before: [a.roomingList?.name ?? none], after: [b.roomingList?.name ?? none] })
    }

    if (a.requests !== b.requests) {
      out.push({ label: t.fieldRequests, before: [a.requests || none], after: [b.requests || none] })
    }
    return out
  }
}
