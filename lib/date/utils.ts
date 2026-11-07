export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseDateOnly(date) : date
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function daysUntil(date: string, timeZone = 'Asia/Kolkata'): number {
  // Exam dates are date-only values. Compare date-only UTC values derived from
  // the user's timezone so the result does not shift around server midnight.
  const target = parseDateOnlyUtc(date)
  const today = parseDateOnlyUtc(todayDateString(timeZone))
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function isDateInPast(date: string): boolean {
  return parseDateOnly(date) < new Date()
}

export function parseDateOnly(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function parseDateOnlyUtc(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function toDateInputValue(date: Date | string): string {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  const d = typeof date === 'string' ? new Date(date) : date
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayDateString(timeZone = 'Asia/Kolkata'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function selectNextExam<T extends { examDate: string }>(
  exams: T[],
  now = new Date(),
  timeZone = 'Asia/Kolkata',
): T | null {
  const today = todayDateString(timeZone)
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
  const beforeExamCutoff = hour < 10
  return exams.find((exam) => exam.examDate > today || (exam.examDate === today && beforeExamCutoff)) ?? null
}

