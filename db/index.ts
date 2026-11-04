import { relations } from 'drizzle-orm'
import { users } from './schema/users'
import { authSessions } from './schema/sessions'
import { userPreferences } from './schema/user-preferences'
import { dailySessionTemplates } from './schema/daily-templates'
import { examSeasons } from './schema/exam-seasons'
import { subjects } from './schema/subjects'
import { units } from './schema/units'
import { unitActivities } from './schema/activities'
import { dailyCapacity } from './schema/daily-capacity'
import { dailySlotOverrides } from './schema/daily-slot-overrides'
import { planVersions } from './schema/plan-versions'
import { studySessions } from './schema/study-sessions'
import { sessionHistory } from './schema/session-history'
import { sessionNotes, knowledgeLinks, sessionKeywords } from './schema/knowledge'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

// --- Relations ---

export const usersRelations = relations(users, ({ many, one }) => ({
  authSessions: many(authSessions),
  preferences: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.userId],
  }),
  dailySessionTemplates: many(dailySessionTemplates),
  examSeasons: many(examSeasons),
  subjects: many(subjects),
  dailyCapacity: many(dailyCapacity),
  dailySlotOverrides: many(dailySlotOverrides),
  planVersions: many(planVersions),
  studySessions: many(studySessions),
}))

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, {
    fields: [authSessions.userId],
    references: [users.id],
  }),
}))

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}))

export const dailySessionTemplatesRelations = relations(dailySessionTemplates, ({ one }) => ({
  user: one(users, {
    fields: [dailySessionTemplates.userId],
    references: [users.id],
  }),
}))

export const examSeasonsRelations = relations(examSeasons, ({ one, many }) => ({
  user: one(users, {
    fields: [examSeasons.userId],
    references: [users.id],
  }),
  subjects: many(subjects),
  dailyCapacity: many(dailyCapacity),
  dailySlotOverrides: many(dailySlotOverrides),
  planVersions: many(planVersions),
  studySessions: many(studySessions),
}))

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  season: one(examSeasons, {
    fields: [subjects.seasonId],
    references: [examSeasons.id],
  }),
  user: one(users, {
    fields: [subjects.userId],
    references: [users.id],
  }),
  units: many(units),
}))

export const unitsRelations = relations(units, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [units.subjectId],
    references: [subjects.id],
  }),
  unitActivities: many(unitActivities),
}))

export const unitActivitiesRelations = relations(unitActivities, ({ one, many }) => ({
  unit: one(units, {
    fields: [unitActivities.unitId],
    references: [units.id],
  }),
  studySessions: many(studySessions),
}))

export const dailyCapacityRelations = relations(dailyCapacity, ({ one }) => ({
  season: one(examSeasons, {
    fields: [dailyCapacity.seasonId],
    references: [examSeasons.id],
  }),
  user: one(users, {
    fields: [dailyCapacity.userId],
    references: [users.id],
  }),
}))

export const dailySlotOverridesRelations = relations(dailySlotOverrides, ({ one }) => ({
  season: one(examSeasons, {
    fields: [dailySlotOverrides.seasonId],
    references: [examSeasons.id],
  }),
  user: one(users, {
    fields: [dailySlotOverrides.userId],
    references: [users.id],
  }),
  template: one(dailySessionTemplates, {
    fields: [dailySlotOverrides.templateId],
    references: [dailySessionTemplates.id],
  }),
}))

export const planVersionsRelations = relations(planVersions, ({ one, many }) => ({
  season: one(examSeasons, {
    fields: [planVersions.seasonId],
    references: [examSeasons.id],
  }),
  user: one(users, {
    fields: [planVersions.userId],
    references: [users.id],
  }),
  studySessions: many(studySessions),
}))

export const studySessionsRelations = relations(studySessions, ({ one, many }) => ({
  season: one(examSeasons, {
    fields: [studySessions.seasonId],
    references: [examSeasons.id],
  }),
  user: one(users, {
    fields: [studySessions.userId],
    references: [users.id],
  }),
  activity: one(unitActivities, {
    fields: [studySessions.activityId],
    references: [unitActivities.id],
  }),
  planVersion: one(planVersions, {
    fields: [studySessions.planVersionId],
    references: [planVersions.id],
  }),
  history: many(sessionHistory),
  note: one(sessionNotes),
  links: many(knowledgeLinks),
  keywords: many(sessionKeywords),
}))

export const sessionNotesRelations = relations(sessionNotes, ({ one }) => ({
  session: one(studySessions, { fields: [sessionNotes.sessionId], references: [studySessions.id] }),
  user: one(users, { fields: [sessionNotes.userId], references: [users.id] }),
}))

export const knowledgeLinksRelations = relations(knowledgeLinks, ({ one }) => ({
  session: one(studySessions, { fields: [knowledgeLinks.sessionId], references: [studySessions.id] }),
  user: one(users, { fields: [knowledgeLinks.userId], references: [users.id] }),
}))

export const sessionKeywordsRelations = relations(sessionKeywords, ({ one }) => ({
  session: one(studySessions, { fields: [sessionKeywords.sessionId], references: [studySessions.id] }),
  user: one(users, { fields: [sessionKeywords.userId], references: [users.id] }),
}))

export const sessionHistoryRelations = relations(sessionHistory, ({ one }) => ({
  studySession: one(studySessions, {
    fields: [sessionHistory.studySessionId],
    references: [studySessions.id],
  }),
  user: one(users, {
    fields: [sessionHistory.userId],
    references: [users.id],
  }),
}))

// --- Schema bundle ---
import * as usersSchema from './schema/users'
import * as sessionsSchema from './schema/sessions'
import * as preferencesSchema from './schema/user-preferences'
import * as templatesSchema from './schema/daily-templates'
import * as seasonsSchema from './schema/exam-seasons'
import * as subjectsSchema from './schema/subjects'
import * as unitsSchema from './schema/units'
import * as activitiesSchema from './schema/activities'
import * as dailyCapacitySchema from './schema/daily-capacity'
import * as dailySlotOverridesSchema from './schema/daily-slot-overrides'
import * as planVersionsSchema from './schema/plan-versions'
import * as studySessionsSchema from './schema/study-sessions'
import * as sessionHistorySchema from './schema/session-history'
import * as knowledgeSchema from './schema/knowledge'
import * as revisionDismissalsSchema from './schema/revision-dismissals'
import * as unitKnowledgeSchema from './schema/unit-knowledge'

const schema = {
  ...usersSchema,
  ...sessionsSchema,
  ...preferencesSchema,
  ...templatesSchema,
  ...seasonsSchema,
  ...subjectsSchema,
  ...unitsSchema,
  ...activitiesSchema,
  ...dailyCapacitySchema,
  ...dailySlotOverridesSchema,
  ...planVersionsSchema,
  ...studySessionsSchema,
  ...sessionHistorySchema,
  ...knowledgeSchema,
  ...revisionDismissalsSchema,
  ...unitKnowledgeSchema,
  // relations
  usersRelations,
  authSessionsRelations,
  userPreferencesRelations,
  dailySessionTemplatesRelations,
  examSeasonsRelations,
  subjectsRelations,
  unitsRelations,
  unitActivitiesRelations,
  dailyCapacityRelations,
  dailySlotOverridesRelations,
  planVersionsRelations,
  studySessionsRelations,
  sessionHistoryRelations,
  sessionNotesRelations,
  knowledgeLinksRelations,
  sessionKeywordsRelations,
}

const databaseUrl = process.env.DATABASE_URL
// pg-connection-string is moving to standard libpq semantics. Spell out the
// current SSL behavior so pg does not emit its deprecation warning at runtime.
const normalizedDatabaseUrl = databaseUrl?.replace(/([?&])sslmode=(prefer|require|verify-ca)(?=(&|$))/i, '$1sslmode=verify-full')
const pool = new Pool({
  connectionString: normalizedDatabaseUrl,
  // Keep the existing deployment behavior for providers whose certificate
  // chain is not available in the local runtime.
  ssl: normalizedDatabaseUrl?.includes('sslmode=verify-full')
    ? { rejectUnauthorized: false }
    : undefined,
})

export const db = drizzle(pool, { schema })
export type DB = typeof db
