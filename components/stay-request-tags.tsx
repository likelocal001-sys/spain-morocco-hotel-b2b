'use client'

import { BellRing } from 'lucide-react'
import { REQUEST_TAG_LABELS } from '@/lib/i18n'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { RequestTag } from '@/lib/types'

export function RequestTagChips({
  tags,
  note,
  compact = false,
}: {
  tags: RequestTag[]
  note?: string
  compact?: boolean
}) {
  const { lang } = useApp()
  const trimmedNote = note?.trim()
  const labels = tags.map((tag) => REQUEST_TAG_LABELS[tag]?.[lang]).filter(Boolean)
  if (labels.length === 0 && !trimmedNote) return null
  const chip = cn(
    'rounded-md border border-warning/50 bg-warning/20 font-medium text-warning-foreground',
    compact ? 'px-1.5 py-px text-[10px]' : 'px-2 py-0.5 text-xs',
  )
  return (
    <ul className="flex flex-wrap gap-1" aria-label="requests">
      {labels.map((label) => (
        <li key={label} className={chip}>
          {label}
        </li>
      ))}
      {trimmedNote && (
        <li className={cn(chip, 'max-w-full break-words whitespace-pre-wrap', compact && 'line-clamp-1')}>
          {trimmedNote}
        </li>
      )}
    </ul>
  )
}

export function StayRequestsBox({ tags, note }: { tags: RequestTag[]; note?: string }) {
  const { t } = useApp()
  const empty = tags.length === 0 && !note?.trim()
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-lg border px-3 py-2.5',
        empty ? 'border-dashed bg-muted/30' : 'border-warning/60 bg-warning/10',
      )}
    >
      <span
        className={cn(
          'flex items-center gap-1.5 text-xs font-semibold',
          empty ? 'text-muted-foreground' : 'text-warning-foreground',
        )}
      >
        <BellRing className="size-3.5" aria-hidden="true" />
        {t.agencyRequests}
      </span>
      {empty ? (
        <span className="text-xs text-muted-foreground">{t.noAgencyRequests}</span>
      ) : (
        <RequestTagChips tags={tags} note={note} />
      )}
    </div>
  )
}
