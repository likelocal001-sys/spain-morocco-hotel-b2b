'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, FileText, Plus, Receipt } from 'lucide-react'
import { DocumentDialog, type DocumentKind } from '@/components/document-dialog'
import { StatCard } from '@/components/stat-card'
import { StatusFilter } from '@/components/status-filter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getDeadline } from '@/lib/format'
import { useApp } from '@/lib/store'
import type { Reservation, ReservationStatus } from '@/lib/types'
import { ClientReservationsTable } from './client-reservations-table'
import { InvoiceDialog } from './invoice-dialog'
import { NewBookingDialog } from './new-booking-dialog'

export function ClientPortal() {
  const { t, reservations, currentAgencyId, agencyName } = useApp()
  const [bookingOpen, setBookingOpen] = useState(false)
  const [editing, setEditing] = useState<Reservation | null>(null)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [doc, setDoc] = useState<{ reservation: Reservation; kind: DocumentKind } | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ReservationStatus | 'all'>('all')

  const mine = useMemo(() => reservations.filter((r) => r.agencyId === currentAgencyId), [reservations, currentAgencyId])
  const urgent = mine.filter((r) => ['warn', 'critical', 'expired'].includes(getDeadline(r).level))

  const filtered = mine
    .filter((r) => status === 'all' || r.status === status)
    .filter((r) => {
      const q = query.trim().toLowerCase()
      return !q || r.groupName.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    })
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-medium text-primary">{agencyName(currentAgencyId)}</p>
          <h1 className="text-2xl font-bold tracking-tight text-balance">{t.clientTitle}</h1>
          <p className="text-sm text-muted-foreground text-pretty">{t.clientSubtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setInvoiceOpen(true)}>
            <Receipt aria-hidden="true" />
            {t.monthlyInvoice}
          </Button>
          <Button onClick={() => setBookingOpen(true)}>
            <Plus aria-hidden="true" />
            {t.newBooking}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t.statTotal} value={mine.length} icon={FileText} />
        <StatCard
          label={t.statActive}
          value={mine.filter((r) => r.status === 'pending' || r.status === 'in_progress').length}
        />
        <StatCard label={t.statConfirmed} value={mine.filter((r) => r.status === 'confirmed').length} tone="success" />
        <StatCard label={t.statUrgent} value={urgent.length} tone={urgent.length ? 'danger' : 'default'} icon={AlertTriangle} />
      </div>

      {urgent.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="font-medium text-destructive">
              {urgent.length}
              {t.urgentCount} · {urgent.map((r) => r.id).join(', ')}
            </p>
            <p className="text-muted-foreground">{t.urgentBanner}</p>
          </div>
        </div>
      )}

      <section className="rounded-xl border bg-card shadow-xs">
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center">
          <label htmlFor="client-search" className="sr-only">
            {t.searchPlaceholder}
          </label>
          <Input
            id="client-search"
            type="search"
            placeholder={t.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:max-w-xs"
          />
          <StatusFilter value={status} onChange={setStatus} />
        </div>
        <ClientReservationsTable
          reservations={filtered}
            onOpenDocument={(reservation, kind) => setDoc({ reservation, kind })}
            onEdit={setEditing}
          />
      </section>

      <NewBookingDialog open={bookingOpen} onOpenChange={setBookingOpen} />
      {editing && (
        <NewBookingDialog
          key={editing.id}
          open
          reservation={editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
      <InvoiceDialog open={invoiceOpen} onOpenChange={setInvoiceOpen} />
      {doc && <DocumentDialog reservation={doc.reservation} kind={doc.kind} onOpenChange={(o) => !o && setDoc(null)} />}
    </div>
  )
}
