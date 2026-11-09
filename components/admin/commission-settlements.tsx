'use client'

import { useMemo, useState } from 'react'
import { BadgeCheck, ReceiptText } from 'lucide-react'
import { CommissionStateBadge, ReceiptDialog, commissionState } from '@/components/commission-receipt'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatEUR, formatMonth } from '@/lib/format'
import { settlementKey, useApp } from '@/lib/store'

export function CommissionSettlements() {
  const { t, lang, reservations, agencyName, settlements, commissionFor, confirmCommissionReceived } = useApp()
  const [receiptKey, setReceiptKey] = useState<string | null>(null)

  const rows = useMemo(() => {
    const keys = new Map<string, { agencyId: string; month: string; bookings: number }>()
    for (const r of reservations) {
      if (r.status !== 'confirmed') continue
      const month = r.checkIn.slice(0, 7)
      const key = settlementKey(r.agencyId, month)
      const row = keys.get(key) ?? { agencyId: r.agencyId, month, bookings: 0 }
      row.bookings += 1
      keys.set(key, row)
    }
    return Array.from(keys.entries())
      .map(([key, row]) => {
        const amount = commissionFor(row.agencyId, row.month)
        const settlement = settlements[key]
        return { key, ...row, amount, settlement, state: commissionState(settlement, amount) }
      })
      .sort((a, b) => {
        const priority = { reported: 0, changed: 1, unpaid: 2, received: 3 }
        return priority[a.state] - priority[b.state] || b.month.localeCompare(a.month)
      })
  }, [reservations, settlements, commissionFor])

  return (
    <section className="rounded-md border bg-card" aria-labelledby="commission-settlements">
      <div className="flex flex-col gap-1 border-b px-4 py-3">
        <h2 id="commission-settlements" className="text-sm font-semibold">
          {t.commissionSettlement}
        </h2>
        <p className="text-xs text-muted-foreground">{t.commissionSettlementHint}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">{t.noSettlements}</p>
      ) : (
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="pl-4">{t.agencyCol}</TableHead>
              <TableHead>{t.month}</TableHead>
              <TableHead className="text-right">{t.bookings}</TableHead>
              <TableHead className="text-right">{t.fee}</TableHead>
              <TableHead>{t.commissionPayment}</TableHead>
              <TableHead className="pr-4 text-right">
                <span className="sr-only">{t.viewReceipt}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key} className={row.state === 'reported' ? 'bg-amber-500/5' : undefined}>
                <TableCell className="pl-4 text-sm font-medium">{agencyName(row.agencyId)}</TableCell>
                <TableCell className="text-sm">{formatMonth(row.month, lang)}</TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums">{row.bookings}</TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">
                  {formatEUR(row.amount, lang)}
                  {row.state === 'changed' && (
                    <span className="block text-[11px] font-normal text-muted-foreground">
                      {t.receiptAmount}: {formatEUR(row.settlement?.receivedAmount ?? 0, lang)}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <CommissionStateBadge state={row.state} />
                    {row.settlement?.reportedAt && !row.settlement.receiptNo && (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {t.reportedOn} {formatDate(row.settlement.reportedAt.slice(0, 10), lang)}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="pr-4">
                  <div className="flex justify-end gap-2">
                    {row.state !== 'received' && (
                      <Button
                        size="sm"
                        variant={row.state === 'unpaid' ? 'outline' : 'default'}
                        onClick={() => confirmCommissionReceived(row.agencyId, row.month)}
                      >
                        <BadgeCheck aria-hidden="true" />
                        {row.state === 'changed' ? t.reissueReceipt : t.confirmCommissionReceived}
                      </Button>
                    )}
                    {row.settlement?.receiptNo && (
                      <Button size="sm" variant="outline" onClick={() => setReceiptKey(row.key)}>
                        <ReceiptText aria-hidden="true" />
                        {row.settlement.receiptNo}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <ReceiptDialog
        settlement={receiptKey ? settlements[receiptKey] : undefined}
        open={receiptKey !== null}
        onOpenChange={(open) => !open && setReceiptKey(null)}
      />
    </section>
  )
}
