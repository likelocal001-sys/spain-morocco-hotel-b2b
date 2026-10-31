'use client'

import { BellRing } from 'lucide-react'
import { REQUEST_TAG_LABELS } from '@/lib/i18n'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { RequestTag } from '@/lib/types'

export function RequestTagChips({ tags, compact = false }: { tags: RequestTag[]; compact?: boolean }) {
  const { lang } = useApp()
  if (tags.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-1" aria-label="requests">
      {tags.map((tag) => (
        <li
          key={tag}
          className={cn(
            'rounded-md border border-warning/50 bg-warning/20 font-medium text-warning-foreground',
            compact ? 'px-1.5 py-px text-[10px]' : 'px-2 py-0.5 text-xs',
          )}
        >
          {REQUEST_TAG_LABELS[tag][lang]}
        </li>
      ))}
    </ul>
  )
}

export function StayRequestsBox({ tags }: { tags: RequestTag[] }) {
  const { t } = useApp()
  const empty = tags.length === 0
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
        <RequestTagChips tags={tags} />
      )}
    </div>
  )
}
