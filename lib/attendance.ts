export interface AttendanceSettings {
  workStart: string
  workEnd: string
  graceMinutes: number
  timezone: string
  workdays: number[]
}

export interface AttendanceRecord {
  id: number
  userId: string
  workDate: string
  checkIn: string | null
  checkOut: string | null
  kind: 'work' | 'leave'
  note: string | null
  editedByEmail: string | null
  editedAt: string | null
}

export type DayStatus = 'normal' | 'late' | 'early' | 'absent' | 'leave' | 'off' | 'upcoming' | 'missingOut' | 'working'

export interface DayResult {
  date: string
  weekday: number
  isWorkday: boolean
  record?: AttendanceRecord
  statuses: DayStatus[]
  minutes: number
}

export interface MonthSummary {
  workdays: number
  present: number
  late: number
  early: number
  absent: number
  leave: number
  missingOut: number
  minutes: number
}

export const DEFAULT_SETTINGS: AttendanceSettings = {
  workStart: '09:00',
  workEnd: '18:00',
  graceMinutes: 0,
  timezone: 'Africa/Casablanca',
  workdays: [1, 2, 3, 4, 5],
}

export const TIMEZONES = ['Africa/Casablanca', 'Europe/Madrid', 'Asia/Seoul']

function zonedParts(ts: number, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(ts))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour') % 24, mi: get('minute'), s: get('second') }
}

function offsetMinutes(ts: number, tz: string) {
  const p = zonedParts(ts, tz)
  return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - ts) / 60000)
}

export function zonedToUtc(date: string, time: string, tz: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, h, mi)
  let ts = guess - offsetMinutes(guess, tz) * 60000
  const corrected = guess - offsetMinutes(ts, tz) * 60000
  if (corrected !== ts) ts = corrected
  return new Date(ts).toISOString()
}

export function todayIn(tz: string, now = Date.now()) {
  const p = zonedParts(now, tz)
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`
}

export function timeIn(iso: string | null, tz: string) {
  if (!iso) return ''
  const p = zonedParts(new Date(iso).getTime(), tz)
  return `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`
}

export function formatDuration(minutes: number) {
  if (minutes <= 0) return '—'
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`
}

export function daysOfMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
}

export function evaluateMonth(
  month: string,
  records: AttendanceRecord[],
  settings: AttendanceSettings,
  today: string,
): DayResult[] {
  const byDate = new Map(records.map((r) => [r.workDate, r]))
  return daysOfMonth(month).map((date) => {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
    const isWorkday = settings.workdays.includes(weekday)
    const record = byDate.get(date)
    const statuses: DayStatus[] = []
    let minutes = 0

    if (record?.kind === 'leave') {
      statuses.push('leave')
    } else if (!record?.checkIn) {
      if (date >= today) statuses.push('upcoming')
      else statuses.push(isWorkday ? 'absent' : 'off')
    } else {
      const checkIn = new Date(record.checkIn).getTime()
      if (isWorkday) {
        const lateAfter =
          new Date(zonedToUtc(date, settings.workStart, settings.timezone)).getTime() + settings.graceMinutes * 60000
        if (checkIn > lateAfter) statuses.push('late')
      }
      if (record.checkOut) {
        const checkOut = new Date(record.checkOut).getTime()
        minutes = Math.max(0, Math.round((checkOut - checkIn) / 60000))
        if (isWorkday && checkOut < new Date(zonedToUtc(date, settings.workEnd, settings.timezone)).getTime()) {
          statuses.push('early')
        }
      } else {
        statuses.push(date === today ? 'working' : 'missingOut')
      }
      if (statuses.length === 0) statuses.push('normal')
    }
    return { date, weekday, isWorkday, record, statuses, minutes }
  })
}

export function summarize(days: DayResult[]): MonthSummary {
  const s: MonthSummary = { workdays: 0, present: 0, late: 0, early: 0, absent: 0, leave: 0, missingOut: 0, minutes: 0 }
  for (const day of days) {
    if (day.isWorkday) s.workdays++
    if (day.record?.checkIn && day.record.kind === 'work') s.present++
    if (day.statuses.includes('late')) s.late++
    if (day.statuses.includes('early')) s.early++
    if (day.statuses.includes('absent')) s.absent++
    if (day.statuses.includes('leave')) s.leave++
    if (day.statuses.includes('missingOut')) s.missingOut++
    s.minutes += day.minutes
  }
  return s
}
