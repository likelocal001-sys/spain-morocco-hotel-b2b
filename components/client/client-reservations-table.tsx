'use client'

import { CircleCheck, FileCheck2, FileSpreadsheet, Pencil, PencilLine, Wallet } from 'lucide-react'
import type { DocumentKind } from '@/components/document-dialog'
import { DeadlineCell, HotelCell, RoomsCell, StatusBadge, StayCell } from '@/components/reservation-cells'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getDeadline, stayPayments, unseenRevisions } from '@/lib/format'
import { useAttachmentDownload } from '@/hooks/use-attachment-download'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { Reservation } from '@/lib/types'

export function ClientReservationsTable({
  reservations,
  onOpenDocument,
  onEdit,
  onOpenPayments,
}: {
  reservations: Reservation[]
  onOpenDocument: (reservation: Reservation, kind: DocumentKind) => void
  onEdit: (reservation: Reservation) => void
  onOpenPayments: (reservation: Reservation) => void
}) {
  const { t } = useApp()
  const download = useAttachmentDownload()

  if (reservations.length === 0) {
    return <p className="px-4 py-12 text-center text-sm text-muted-foreground">{t.noResults}</p>
  }

  return (
    <Table className="min-w-[900px]">
      <TableHeader>
        <TableRow className="bg-muted/50 hover:bg-muted/50">
          <TableHead className="pl-4">{t.colId}</TableHead>
          <TableHead>{t.colGroup}</TableHead>
          <TableHead>{t.colStay}</TableHead>
          <TableHead>{t.colHotel}</TableHead>
          <TableHead>{t.colRooms}</TableHead>
          <TableHead>{t.colStatus}</TableHead>
          <TableHead>{t.colLimit}</TableHead>
          <TableHead className="pr-4">{t.colDocs}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reservations.map((r) => {
          const level = getDeadline(r).level
          const confirmed = r.status === 'confirmed'
          return (
            <TableRow
              key={r.id}
              className={cn(
                (level === 'critical' || level === 'expired') && 'bg-destructive/[0.04]',
                level === 'warn' && 'bg-warning/[0.07]',
              )}
            >
              <TableCell className="pl-4 font-mono text-xs font-medium">{r.id}</TableCell>
              <TableCell className="max-w-[240px] text-sm font-medium whitespace-normal">
                {r.groupName}
                {unseenRevisions(r).length > 0 && (
                  <span className="mt-1 flex w-fit items-center gap-1 rounded-sm bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning-foreground">
                    <PencilLine className="size-3" aria-hidden="true" />
                    {t.revisionPending}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <StayCell reservation={r} />
              </TableCell>
              <TableCell>
                <HotelCell reservation={r} />
              </TableCell>
              <TableCell>
                <RoomsCell reservation={r} />
              </TableCell>
              <TableCell>
                <StatusBadge status={r.status} />
              </TableCell>
              <TableCell>
                <DeadlineCell reservation={r} />
              </TableCell>
              <TableCell className="pr-4">
                <div className="flex gap-1">
                  <Button variant="outline" size="xs" onClick={() => onEdit(r)}>
                    <Pencil aria-hidden="true" />
                    {t.edit}
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={!confirmed}
                    onClick={() => onOpenDocument(r, 'voucher')}
                  >
                    <FileCheck2 aria-hidden="true" />
                    {t.voucher}
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={!confirmed || !r.paymentLimit}
                    onClick={() => onOpenDocument(r, 'payment')}
                  >
                    <Wallet aria-hidden="true" />
                    {t.paymentNotice}
                  </Button>
                  {confirmed && (
                    <Button
                      size="xs"
                      variant={r.paid ? 'outline' : 'default'}
                      className={cn(r.paid && 'border-success/40 text-success hover:bg-success/10 hover:text-success')}
                      onClick={() => onOpenPayments(r)}
                    >
                      <CircleCheck aria-hidden="true" />
                      {r.paid ? t.deposited : t.markDeposited}{' '}
                      <span className="font-mono tabular-nums">
                        {stayPayments(r).filter((p) => p.paid).length}/{stayPayments(r).length}
                      </span>
                    </Button>
                  )}
                  {r.roomingList && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`${t.roomingList}: ${r.roomingList.name}`}
                      title={r.roomingList.name}
                      onClick={() => r.roomingList && download(r.roomingList)}
                    >
                      <FileSpreadsheet />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
