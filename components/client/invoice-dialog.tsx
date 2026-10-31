'use client'

import { useMemo, useState } from 'react'
import { DocHeader, PrintButton } from '@/components/document-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatEUR, formatMonth, formatShortDate, roomNights } from '@/lib/format'
import { useApp } from '@/lib/store'

export function InvoiceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, lang, reservations, currentAgencyId, feeFor, agencyName } = useApp()

  const confirmed = useMemo(
    () => reservations.filter((r) => r.agencyId === currentAgencyId && r.status === 'confirmed'),
    [reservations, currentAgencyId],
  )
  const months = useMemo(
    () => Array.from(new Set(confirmed.map((r) => r.checkIn.slice(0, 7)))).sort().reverse(),
    [confirmed],
  )
  const [month, setMonth] = useState<string | null>(null)
  const selectedMonth = month ?? months[0] ?? null
  const lines = confirmed.filter((r) => r.checkIn.slice(0, 7) === selectedMonth)

  const hotelTotal = lines.reduce((sum, r) => sum + (r.finalAmount ?? 0), 0)
  const feeTotal = lines.reduce((sum, r) => sum + feeFor(r), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="no-print">
          <DialogTitle>{t.invoiceTitle}</DialogTitle>
          <DialogDescription>{t.invoiceDesc}</DialogDescription>
        </DialogHeader>

        <div className="no-print flex items-center gap-2">
          <Label htmlFor="invoice-month">{t.month}</Label>
          <Select
            items={months.map((m) => ({ value: m, label: formatMonth(m, lang) }))}
            value={selectedMonth}
            onValueChange={(v) => v && setMonth(v as string)}
          >
            <SelectTrigger id="invoice-month" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {formatMonth(m, lang)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="print-area rounded-lg border bg-card p-5">
          <DocHeader
            title={`Invoice · ${selectedMonth ? formatMonth(selectedMonth, lang) : ''}`}
            subtitle={`${t.billTo}: ${agencyName(currentAgencyId)}`}
          />
          {lines.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t.noInvoice}</p>
          ) : (
            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead>{t.colId}</TableHead>
                  <TableHead>{t.colGroup}</TableHead>
                  <TableHead className="text-right">{t.roomNights}</TableHead>
                  <TableHead className="text-right">{t.hotelAmount}</TableHead>
                  <TableHead className="text-right">{t.serviceFee}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
                    <TableCell className="max-w-[220px] text-xs whitespace-normal">
                      {r.groupName}
                      <span className="block font-mono text-[11px] text-muted-foreground">
                        {formatShortDate(r.checkIn, lang)} → {formatShortDate(r.checkOut, lang)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">{roomNights(r)}</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {formatEUR(r.finalAmount, lang)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {formatEUR(feeFor(r), lang)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-xs">
                    {t.subtotal}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">{formatEUR(hotelTotal, lang)}</TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">{formatEUR(feeTotal, lang)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={4} className="font-semibold">
                    {t.grandTotal}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-primary tabular-nums">
                    {formatEUR(hotelTotal + feeTotal, lang)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </div>

        <div className="no-print flex justify-end">
          <PrintButton />
        </div>
      </DialogContent>
    </Dialog>
  )
}
