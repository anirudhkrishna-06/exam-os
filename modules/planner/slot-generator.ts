// ============================================================
// modules/planner/slot-generator.ts
// Enumerate available time slots for each date in a season.
// ============================================================

import type { PlannerInput, AvailableSlot } from './types'

/**
 * Parse "HH:MM:SS" → minutes since midnight (for duration calculation).
 */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/**
 * Generate all AvailableSlots for the planning window.
 *
 * Rules (in priority order):
 * 1. Dates before `input.today` → skip (already past).
 * 2. Rest-day override → 0 slots.
 * 3. Exam dates → skip by default (no sessions on exam day).
 * 4. Per-day slot overrides → if any exist for a date, use them
 *    (respecting `isAvailable` flag per slot).
 * 5. Default template slots → use enabled slots up to
 *    the effective session count (capacity override or default).
 * 6. Apply per-day session count cap (capacity override).
 */
export function generateSlots(input: PlannerInput): AvailableSlot[] {
  const slots: AvailableSlot[] = []

  // Build quick-lookup maps
  const capacityByDate = new Map<string, { sessionCount: number; isRestDay: boolean }>()
  for (const c of input.capacityOverrides) {
    capacityByDate.set(c.date, { sessionCount: c.sessionCount, isRestDay: c.isRestDay })
  }

  // Group slot overrides by date
  const slotOverridesByDate = new Map<string, typeof input.slotOverrides>()
  for (const o of input.slotOverrides) {
    const list = slotOverridesByDate.get(o.date) ?? []
    list.push(o)
    slotOverridesByDate.set(o.date, list)
  }

  // All exam dates (one per subject)
  const examDates = new Set(input.subjects.map(s => s.examDate))

  // Enabled templates sorted by position
  const enabledTemplates = input.slotTemplates
    .filter(t => t.isEnabled)
    .sort((a, b) => a.position - b.position)

  // Iterate every day in [today, season.endDate]
  let cursor = input.today
  while (cursor <= input.season.endDate) {
    const capacity = capacityByDate.get(cursor)

    // Skip rest days
    if (capacity?.isRestDay) {
      cursor = nextDate(cursor)
      continue
    }

    // Skip exam dates (no sessions on exam day unless explicit override that is NOT a rest day)
    if (examDates.has(cursor) && !capacity) {
      cursor = nextDate(cursor)
      continue
    }

    const overrides = slotOverridesByDate.get(cursor)
    const sessionCap = capacity?.sessionCount ?? input.defaultSessionsPerDay

    let daySlots: AvailableSlot[]

    if (overrides && overrides.length > 0) {
      // Use overrides; filter to available ones only
      daySlots = overrides
        .filter(o => o.isAvailable)
        .sort((a, b) => a.position - b.position)
        .map(o => ({
          date: cursor,
          slotName: o.slotName,
          startTime: o.startTime,
          endTime: o.endTime,
          position: o.position,
        }))
    } else {
      // Use default templates
      daySlots = enabledTemplates.map(t => ({
        date: cursor,
        slotName: t.name,
        startTime: t.startTime,
        endTime: t.endTime,
        position: t.position,
      }))
    }

    // Apply session cap — take only first `sessionCap` slots
    // Rotate the daily window so a multi-day plan uses later configured
    // slots instead of permanently stopping at the first few slots.
    const capped = selectDailySlots(daySlots, sessionCap, cursor, input.today)
    slots.push(...capped)

    cursor = nextDate(cursor)
  }

  return slots
}

function selectDailySlots(
  daySlots: AvailableSlot[],
  sessionCap: number,
  date: string,
  today: string,
): AvailableSlot[] {
  const ordered = [...daySlots].sort((a, b) => a.position - b.position)
  const count = Math.min(ordered.length, Math.max(0, sessionCap))
  if (count === 0) return []
  if (count === ordered.length) return ordered

  const dayOffset = Math.max(
    0,
    Math.round(
      (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
    ),
  )
  const start = dayOffset % ordered.length

  return Array.from({ length: count }, (_, index) => ordered[(start + index) % ordered.length])
    .sort((a, b) => a.position - b.position)
}

/**
 * Advance a YYYY-MM-DD string by one day.
 */
function nextDate(date: string): string {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

