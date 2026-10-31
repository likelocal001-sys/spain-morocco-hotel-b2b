'use client'

import { CheckCircle2, Clock, AlertTriangle, CircleDashed } from 'lucide-react'
import { DocRow, PrintButton } from '@/components/document-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate, formatEUR, formatMonth } from '@/lib/format'
import { settlementKey, useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { CommissionSettlement } from '@/lib/types'

export type CommissionState = 'unpaid' | 'reported' | 'received' | 'changed'

export function commissionState(settlement: CommissionSettlement | undefined, currentAmount: number): CommissionState {
  if (settlement?.receiptNo) {
    return Math.abs((settlement.receivedAmount ?? 0) - currentAmount) < 0.005 ? 'received' : 'changed'
  }
  return settlement?.reportedAt ? 'reported' : 'unpaid'
}

export function useCommission(agencyId: string, month: string | null) {
  const { settlements, commissionFor } = useApp()
  const settlement = month ? settlements[settlementKey(agencyId, month)] : undefined
  const amount = month ? commissionFor(agencyId, month) : 0
  return { settlement, amount, state: commissionState(settlement, amount) }
}

const STATE_STYLES: Record<CommissionState, { icon: typeof Clock; className: string }> = {
  unpaid: { icon: CircleDashed, className: 'border-border bg-muted text-muted-foreground' },
  reported: { icon: Clock, className: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  received: {
    icon: CheckCircle2,
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  changed: { icon: AlertTriangle, className: 'border-destructive/40 bg-destructive/10 text-destructive' },
}

export function CommissionStateBadge({ state }: { state: CommissionState }) {
  const { t } = useApp()
  const labels: Record<CommissionState, string> = {
    unpaid: t.commissionUnpaid,
    reported: t.commissionReported,
    received: t.commissionReceived,
    changed: t.commissionChanged,
  }
  const { icon: Icon, className } = STATE_STYLES[state]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {labels[state]}
    </span>
  )
}

export function ReceiptDialog({
  settlement,
  open,
  onOpenChange,
}: {
  settlement?: CommissionSettlement
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t, lang, agencyName } = useApp()
  if (!settlement?.receiptNo) return null
  const receivedDate = settlement.receivedAt?.slice(0, 10) ?? ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="no-print">
          <DialogTitle>{t.receiptTitle}</DialogTitle>
          <DialogDescription>{t.receiptDesc}</DialogDescription>
        </DialogHeader>

        <div className="print-area rounded-lg border bg-card p-5">
          <div className="flex items-start justify-between gap-4 border-b-2 border-primary pb-4">
            <div>
              <p className="font-mono text-xs font-bold tracking-widest text-primary">SP-MOROCCO HOTEL DESK</p>
              <h2 className="mt-1 text-xl font-bold">RECEIPT · {t.receiptTitle}</h2>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>{t.receiptNo}</p>
              <p className="font-mono text-sm font-semibold text-foreground">{settlement.receiptNo}</p>
            </div>
          </div>

          <div className="my-5 flex flex-col items-center gap-1 rounded-lg bg-primary/10 px-4 py-5 text-center">
            <p className="text-xs text-muted-foreground">{t.receiptAmount}</p>
            <p className="font-mono text-3xl font-bold text-primary tabular-nums">
              {formatEUR(settlement.receivedAmount ?? 0, lang)}
            </p>
          </div>

          <dl>
            <DocRow label={t.receivedFrom} value={agencyName(settlement.agencyId)} />
            <DocRow label={t.receiptPeriod} value={formatMonth(settlement.month, lang)} />
            <DocRow label={t.receiptFor} value={t.receiptForValue} />
            <DocRow label={t.receivedOn} value={<span className="font-mono">{formatDate(receivedDate, lang)}</span>} />
          </dl>

          <p className="mt-6 text-center text-sm">{t.receiptNote}</p>
          <div className="mt-6 flex justify-end">
            <div className="flex flex-col items-center gap-1 rounded-md border-2 border-primary/60 px-4 py-2 text-primary">
              <span className="font-mono text-[11px] font-bold tracking-widest">PAID</span>
              <span className="text-xs font-semibold">SP-Morocco Hotel Desk</span>
            </div>
          </div>
        </div>

        <div className="no-print flex justify-end">
          <PrintButton />
        </div>
      </DialogContent>
    </Dialog>
  )
}
