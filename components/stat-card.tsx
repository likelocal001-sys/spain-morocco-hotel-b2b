import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * A figure with a rule above it — reads like a line in a ledger rather than a tile.
 * `icon` is accepted for API compatibility but intentionally not rendered.
 */
export function StatCard({
  label,
  value,
  hint,
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
        'flex flex-col gap-1 border-t-2 border-foreground/80 pt-2.5',
        tone === 'danger' && 'border-destructive',
        tone === 'primary' && 'border-brand',
        tone === 'success' && 'border-success',
      )}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          'font-mono text-[1.75rem] leading-none font-semibold tracking-tight tabular-nums',
          tone === 'success' && 'text-success',
          tone === 'danger' && 'text-destructive',
          tone === 'primary' && 'text-brand',
        )}
      >
        {value}
      </span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}
