'use client'

import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { ReservationStatus } from '@/lib/types'

const STATUSES: (ReservationStatus | 'all')[] = ['all', 'pending', 'in_progress', 'confirmed', 'cancelled']

export function StatusFilter({
  value,
  onChange,
  counts,
}: {
  value: ReservationStatus | 'all'
  onChange: (value: ReservationStatus | 'all') => void
  counts?: Partial<Record<ReservationStatus | 'all', number>>
}) {
  const { t } = useApp()
  return (
    <div role="radiogroup" aria-label={t.colStatus} className="flex flex-wrap gap-1">
      {STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          role="radio"
          aria-checked={value === status}
          onClick={() => onChange(status)}
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            value === status ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {status === 'all' ? t.allStatuses : t[`status_${status}`]}
          {counts?.[status] !== undefined && (
            <span
              className={cn(
                'rounded px-1 font-mono text-[10px] tabular-nums',
                value === status ? 'bg-white/20' : 'bg-muted',
              )}
            >
              {counts[status]}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
