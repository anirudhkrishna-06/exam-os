// ============================================================
// services/analytics.service.ts
// Aggregates planner & session data for visualizations.
// ============================================================

import { db } from '@/db'
import { studySessions } from '@/db/schema/study-sessions'
import { subjects } from '@/db/schema/subjects'
import { units } from '@/db/schema/units'
import { unitActivities } from '@/db/schema/activities'
import { eq, and, count, asc, sql, gte } from 'drizzle-orm'
import { getSeasonProgress } from './progress.service'

export interface WeeklyCompletionPoint {
  week: string
  completed: number
  scheduled: number
  skipped: number
}

export interface SessionStatusBreakdown {
  status: string
  label: string
  count: number
  color: string
}

export interface SubjectDistributionPoint {
  subjectName: string
  color: string
  completedSessions: number
  remainingSessions: number
  totalSessions: number
}

export async function getWeeklyCompletionData(
  userId: string,
  seasonId: string,
): Promise<WeeklyCompletionPoint[]> {
  // Query sessions grouped by ISO week (or year-week)
  const rows = await db
    .select({
      weekStart: sql<string>`to_char(date_trunc('week', ${studySessions.scheduledDate}::date), 'YYYY-MM-DD')`,
      status: studySessions.status,
      cnt: count(studySessions.id),
    })
    .from(studySessions)
    .where(and(eq(studySessions.userId, userId), eq(studySessions.seasonId, seasonId)))
    .groupBy(
      sql`date_trunc('week', ${studySessions.scheduledDate}::date)`,
      studySessions.status,
    )
    .orderBy(sql`date_trunc('week', ${studySessions.scheduledDate}::date)`)

  const weekMap = new Map<string, { completed: number; scheduled: number; skipped: number }>()

  for (const row of rows) {
    const week = row.weekStart ?? 'Unknown'
    const entry = weekMap.get(week) ?? { completed: 0, scheduled: 0, skipped: 0 }
    const n = Number(row.cnt)
    if (row.status === 'completed') entry.completed += n
    else if (row.status === 'scheduled' || row.status === 'in_progress') entry.scheduled += n
    else if (row.status === 'skipped' || row.status === 'overdue') entry.skipped += n
    weekMap.set(week, entry)
  }

  return Array.from(weekMap.entries()).map(([week, stats]) => ({
    week: `W/C ${week.slice(5)}`,
    ...stats,
  }))
}

export interface WorkloadSummary {
  plannedThisWeek: number
  completedThisWeek: number
  overdueSessions: number
  remainingSessions: number
  daysWithCapacity: number
}

export async function getWorkloadSummary(
  userId: string,
  seasonId: string,
): Promise<WorkloadSummary> {
  const todayStr = new Date().toISOString().split('T')[0]

  // Get week start and end using SQL
  const weekStats = await db
    .select({
      totalThisWeek: sql<number>`count(*) filter (where ${studySessions.scheduledDate} >= date_trunc('week', current_date)::date and ${studySessions.scheduledDate} <= (date_trunc('week', current_date) + interval '6 days')::date)`,
      completedThisWeek: sql<number>`count(*) filter (where ${studySessions.status} = 'completed' and ${studySessions.scheduledDate} >= date_trunc('week', current_date)::date and ${studySessions.scheduledDate} <= (date_trunc('week', current_date) + interval '6 days')::date)`,
      overdue: sql<number>`count(*) filter (where ${studySessions.status} = 'overdue' or (${studySessions.status} in ('scheduled', 'in_progress') and ${studySessions.scheduledDate} < current_date))`,
      remaining: sql<number>`count(*) filter (where ${studySessions.status} in ('scheduled', 'in_progress', 'overdue'))`,
    })
    .from(studySessions)
    .where(and(eq(studySessions.userId, userId), eq(studySessions.seasonId, seasonId)))

  const stat = weekStats[0] || {
    totalThisWeek: 0,
    completedThisWeek: 0,
    overdue: 0,
    remaining: 0,
  }

  // Count distinct upcoming dates with sessions
  const upcomingDays = await db
    .select({
      cnt: sql<number>`count(distinct ${studySessions.scheduledDate})`,
    })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, userId),
        eq(studySessions.seasonId, seasonId),
        gte(studySessions.scheduledDate, todayStr),
      ),
    )

  return {
    plannedThisWeek: Number(stat.totalThisWeek || 0),
    completedThisWeek: Number(stat.completedThisWeek || 0),
    overdueSessions: Number(stat.overdue || 0),
    remainingSessions: Number(stat.remaining || 0),
    daysWithCapacity: Number(upcomingDays[0]?.cnt || 0),
  }
}


export async function getSessionStatusBreakdown(
  userId: string,
  seasonId: string,
): Promise<SessionStatusBreakdown[]> {
  const rows = await db
    .select({
      status: studySessions.status,
      cnt: count(studySessions.id),
    })
    .from(studySessions)
    .where(and(eq(studySessions.userId, userId), eq(studySessions.seasonId, seasonId)))
    .groupBy(studySessions.status)

  const config: Record<string, { label: string; color: string }> = {
    completed: { label: 'Completed', color: '#10b981' },
    scheduled: { label: 'Scheduled', color: '#3b82f6' },
    in_progress: { label: 'In Progress', color: '#f59e0b' },
    overdue: { label: 'Overdue', color: '#ef4444' },
    skipped: { label: 'Skipped', color: '#6b7280' },
  }

  const map = new Map<string, number>()
  for (const r of rows) {
    map.set(r.status, Number(r.cnt))
  }

  return Object.entries(config).map(([status, meta]) => ({
    status,
    label: meta.label,
    count: map.get(status) ?? 0,
    color: meta.color,
  }))
}

export async function getSubjectDistribution(
  userId: string,
  seasonId: string,
): Promise<SubjectDistributionPoint[]> {
  const seasonProgress = await getSeasonProgress(userId, seasonId)
  if (!seasonProgress) return []

  return seasonProgress.subjects.map((s) => ({
    subjectName: s.subjectName,
    color: s.color,
    completedSessions: s.totalCompletedSessions,
    remainingSessions: Math.max(0, s.totalEstimatedSessions - s.totalCompletedSessions),
    totalSessions: s.totalEstimatedSessions,
  }))
}
