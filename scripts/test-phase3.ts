import { db } from '../db'
import { users } from '../db/schema/users'
import { subjects } from '../db/schema/subjects'
import { registerUser } from '../services/auth.service'
import { createSeason } from '../services/season.service'
import { createUnitsAndActivities } from '../services/subject.service'
import { generatePlanForSeason } from '../services/planner.service'
import { updateSessionStatus } from '../services/session.service'
import { getSeasonProgress, getSubjectProgress } from '../services/progress.service'
import {
  getWeeklyCompletionData,
  getSessionStatusBreakdown,
  getSubjectDistribution,
  getWorkloadSummary,
} from '../services/analytics.service'
import { getExamReadiness } from '../services/readiness.service'
import { eq } from 'drizzle-orm'

async function runPhase3Tests() {
  console.log('🚀 Starting Phase 3 Integration Tests...\n')

  const testEmail = `phase3_test_${Date.now()}@example.com`
  const testPassword = 'Password123!Secure'

  // 1. Setup user
  console.log('1. Registering user...')
  const auth = await registerUser({
    email: testEmail,
    password: testPassword,
    name: 'Phase3 Tester',
  })
  const userId = auth.id
  console.log(`   ✓ Created user: ${auth.email}`)

  // 2. Create exam season & subjects
  console.log('2. Creating season with subjects...')
  const season = await createSeason(userId, {
    name: 'Spring 2027 Finals',
    startDate: '2027-05-01',
    subjects: [
      { name: 'Computer Architecture', examDate: '2027-05-20', color: '#6366f1' },
      { name: 'Operating Systems', examDate: '2027-05-25', color: '#10b981' },
    ],
  })

  const seasonSubjects = await db.query.subjects.findMany({
    where: eq(subjects.seasonId, season.id),
  })
  for (const s of seasonSubjects) {
    await createUnitsAndActivities(s.id)
  }
  console.log(`   ✓ Configured ${seasonSubjects.length} subjects with syllabus units & activities`)

  // 3. Generate plan
  console.log('3. Generating study plan...')
  const plan = await generatePlanForSeason(userId, season.id)
  console.log(`   ✓ Study plan generated: ${plan.output.stats.scheduled} sessions`)

  // 4. Test initial progress
  console.log('4. Testing progress calculation before completions...')
  const initialSeasonProgress = await getSeasonProgress(userId, season.id)
  if (!initialSeasonProgress) throw new Error('Season progress returned null')
  console.log(`   ✓ Overall initial percent: ${initialSeasonProgress.overallPercent}%`)
  console.log(`   ✓ Total scheduled: ${initialSeasonProgress.totalScheduled}`)

  // 5. Complete some sessions and test progress update
  console.log('5. Completing 3 sessions and testing progress update...')
  const sessions = await db.query.studySessions.findMany({
    where: eq(subjects.seasonId, season.id),
    limit: 3,
  })
  for (const s of sessions) {
    await updateSessionStatus(userId, s.id, 'completed', 'Completed in test')
  }

  const updatedSeasonProgress = await getSeasonProgress(userId, season.id)
  console.log(`   ✓ Total completed: ${updatedSeasonProgress?.totalCompleted}`)

  const subjectProgress = await getSubjectProgress(userId, seasonSubjects[0].id)
  if (!subjectProgress) throw new Error('Subject progress returned null')
  console.log(`   ✓ Subject ${subjectProgress.subjectName}: ${subjectProgress.percentComplete}% complete`)
  console.log(`   ✓ Units count: ${subjectProgress.units.length}`)

  // 6. Test Analytics Services
  console.log('6. Testing analytics services...')
  const weekly = await getWeeklyCompletionData(userId, season.id)
  console.log(`   ✓ Weekly data points: ${weekly.length}`)

  const distribution = await getSessionStatusBreakdown(userId, season.id)
  console.log(`   ✓ Status distribution points: ${distribution.length}`)

  const subjectDist = await getSubjectDistribution(userId, season.id)
  console.log(`   ✓ Subject distribution points: ${subjectDist.length}`)

  const workload = await getWorkloadSummary(userId, season.id)
  console.log(`   ✓ Workload summary: remaining sessions=${workload.remainingSessions}, daysWithCapacity=${workload.daysWithCapacity}`)

  // 7. Test Exam Readiness Service
  console.log('7. Testing exam readiness service...')
  const readiness = await getExamReadiness(userId, season.id)
  console.log(`   ✓ Readiness subjects evaluated: ${readiness.length}`)
  for (const r of readiness) {
    console.log(`     - ${r.subjectName}: ${r.daysRemaining} days left, overloaded=${r.isOverloaded}, units completed=${r.unitsCompleted}/${r.units.length}`)
  }

  console.log('\n🎉 ALL PHASE 3 INTEGRATION TESTS PASSED SUCCESSFULLY!')
  process.exit(0)
}

runPhase3Tests().catch((err) => {
  console.error('\n❌ Phase 3 Integration Test Failed:', err)
  process.exit(1)
})

