'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
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

  const save = async (id: string, patch: { agencyId?: string | null; role?: Role }) => {
    if (await updateMember(id, patch)) toast.success(t.membersSaved)
  }

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
                      onValueChange={(value) => save(member.id, { agencyId: value === NO_AGENCY ? null : value })}
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
                      onValueChange={(value) => save(member.id, { role: value as Role })}
                    >
                      <SelectTrigger aria-label={`${member.email} ${t.membersRole}`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">{t.roleClientBadge}</SelectItem>
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
