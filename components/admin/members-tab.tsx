'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import useSWR, { useSWRConfig } from 'swr'
import { createClient } from '@/lib/supabase/client'
import { ConfirmAction } from './confirm-action'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApp } from '@/lib/store'
import type { Role } from '@/lib/types'
import { cn } from '@/lib/utils'

const NO_AGENCY = '__none__'
const LOG_KEY = 'member-change-log'

type MemberPatch = { agencyId?: string | null; role?: Role }

interface LogRow {
  id: number
  member_email: string | null
  changed_by_email: string | null
  old_agency_id: string | null
  new_agency_id: string | null
  old_role: string | null
  new_role: string | null
  changed_at: string
}

async function fetchLog() {
  const { data, error } = await createClient()
    .from('member_change_log')
    .select('id, member_email, changed_by_email, old_agency_id, new_agency_id, old_role, new_role, changed_at')
    .order('changed_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data as LogRow[]
}

function MemberChangeLog() {
  const { t, lang, agencyName } = useApp()
  const { data } = useSWR(LOG_KEY, fetchLog)
  const agency = (id: string | null) => (id ? agencyName(id) : t.membersNoAgency)
  const role = (r: string | null) =>
    r === 'admin' ? t.roleAdminBadge : r === 'staff' ? t.roleStaffBadge : t.roleClientBadge

  return (
    <section className="flex flex-col gap-2" aria-labelledby="member-log-title">
      <h3 id="member-log-title" className="text-sm font-semibold">
        {t.memberLogTitle}
      </h3>
      <div className="rounded-xl border bg-card">
        {!data || data.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{t.memberLogEmpty}</p>
        ) : (
          <ul className="divide-y">
            {data.map((row) => (
              <li key={row.id} className="flex flex-col gap-0.5 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:gap-4">
                <time className="shrink-0 font-mono text-xs text-muted-foreground" dateTime={row.changed_at}>
                  {new Date(row.changed_at).toLocaleString(lang === 'ko' ? 'ko-KR' : 'es-ES', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </time>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{row.member_email}</span>{' '}
                  <span className="text-muted-foreground">
                    {row.old_agency_id !== row.new_agency_id &&
                      `${agency(row.old_agency_id)} → ${agency(row.new_agency_id)}`}
                    {row.old_agency_id !== row.new_agency_id && row.old_role !== row.new_role && ' · '}
                    {row.old_role !== row.new_role && `${role(row.old_role)} → ${role(row.new_role)}`}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {t.memberLogBy}: {row.changed_by_email ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function NewAgencyForm() {
  const { t, createAgency } = useApp()
  const [nameKo, setNameKo] = useState('')
  const [nameEs, setNameEs] = useState('')
  const [saving, setSaving] = useState(false)

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!nameKo.trim() || !nameEs.trim()) return
    setSaving(true)
    const created = await createAgency(nameKo.trim(), nameEs.trim())
    setSaving(false)
    if (created) {
      toast.success(t.agencyCreated, { description: nameKo })
      setNameKo('')
      setNameEs('')
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="agency-ko">{t.agencyNameKo}</Label>
        <Input id="agency-ko" required value={nameKo} onChange={(e) => setNameKo(e.target.value)} />
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="agency-es">{t.agencyNameEs}</Label>
        <Input id="agency-es" required value={nameEs} onChange={(e) => setNameEs(e.target.value)} />
      </div>
      <Button type="submit" disabled={saving}>
        <Plus aria-hidden="true" />
        {t.agencyCreate}
      </Button>
    </form>
  )
}

export function MembersTab() {
  const { t, members, agencies, agencyName, updateMember, profile } = useApp()
  const sorted = [...members].sort(
    (a, b) => Number(Boolean(a.agencyId) || a.role === 'admin') - Number(Boolean(b.agencyId) || b.role === 'admin'),
  )
  const pendingCount = members.filter((m) => m.role === 'client' && !m.agencyId).length

  const [pending, setPending] = useState<{ id: string; email: string; patch: MemberPatch } | null>(null)
  const { mutate } = useSWRConfig()

  const save = async (id: string, patch: MemberPatch) => {
    if (await updateMember(id, patch)) {
      toast.success(t.membersSaved)
      mutate(LOG_KEY)
    }
  }

  const request = (member: { id: string; email: string; agencyId?: string | null }, patch: MemberPatch) => {
    const firstAssignment = 'agencyId' in patch && !member.agencyId && patch.agencyId && !('role' in patch)
    if (firstAssignment) return save(member.id, patch)
    setPending({ id: member.id, email: member.email, patch })
  }

  const describe = (patch: MemberPatch) =>
    'role' in patch
      ? `${t.membersRole}: ${patch.role === 'admin' ? t.roleAdminBadge : patch.role === 'staff' ? t.roleStaffBadge : t.roleClientBadge}`
      : `${t.membersAgency}: ${patch.agencyId ? agencyName(patch.agencyId) : t.membersNoAgency}`

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t.membersTitle}</h2>
          <p className="max-w-2xl text-sm text-muted-foreground text-pretty">{t.membersDesc}</p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-warning text-warning-foreground">
            {t.membersPending} {pendingCount}
          </Badge>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.membersName}</TableHead>
              <TableHead>{t.membersEmail}</TableHead>
              <TableHead className="w-64">{t.membersAgency}</TableHead>
              <TableHead className="w-44">{t.membersRole}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  {t.membersEmpty}
                </TableCell>
              </TableRow>
            )}
            {sorted.map((member) => {
              const pending = member.role === 'client' && !member.agencyId
              const isSelf = member.id === profile.id
              return (
                <TableRow key={member.id} className={cn(pending && 'bg-warning/10')}>
                  <TableCell>
                    <p className="font-medium">
                      {member.fullName || '—'}
                      {isSelf && (
                        <Badge variant="secondary" className="ml-2">
                          {t.membersSelf}
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.company || '—'}</p>
                  </TableCell>
                  <TableCell className="text-sm">{member.email}</TableCell>
                  <TableCell>
                    <Select
                      value={member.agencyId ?? NO_AGENCY}
                      onValueChange={(value) => request(member, { agencyId: value === NO_AGENCY ? null : value })}
                    >
                      <SelectTrigger
                        aria-label={`${member.email} ${t.membersAgency}`}
                        className={cn('w-full', pending && 'border-warning')}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_AGENCY}>{t.membersNoAgency}</SelectItem>
                        {agencies.map((agency) => (
                          <SelectItem key={agency.id} value={agency.id}>
                            {agencyName(agency.id)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={member.role}
                      disabled={isSelf}
                      onValueChange={(value) => request(member, { role: value as Role })}
                    >
                      <SelectTrigger aria-label={`${member.email} ${t.membersRole}`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">{t.roleClientBadge}</SelectItem>
                        <SelectItem value="staff">{t.roleStaffBadge}</SelectItem>
                        <SelectItem value="admin">{t.roleAdminBadge}</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {pending && (
        <ConfirmAction
          title={t.memberChangeTitle}
          description={
            <>
              <span className="block font-medium text-foreground">
                {pending.email} → {describe(pending.patch)}
              </span>
              <span className="mt-1 block">
                {pending.patch.role === 'admin'
                  ? t.memberAdminWarn
                  : pending.patch.role === 'staff'
                    ? t.memberStaffWarn
                    : t.memberChangeWarn}
              </span>
            </>
          }
          confirmLabel={t.confirmProceed}
          destructive={pending.patch.role === 'admin'}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            const { id, patch } = pending
            setPending(null)
            save(id, patch)
          }}
        />
      )}

      <MemberChangeLog />

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{t.agencyNew}</h3>
        <NewAgencyForm />
        <p className="text-xs text-muted-foreground">
          {t.agencyList}: {agencies.map((a) => agencyName(a.id)).join(', ')}
        </p>
      </div>
    </div>
  )
}
