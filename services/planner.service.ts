// ============================================================
// services/planner.service.ts
// Orchestrates plan generation: reads DB, calls engine, writes results.
// ============================================================

import { db } from '@/db'
import { examSeasons } from '@/db/schema/exam-seasons'
import { subjects } from '@/db/schema/subjects'
import { units } from '@/db/schema/units'
import { unitActivities } from '@/db/schema/activities'
import { userPreferences } from '@/db/schema/user-preferences'
import { dailySessionTemplates } from '@/db/schema/daily-templates'
import { planVersions } from '@/db/schema/plan-versions'
import { studySessions } from '@/db/schema/study-sessions'
import { sessionHistory } from '@/db/schema/session-history'
import { eq, and, count, max } from 'drizzle-orm'
import { generatePlan } from '@/modules/planner/scheduler'
import { reschedulePlan } from '@/modules/planner/rescheduler'
import type { PlannerInput, PlannerSubject, ScheduledSession } from '@/modules/planner/types'
import {
  getCapacityOverridesForSeason,
  getSlotOverridesForSeason,
} from './capacity.service'

// ---- Data assembly ----

async function assemblePlannerInput(userId: string, seasonId: string): Promise<PlannerInput> {
  // Season
  const season = await db.query.examSeasons.findFirst({
    where: and(eq(examSeasons.id, seasonId), eq(examSeasons.userId, userId)),
  })
  if (!season) throw new Error('Season not found')

  // User preferences (for defaultSessionsPerDay)
  const prefs = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, userId),
  })
  const defaultSessionsPerDay = prefs?.defaultSessionsPerDay ?? 4

  // Slot templates
  const templates = await db.query.dailySessionTemplates.findMany({
    where: eq(dailySessionTemplates.userId, userId),
    orderBy: (t, { asc }) => [asc(t.position)],
  })

  // Subjects with nested units and activities
  const subjectRows = await db.query.subjects.findMany({
    where: and(eq(subjects.seasonId, seasonId), eq(subjects.userId, userId)),
    with: {
      units: {
        with: { unitActivities: true },
        orderBy: (u, { asc }) => [asc(u.position)],
      },
    },
    orderBy: (s, { asc }) => [asc(s.position)],
  })

  // Count completed sessions per activity
  const completedRows = await db
    .select({
      activityId: studySessions.activityId,
      completedCount: count(studySessions.id),
    })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, userId),
        eq(studySessions.seasonId, seasonId),
        eq(studySessions.status, 'completed'),
      )
    )
    .groupBy(studySessions.activityId)

  const completedByActivity = new Map(completedRows.map(r => [r.activityId, r.completedCount]))

  // Existing completed sessions (for rescheduler slot locking)
  const existingCompleted = await db.query.studySessions.findMany({
    where: and(
      eq(studySessions.userId, userId),
      eq(studySessions.seasonId, seasonId),
      eq(studySessions.status, 'completed'),
    ),
  })

  // Capacity / slot overrides
  const capacityOverrides = await getCapacityOverridesForSeason(userId, seasonId)
  const slotOverrides = await getSlotOverridesForSeason(userId, seasonId)

  const plannerSubjects: PlannerSubject[] = subjectRows.map(s => ({
    subjectId: s.id,
    subjectName: s.name,
    examDate: s.examDate,
    color: s.color ?? '#6B7280',
    units: s.units.map(u => ({
      unitId: u.id,
      unitNumber: u.unitNumber,
      unitName: u.name,
      initialStatus: u.initialStatus,
      activities: u.unitActivities.map(a => ({
        activityId: a.id,
        activityType: a.activityType,
        enabled: a.enabled,
        status: a.status,
        weight: Number(a.weight),
        estimatedSessions: a.estimatedSessions,
        completedSessions: completedByActivity.get(a.id) ?? 0,
      })),
    })),
  }))

  const today = new Date().toISOString().slice(0, 10)
  // Clamp: never start before season.startDate
  const startFrom = season.startDate > today ? season.startDate : today

  return {
    seasonId,
    season: { startDate: season.startDate, endDate: season.endDate },
    subjects: plannerSubjects,
    slotTemplates: templates.map(t => ({
      templateId: t.id,
      name: t.name,
      startTime: t.startTime,
      endTime: t.endTime,
      position: t.position,
      isEnabled: t.isEnabled,
    })),
    defaultSessionsPerDay,
    capacityOverrides: capacityOverrides.map(c => ({
      date: c.date,
      sessionCount: c.sessionCount,
      isRestDay: c.isRestDay,
    })),
    slotOverrides: slotOverrides.map(o => ({
      date: o.date,
      templateId: o.templateId,
      slotName: o.slotName,
      startTime: o.startTime,
      endTime: o.endTime,
      isAvailable: o.isAvailable,
      position: o.position,
    })),
    existingCompletedSessions: existingCompleted.map(s => ({
      sessionId: s.id,
      activityId: s.activityId,
      scheduledDate: s.scheduledDate,
      slotName: s.slotName,
      startTime: s.startTime,
      endTime: s.endTime,
      position: s.position,
      status: 'completed' as const,
    })),
    today: startFrom,
  }
}

// ---- Write plan to DB ----

async function writePlanToDB(
  userId: string,
  seasonId: string,
  sessions: ScheduledSession[],
  generationType: 'initial' | 'manual_regeneration' | 'automatic_reschedule',
): Promise<string> {
  // Get next version number
  const [versionResult] = await db
    .select({ maxVersion: max(planVersions.versionNumber) })
    .from(planVersions)
    .where(and(eq(planVersions.seasonId, seasonId), eq(planVersions.userId, userId)))

  const nextVersion = (versionResult?.maxVersion ?? 0) + 1

  // Create plan version
  const [planVersion] = await db
    .insert(planVersions)
    .values({ seasonId, userId, versionNumber: nextVersion, generationType })
    .returning()

  if (sessions.length === 0) return planVersion.id

  // Insert all scheduled sessions + history entries in batches
  const BATCH_SIZE = 100
  for (let i = 0; i < sessions.length; i += BATCH_SIZE) {
    const batch = sessions.slice(i, i + BATCH_SIZE)
    const inserted = await db
      .insert(studySessions)
      .values(
        batch.map(s => ({
          seasonId,
          userId,
          activityId: s.activityId,
          planVersionId: planVersion.id,
          scheduledDate: s.scheduledDate,
          slotName: s.slotName,
          startTime: s.startTime,
          endTime: s.endTime,
          position: s.position,
          status: 'scheduled' as const,
          estimatedDurationMinutes: s.estimatedDurationMinutes,
        }))
      )
      .returning()

    // History entries
    await db.insert(sessionHistory).values(
      inserted.map(s => ({
        studySessionId: s.id,
        userId,
        newDate: s.scheduledDate,
        newStatus: 'scheduled',
        action: 'created' as const,
      }))
    )
  }

  return planVersion.id
}

// ---- Public service functions ----

export async function generatePlanForSeason(userId: string, seasonId: string) {
  const input = await assemblePlannerInput(userId, seasonId)
  const output = generatePlan(input)

  // Delete existing non-completed sessions for this season
  // (completed sessions are never deleted)
  const allCurrentSessions = await db.query.studySessions.findMany({
    where: and(
      eq(studySessions.userId, userId),
      eq(studySessions.seasonId, seasonId),
    ),
  })
  const toDelete = allCurrentSessions
    .filter(s => s.status !== 'completed')
    .map(s => s.id)

  if (toDelete.length > 0) {
    for (const id of toDelete) {
      await db.delete(studySessions).where(eq(studySessions.id, id))
    }
  }

  const planVersionId = await writePlanToDB(userId, seasonId, output.sessions, 'initial')

  return { planVersionId, output }
}

export async function reschedulePlanForSeason(userId: string, seasonId: string) {
  const input = await assemblePlannerInput(userId, seasonId)

  // Fetch all sessions including their status and activity details
  const allSessions = await db.query.studySessions.findMany({
    where: and(
      eq(studySessions.userId, userId),
      eq(studySessions.seasonId, seasonId),
    ),
    with: {
      activity: {
        with: {
          unit: {
            with: { subject: true },
          },
        },
      },
    },
  })

  const existingPlan = allSessions.map(s => ({
    sessionId: s.id,
    activityId: s.activityId,
    subjectId: s.activity.unit.subject.id,
    subjectName: s.activity.unit.subject.name,
    examDate: s.activity.unit.subject.examDate,
    color: s.activity.unit.subject.color ?? '#6B7280',
    unitId: s.activity.unit.id,
    unitNumber: s.activity.unit.unitNumber,
    unitName: s.activity.unit.name,
    activityType: s.activity.activityType,
    scheduledDate: s.scheduledDate,
    slotName: s.slotName,
    startTime: s.startTime,
    endTime: s.endTime,
    position: s.position,
    estimatedDurationMinutes: s.estimatedDurationMinutes,
    status: s.status,
  }))

  const output = reschedulePlan({ ...input, existingPlan })

  // Delete non-completed sessions only
  const toDelete = allSessions.filter(s => s.status !== 'completed').map(s => s.id)
  for (const id of toDelete) {
    await db.delete(studySessions).where(eq(studySessions.id, id))
  }

  const planVersionId = await writePlanToDB(
    userId, seasonId, output.rescheduled, 'manual_regeneration'
  )

  // Link preserved completed sessions to the new plan version
  const preservedIds = allSessions.filter(s => s.status === 'completed').map(s => s.id)
  for (const pid of preservedIds) {
    await db.update(studySessions).set({ planVersionId }).where(eq(studySessions.id, pid))
  }

  return { planVersionId, output }
}

export async function getActivePlan(userId: string, seasonId: string) {
  const latestVersion = await db.query.planVersions.findFirst({
    where: and(eq(planVersions.seasonId, seasonId), eq(planVersions.userId, userId)),
    orderBy: (t, { desc }) => [desc(t.versionNumber)],
  })
  if (!latestVersion) return null

  const sessions = await db.query.studySessions.findMany({
    where: and(
      eq(studySessions.userId, userId),
      eq(studySessions.seasonId, seasonId),
      eq(studySessions.planVersionId, latestVersion.id),
    ),
    with: {
      activity: {
        with: {
          unit: {
            with: { subject: true },
          },
        },
      },
    },
    orderBy: (t, { asc }) => [asc(t.scheduledDate), asc(t.position)],
  })

  return { planVersion: latestVersion, sessions }
}

export async function getPlanSummary(userId: string, seasonId: string) {
  const season = await db.query.examSeasons.findFirst({
    where: and(eq(examSeasons.id, seasonId), eq(examSeasons.userId, userId)),
  })
  if (!season) return null

  const subjectRows = await db.query.subjects.findMany({
    where: and(eq(subjects.seasonId, seasonId), eq(subjects.userId, userId)),
    with: {
      units: { with: { unitActivities: true } },
    },
  })

  const hasPlan = await db.query.planVersions.findFirst({
    where: and(eq(planVersions.seasonId, seasonId), eq(planVersions.userId, userId)),
  })

  let totalSessions = 0
  let completedSessions = 0
  let totalActivities = 0
  let enabledActivities = 0

  for (const s of subjectRows) {
    for (const u of s.units) {
      for (const a of u.unitActivities) {
        totalActivities++
        if (a.enabled) {
          enabledActivities++
          totalSessions += a.estimatedSessions
        }
      }
    }
  }

  const completedRows = await db
    .select({ count: count(studySessions.id) })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, userId),
        eq(studySessions.seasonId, seasonId),
        eq(studySessions.status, 'completed'),
      )
    )

  completedSessions = completedRows[0]?.count ?? 0

  return {
    season,
    subjects: subjectRows.length,
    totalActivities,
    enabledActivities,
    estimatedTotalSessions: totalSessions,
    completedSessions,
    hasPlan: !!hasPlan,
  }
}

