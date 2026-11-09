'use client'

import { Clock, Download, LogIn, LogOut, Pencil, Settings2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import useSWR, { useSWRConfig } from 'swr'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  DEFAULT_SETTINGS,
  TIMEZONES,
  evaluateMonth,
  formatDuration,
  summarize,
  timeIn,
  todayIn,
  zonedToUtc,
  type AttendanceRecord,
  type AttendanceSettings,
  type DayResult,
  type DayStatus,
  type MonthSummary,
} from '@/lib/attendance'
import type { Dict } from '@/lib/i18n'
import { useApp, type Profile } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const SETTINGS_KEY = 'attendance-settings'

interface AttendanceRow {
  id: number
  user_id: string
  work_date: string
  check_in: string | null
  check_out: string | null
  kind: 'work' | 'leave'
  note: string | null
  edited_by_email: string | null
  edited_at: string | null
}

const toRecord = (r: AttendanceRow): AttendanceRecord => ({
  id: r.id,
  userId: r.user_id,
  workDate: r.work_date,
  checkIn: r.check_in,
  checkOut: r.check_out,
  kind: r.kind,
  note: r.note,
  editedByEmail: r.edited_by_email,
  editedAt: r.edited_at,
})

async function fetchSettings(): Promise<AttendanceSettings> {
  const { data, error } = await createClient()
    .from('attendance_settings')
    .select('work_start, work_end, grace_minutes, timezone, workdays')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw error
  if (!data) return DEFAULT_SETTINGS
  return {
    workStart: String(data.work_start).slice(0, 5),
    workEnd: String(data.work_end).slice(0, 5),
    graceMinutes: data.grace_minutes,
    timezone: data.timezone,
    workdays: data.workdays ?? DEFAULT_SETTINGS.workdays,
  }
}

async function fetchMonth([, month]: [string, string]): Promise<AttendanceRecord[]> {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const { data, error } = await createClient()
    .from('attendance')
    .select('id, user_id, work_date, check_in, check_out, kind, note, edited_by_email, edited_at')
    .gte('work_date', `${month}-01`)
    .lte('work_date', `${month}-${String(last).padStart(2, '0')}`)
  if (error) throw error
  return (data as AttendanceRow[]).map(toRecord)
}

async function fetchToday([, userId, date]: [string, string, string]): Promise<AttendanceRecord | null> {
  const { data, error } = await createClient()
    .from('attendance')
    .select('id, user_id, work_date, check_in, check_out, kind, note, edited_by_email, edited_at')
    .eq('user_id', userId)
    .eq('work_date', date)
    .maybeSingle()
  if (error) throw error
  return data ? toRecord(data as AttendanceRow) : null
}

const memberName = (m: Profile) => m.fullName || m.email

const STATUS_STYLE: Record<DayStatus, string> = {
  normal: 'bg-success/15 text-success border-transparent',
  working: 'bg-primary/10 text-primary border-transparent',
  late: 'bg-warning/20 text-warning-foreground border-transparent',
  early: 'bg-warning/20 text-warning-foreground border-transparent',
  absent: 'bg-destructive/10 text-destructive border-transparent',
  missingOut: 'bg-destructive/10 text-destructive border-transparent',
  leave: 'bg-secondary text-secondary-foreground border-transparent',
  off: 'bg-muted text-muted-foreground border-transparent',
  upcoming: 'bg-muted text-muted-foreground border-transparent',
}

function statusLabel(status: DayStatus, t: Dict) {
  const labels: Record<DayStatus, string> = {
    normal: t.attStatusNormal,
    working: t.attWorking,
    late: t.attLate,
    early: t.attEarly,
    absent: t.attAbsent,
    missingOut: t.attMissingOut,
    leave: t.attLeave,
    off: t.attStatusOff,
    upcoming: t.attStatusUpcoming,
  }
  return labels[status]
}

function TodayCard({ settings }: { settings: AttendanceSettings }) {
  const { t, profile } = useApp()
  const { mutate } = useSWRConfig()
  const today = todayIn(settings.timezone)
  const key: [string, string, string] = ['attendance-today', profile.id, today]
  const { data: record, mutate: mutateToday } = useSWR(key, fetchToday)
  const [busy, setBusy] = useState(false)

  const punch = async (action: 'clock_in' | 'clock_out') => {
    setBusy(true)
    const { error } = await createClient().rpc(action)
    setBusy(false)
    if (error) {
      console.error('[v0] attendance punch failed:', error)
      toast.error(t.attFailed)
      return
    }
    toast.success(action === 'clock_in' ? t.attClockedIn : t.attClockedOut)
    await mutateToday()
    await mutate((k) => Array.isArray(k) && k[0] === 'attendance-month')
  }

  const weekday = t.attWeekdays[new Date(`${today}T00:00:00Z`).getUTCDay()]

  return (
    <section
      aria-labelledby="att-today-title"
      className="flex flex-col gap-4 rounded-md border bg-card p-4 md:flex-row md:items-center md:justify-between"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Clock className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h2 id="att-today-title" className="text-sm font-semibold">
            {t.attTodayTitle}
            <span className="ml-2 font-normal text-muted-foreground">
              {today} ({weekday})
            </span>
          </h2>
          <p className="text-xs text-muted-foreground text-pretty">{t.attServerTimeHint}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <dl className="flex gap-5 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">{t.attCheckIn}</dt>
            <dd className="font-semibold tabular-nums">{timeIn(record?.checkIn ?? null, settings.timezone) || t.attNotYet}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t.attCheckOut}</dt>
            <dd className="font-semibold tabular-nums">
              {timeIn(record?.checkOut ?? null, settings.timezone) || t.attNotYet}
            </dd>
          </div>
        </dl>
        {!record?.checkIn ? (
          <Button onClick={() => punch('clock_in')} disabled={busy || record?.kind === 'leave'}>
            <LogIn aria-hidden="true" />
            {t.attClockIn}
          </Button>
        ) : (
          <Button variant="outline" onClick={() => punch('clock_out')} disabled={busy}>
            <LogOut aria-hidden="true" />
            {t.attClockOut}
          </Button>
        )}
      </div>
    </section>
  )
}

function SettingsDialog({
  open,
  onOpenChange,
  settings,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: AttendanceSettings
}) {
  const { t } = useApp()
  const { mutate } = useSWRConfig()
  const [draft, setDraft] = useState(settings)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const { error } = await createClient()
      .from('attendance_settings')
      .update({
        work_start: draft.workStart,
        work_end: draft.workEnd,
        grace_minutes: Math.min(120, Math.max(0, Math.round(draft.graceMinutes) || 0)),
        timezone: draft.timezone,
        workdays: [...draft.workdays].sort(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
    setSaving(false)
    if (error) {
      console.error('[v0] attendance settings save failed:', error)
      toast.error(t.attFailed)
      return
    }
    toast.success(t.attSaved)
    await mutate(SETTINGS_KEY)
    onOpenChange(false)
  }

  const toggleDay = (day: number, checked: boolean) =>
    setDraft((d) => ({ ...d, workdays: checked ? [...d.workdays, day] : d.workdays.filter((x) => x !== day) }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.attSettingsTitle}</DialogTitle>
          <DialogDescription className="sr-only">{t.attSettingsTitle}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="att-start">{t.attWorkStart}</Label>
            <Input
              id="att-start"
              type="time"
              value={draft.workStart}
              onChange={(e) => setDraft((d) => ({ ...d, workStart: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="att-end">{t.attWorkEnd}</Label>
            <Input
              id="att-end"
              type="time"
              value={draft.workEnd}
              onChange={(e) => setDraft((d) => ({ ...d, workEnd: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="att-grace">{t.attGrace}</Label>
            <Input
              id="att-grace"
              type="number"
              min={0}
              max={120}
              value={draft.graceMinutes}
              onChange={(e) => setDraft((d) => ({ ...d, graceMinutes: Number(e.target.value) }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="att-tz">{t.attTimezone}</Label>
            <Select value={draft.timezone} onValueChange={(timezone) => timezone && setDraft((d) => ({ ...d, timezone }))}>
              <SelectTrigger id="att-tz" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <fieldset className="col-span-2 flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">{t.attWorkdaysLabel}</legend>
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <label key={day} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={draft.workdays.includes(day)}
                    onCheckedChange={(checked) => toggleDay(day, checked === true)}
                  />
                  {t.attWeekdays[day]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.cancel}
          </Button>
          <Button onClick={save} disabled={saving || !draft.workStart || !draft.workEnd}>
            {t.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditDialog({
  target,
  onClose,
  settings,
  month,
}: {
  target: { member: Profile; day: DayResult } | null
  onClose: () => void
  settings: AttendanceSettings
  month: string
}) {
  const { t, profile } = useApp()
  const { mutate } = useSWRConfig()
  const record = target?.day.record
  const [kind, setKind] = useState<'work' | 'leave'>(record?.kind ?? 'work')
  const [checkIn, setCheckIn] = useState(timeIn(record?.checkIn ?? null, settings.timezone))
  const [checkOut, setCheckOut] = useState(timeIn(record?.checkOut ?? null, settings.timezone))
  const [note, setNote] = useState(record?.note ?? '')
  const [saving, setSaving] = useState(false)

  if (!target) return null
  const { member, day } = target

  const refresh = async () => {
    await mutate(['attendance-month', month])
    await mutate((k) => Array.isArray(k) && k[0] === 'attendance-today')
  }

  const save = async () => {
    setSaving(true)
    const { error } = await createClient()
      .from('attendance')
      .upsert(
        {
          user_id: member.id,
          work_date: day.date,
          kind,
          check_in: kind === 'work' && checkIn ? zonedToUtc(day.date, checkIn, settings.timezone) : null,
          check_out: kind === 'work' && checkOut ? zonedToUtc(day.date, checkOut, settings.timezone) : null,
          note: note.trim() || null,
          edited_by_email: profile.email,
          edited_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,work_date' },
      )
    setSaving(false)
    if (error) {
      console.error('[v0] attendance edit failed:', error)
      toast.error(t.attFailed)
      return
    }
    toast.success(t.attSaved)
    await refresh()
    onClose()
  }

  const remove = async () => {
    if (!record) return
    setSaving(true)
    const { error } = await createClient().from('attendance').delete().eq('id', record.id)
    setSaving(false)
    if (error) {
      toast.error(t.attFailed)
      return
    }
    toast.success(t.attSaved)
    await refresh()
    onClose()
  }

  const outBeforeIn = kind === 'work' && checkIn && checkOut && checkOut < checkIn

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.attEditTitle}</DialogTitle>
          <DialogDescription>
            {memberName(member)} · {day.date} ({t.attWeekdays[day.weekday]})
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="att-kind">{t.attKind}</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as 'work' | 'leave')}>
              <SelectTrigger id="att-kind" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="work">{t.attKindWork}</SelectItem>
                <SelectItem value="leave">{t.attKindLeave}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {kind === 'work' && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="att-in">{t.attCheckIn}</Label>
                <Input id="att-in" type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="att-out">{t.attCheckOut}</Label>
                <Input
                  id="att-out"
                  type="time"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  aria-invalid={Boolean(outBeforeIn)}
                />
              </div>
            </>
          )}
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="att-note">{t.attNote}</Label>
            <Textarea id="att-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          {record ? (
            <Button variant="ghost" className="text-destructive" onClick={remove} disabled={saving}>
              {t.attDelete}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {t.cancel}
            </Button>
            <Button onClick={save} disabled={saving || Boolean(outBeforeIn)}>
              {t.save}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SummaryCells({ s }: { s: MonthSummary }) {
  const warn = (n: number, tone: 'warning' | 'destructive') =>
    n > 0 ? (tone === 'warning' ? 'font-semibold text-warning-foreground' : 'font-semibold text-destructive') : ''
  return (
    <>
      <TableCell className="text-right tabular-nums">{s.workdays}</TableCell>
      <TableCell className="text-right tabular-nums">{s.present}</TableCell>
      <TableCell className={cn('text-right tabular-nums', warn(s.late, 'warning'))}>{s.late}</TableCell>
      <TableCell className={cn('text-right tabular-nums', warn(s.early, 'warning'))}>{s.early}</TableCell>
      <TableCell className={cn('text-right tabular-nums', warn(s.absent, 'destructive'))}>{s.absent}</TableCell>
      <TableCell className={cn('text-right tabular-nums', warn(s.missingOut, 'destructive'))}>{s.missingOut}</TableCell>
      <TableCell className="text-right tabular-nums">{s.leave}</TableCell>
      <TableCell className="text-right tabular-nums">{formatDuration(s.minutes)}</TableCell>
    </>
  )
}

async function exportExcel(
  rows: { member: Profile; days: DayResult[]; summary: MonthSummary }[],
  month: string,
  settings: AttendanceSettings,
  t: Dict,
) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()

  const summary = wb.addWorksheet(t.attSheetSummary)
  summary.columns = [
    { header: t.attEmployee, key: 'name', width: 24 },
    { header: t.membersEmail, key: 'email', width: 28 },
    { header: t.attWorkdays, key: 'workdays', width: 10 },
    { header: t.attPresent, key: 'present', width: 10 },
    { header: t.attLate, key: 'late', width: 10 },
    { header: t.attEarly, key: 'early', width: 10 },
    { header: t.attAbsent, key: 'absent', width: 10 },
    { header: t.attMissingOut, key: 'missingOut', width: 12 },
    { header: t.attLeave, key: 'leave', width: 10 },
    { header: t.attTotalHours, key: 'hours', width: 14 },
  ]
  for (const { member, summary: s } of rows) {
    summary.addRow({
      name: memberName(member),
      email: member.email,
      ...s,
      hours: formatDuration(s.minutes),
    })
  }

  const detail = wb.addWorksheet(t.attSheetDetail)
  detail.columns = [
    { header: t.attEmployee, key: 'name', width: 24 },
    { header: t.attDate, key: 'date', width: 12 },
    { header: '', key: 'weekday', width: 6 },
    { header: t.attCheckIn, key: 'in', width: 10 },
    { header: t.attCheckOut, key: 'out', width: 10 },
    { header: t.attHours, key: 'hours', width: 10 },
    { header: t.attStatus, key: 'status', width: 18 },
    { header: t.attNote, key: 'note', width: 30 },
    { header: t.attEditedBy, key: 'edited', width: 28 },
  ]
  for (const { member, days } of rows) {
    for (const day of days) {
      detail.addRow({
        name: memberName(member),
        date: day.date,
        weekday: t.attWeekdays[day.weekday],
        in: timeIn(day.record?.checkIn ?? null, settings.timezone),
        out: timeIn(day.record?.checkOut ?? null, settings.timezone),
        hours: day.minutes ? formatDuration(day.minutes) : '',
        status: day.statuses.map((s) => statusLabel(s, t)).join(', '),
        note: day.record?.note ?? '',
        edited: day.record?.editedByEmail ?? '',
      })
    }
  }

  for (const sheet of [summary, detail]) {
    sheet.getRow(1).font = { bold: true }
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
  }

  const buffer = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = `attendance-${month}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

export function AttendanceTab() {
  const { t, role, profile, members } = useApp()
  const isManager = role === 'admin'
  const { data: settings = DEFAULT_SETTINGS } = useSWR(SETTINGS_KEY, fetchSettings)
  const today = todayIn(settings.timezone)
  const [month, setMonth] = useState(today.slice(0, 7))
  const { data: records = [] } = useSWR(['attendance-month', month] as [string, string], fetchMonth)
  const [selectedId, setSelectedId] = useState(profile.id)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editing, setEditing] = useState<{ member: Profile; day: DayResult } | null>(null)
  const [exporting, setExporting] = useState(false)

  const employees = useMemo(() => {
    if (!isManager) return [profile]
    const internal = members.filter((m) => m.role !== 'client')
    return internal.some((m) => m.id === profile.id) ? internal : [profile, ...internal]
  }, [isManager, members, profile])

  const rows = useMemo(
    () =>
      employees.map((member) => {
        const days = evaluateMonth(
          month,
          records.filter((r) => r.userId === member.id),
          settings,
          today,
        )
        return { member, days, summary: summarize(days) }
      }),
    [employees, records, settings, month, today],
  )

  const selected = rows.find((r) => r.member.id === selectedId) ?? rows[0]

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportExcel(rows, month, settings, t)
    } catch (error) {
      console.error('[v0] attendance export failed:', error)
      toast.error(t.attFailed)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <TodayCard settings={settings} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="att-month">{t.attMonth}</Label>
            <Input
              id="att-month"
              type="month"
              value={month}
              max={today.slice(0, 7)}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="w-44"
            />
          </div>
          <p className="pb-2 text-xs text-muted-foreground">
            {t.attRule}: {settings.workStart}–{settings.workEnd} · {t.attGrace} {settings.graceMinutes} ·{' '}
            {settings.workdays
              .slice()
              .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
              .map((d) => t.attWeekdays[d])
              .join(' ')}{' '}
            · {settings.timezone}
          </p>
        </div>
        <div className="flex gap-2">
          {isManager && (
            <Button variant="outline" onClick={() => setSettingsOpen(true)}>
              <Settings2 aria-hidden="true" />
              {t.attSettingsTitle}
            </Button>
          )}
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download aria-hidden="true" />
            {t.attExport}
          </Button>
        </div>
      </div>

      <section aria-labelledby="att-summary-title" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <h3 id="att-summary-title" className="text-sm font-semibold">
            {t.attSummaryTitle}
          </h3>
          {isManager && rows.length > 1 && <p className="text-xs text-muted-foreground">{t.attSummaryHint}</p>}
        </div>
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.attEmployee}</TableHead>
                <TableHead className="text-right">{t.attWorkdays}</TableHead>
                <TableHead className="text-right">{t.attPresent}</TableHead>
                <TableHead className="text-right">{t.attLate}</TableHead>
                <TableHead className="text-right">{t.attEarly}</TableHead>
                <TableHead className="text-right">{t.attAbsent}</TableHead>
                <TableHead className="text-right">{t.attMissingOut}</TableHead>
                <TableHead className="text-right">{t.attLeave}</TableHead>
                <TableHead className="text-right">{t.attTotalHours}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ member, summary }) => {
                const active = member.id === selected?.member.id
                return (
                  <TableRow
                    key={member.id}
                    onClick={() => setSelectedId(member.id)}
                    aria-selected={active}
                    className={cn('cursor-pointer', active && 'bg-primary/5')}
                  >
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setSelectedId(member.id)}
                        className="text-left font-medium hover:underline"
                      >
                        {memberName(member)}
                      </button>
                      <p className="text-xs text-muted-foreground">
                        {member.role === 'admin' ? t.roleAdminBadge : t.roleStaffBadge}
                      </p>
                    </TableCell>
                    <SummaryCells s={summary} />
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      {selected && (
        <section aria-labelledby="att-detail-title" className="flex flex-col gap-2">
          <h3 id="att-detail-title" className="text-sm font-semibold">
            {t.attDetailTitle} · {memberName(selected.member)}
          </h3>
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.attDate}</TableHead>
                  <TableHead>{t.attCheckIn}</TableHead>
                  <TableHead>{t.attCheckOut}</TableHead>
                  <TableHead>{t.attHours}</TableHead>
                  <TableHead>{t.attStatus}</TableHead>
                  <TableHead>{t.attNote}</TableHead>
                  {isManager && <TableHead className="w-16" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {selected.days.map((day) => (
                  <TableRow key={day.date} className={cn(!day.isWorkday && 'bg-muted/40')}>
                    <TableCell className="tabular-nums">
                      {day.date.slice(5)}{' '}
                      <span className={cn('text-xs', day.weekday === 0 ? 'text-destructive' : 'text-muted-foreground')}>
                        ({t.attWeekdays[day.weekday]})
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">{timeIn(day.record?.checkIn ?? null, settings.timezone) || '—'}</TableCell>
                    <TableCell className="tabular-nums">
                      {timeIn(day.record?.checkOut ?? null, settings.timezone) || '—'}
                    </TableCell>
                    <TableCell className="tabular-nums">{formatDuration(day.minutes)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {day.statuses.map((s) => (
                          <Badge key={s} variant="outline" className={STATUS_STYLE[s]}>
                            {statusLabel(s, t)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-64 text-xs whitespace-normal text-muted-foreground">
                      {day.record?.note}
                      {day.record?.editedByEmail && (
                        <span className="block text-[11px]">
                          {t.attEditedBy}: {day.record.editedByEmail}
                        </span>
                      )}
                    </TableCell>
                    {isManager && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditing({ member: selected.member, day })}
                          aria-label={`${day.date} ${t.attEdit}`}
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {isManager && settingsOpen && (
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} settings={settings} />
      )}
      {editing && (
        <EditDialog
          key={`${editing.member.id}-${editing.day.date}`}
          target={editing}
          onClose={() => setEditing(null)}
          settings={settings}
          month={month}
        />
      )}
    </div>
  )
}
