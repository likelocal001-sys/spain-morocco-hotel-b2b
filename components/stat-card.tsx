import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
}: {
  label: string
  value: React.ReactNode
  hint?: string
  icon?: LucideIcon
  tone?: 'default' | 'success' | 'danger' | 'primary'
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-xs',
        tone === 'danger' && 'border-destructive/40 bg-destructive/5',
        tone === 'primary' && 'border-primary bg-primary text-primary-foreground',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-xs font-medium text-muted-foreground', tone === 'primary' && 'text-white/75')}>
          {label}
        </span>
        {Icon && (
          <Icon
            aria-hidden="true"
            className={cn(
              'size-4 text-muted-foreground',
              tone === 'danger' && 'text-destructive',
              tone === 'primary' && 'text-white/75',
            )}
          />
        )}
      </div>
      <span
        className={cn(
          'font-mono text-2xl font-bold tabular-nums',
          tone === 'success' && 'text-success',
          tone === 'danger' && 'text-destructive',
        )}
      >
        {value}
      </span>
      {hint && <span className={cn('text-xs text-muted-foreground', tone === 'primary' && 'text-white/70')}>{hint}</span>}
    </div>
  )
}
