import { db } from '../db'
import { users } from '../db/schema/users'
import { subjects } from '../db/schema/subjects'
import { registerUser } from '../services/auth.service'
import { createSeason } from '../services/season.service'
import { createUnitsAndActivities } from '../services/subject.service'
import { generatePlanForSeason, reschedulePlanForSeason, getActivePlan, getPlanSummary } from '../services/planner.service'
import { getSessionsForDate, getSessionsForMonth, updateSessionStatus, moveSession } from '../services/session.service'
import { setDailyCapacity, getDailyCapacity } from '../services/capacity.service'
import { eq } from 'drizzle-orm'

async function runPhase2Tests() {
  console.log('🚀 Starting Phase 2 Integration Tests...\n')

  const testEmail = `phase2_test_${Date.now()}@example.com`
  const testPassword = 'Password123!Secure'

  // 1. User setup
  console.log('1. Setting up test user and preferences...')
  const auth = await registerUser({
    email: testEmail,
    password: testPassword,
    name: 'Phase2 Tester',
  })
  const userId = auth.id
  console.log(`   ✓ Created user: ${auth.email} (${userId})`)

  // 2. Exam Season creation with subjects
  console.log('2. Creating exam season (2026-11-01 to 2026-11-25) with 2 subjects...')
  const season = await createSeason(userId, {
    name: 'Fall 2026 Finals',
    startDate: '2026-11-01',
    subjects: [
      { name: 'Advanced Calculus', examDate: '2026-11-20', color: '#3B82F6' },
      { name: 'Distributed Systems', examDate: '2026-11-25', color: '#10B981' },
    ],
  })
  console.log(`   ✓ Season created: ${season.id}, endDate derived as: ${season.endDate}`)

  // 3. Populate 5 units and 5 activities for each subject
  console.log('3. Populating units and activities for each subject...')
  const seasonSubjects = await db.query.subjects.findMany({
    where: eq(subjects.seasonId, season.id),
  })
  for (const s of seasonSubjects) {
    await createUnitsAndActivities(s.id)
  }
  console.log(`   ✓ Units and activities populated for ${seasonSubjects.length} subjects`)

  // 4. Plan Summary Check
  console.log('4. Verifying pre-generation summary...')
  const summary = await getPlanSummary(userId, season.id)
  if (!summary) throw new Error('Summary returned null')
  console.log(`   ✓ Summary: ${summary.subjects} subjects, ${summary.enabledActivities} enabled activities, ${summary.estimatedTotalSessions} estimated sessions`)

  // 5. Generate Plan
  console.log('5. Generating study plan via planner engine...')
  const genResult = await generatePlanForSeason(userId, season.id)
  console.log(`   ✓ Plan version created: ${genResult.planVersionId}`)
  console.log(`   ✓ Scheduled sessions: ${genResult.output.stats.scheduled}`)
  console.log(`   ✓ Warnings: ${genResult.output.warnings.length}`)

  if (genResult.output.stats.scheduled === 0) {
    throw new Error('Expected scheduled sessions > 0')
  }

  // 6. Verify scheduled sessions in DB
  console.log('6. Inspecting generated sessions in database...')
  const activePlan = await getActivePlan(userId, season.id)
  if (!activePlan || activePlan.sessions.length === 0) {
    throw new Error('Active plan has no sessions')
  }
  console.log(`   ✓ Found ${activePlan.sessions.length} sessions in DB for plan version ${activePlan.planVersion.versionNumber}`)

  // Check no overlaps and all scheduled before exams
  const slotMap = new Set<string>()
  for (const s of activePlan.sessions) {
    const key = `${s.scheduledDate}__${s.slotName}`
    if (slotMap.has(key)) throw new Error(`Overlap detected on ${key}`)
    slotMap.add(key)
    if (s.scheduledDate >= s.activity.unit.subject.examDate) {
      throw new Error(`Session scheduled on/after exam date: ${s.scheduledDate} vs ${s.activity.unit.subject.examDate}`)
    }
  }
  console.log('   ✓ Zero slot collisions and all sessions scheduled before exam dates')

  // 7. Session Status Update & Completion Lock
  console.log('7. Testing session status updates & completion...')
  const firstSession = activePlan.sessions[0]
  const updated = await updateSessionStatus(userId, firstSession.id, 'completed', 'Completed Unit 1 Theory thoroughly!', 90)
  if (updated.status !== 'completed' || !updated.completedAt) {
    throw new Error('Failed to mark session completed')
  }
  console.log(`   ✓ Session ${firstSession.id} marked as completed with note`)

  // 8. Daily Capacity Override (Rest Day)
  console.log('8. Setting a rest day override...')
  const restDate = '2026-11-10'
  await setDailyCapacity(userId, season.id, restDate, 0, true)
  const cap = await getDailyCapacity(userId, season.id, restDate)
  if (!cap?.isRestDay) throw new Error('Rest day override failed')
  console.log(`   ✓ Marked ${restDate} as rest day (isRestDay: true, sessionCount: 0)`)

  // 9. Reschedule Plan
  console.log('9. Running intelligent rescheduling...')
  const rescheduleResult = await reschedulePlanForSeason(userId, season.id)
  console.log(`   ✓ Reschedule output: ${rescheduleResult.output.diff.preservedCount} preserved, ${rescheduleResult.output.diff.newCount} newly scheduled`)
  
  if (rescheduleResult.output.diff.preservedCount < 1) {
    throw new Error('Completed session was not preserved during reschedule!')
  }

  // Verify completed session was not lost
  const postReschedulePlan = await getActivePlan(userId, season.id)
  const preservedInDb = postReschedulePlan?.sessions.find(s => s.id === firstSession.id)
  if (!preservedInDb || preservedInDb.status !== 'completed') {
    throw new Error('Completed session was lost in database during reschedule!')
  }
  console.log('   ✓ Verified completed session was preserved with intact status in DB')

  // 10. Daily & Monthly views
  console.log('10. Testing daily and monthly session queries...')
  const dailySessions = await getSessionsForDate(userId, firstSession.scheduledDate)
  console.log(`   ✓ Fetched ${dailySessions.length} sessions for date ${firstSession.scheduledDate}`)

  const monthlySessions = await getSessionsForMonth(userId, 2026, 11)
  const daysWithSessions = Object.keys(monthlySessions).length
  console.log(`   ✓ Fetched monthly calendar: ${daysWithSessions} days with scheduled sessions`)

  // Clean up
  console.log('\nCleaning up test data...')
  await db.delete(users).where(eq(users.id, userId))
  console.log('✓ Test user cleaned up.')

  console.log('\n======================================================')
  console.log('🎉 ALL PHASE 2 ACCEPTANCE CRITERIA VERIFIED AND PASSED!')
  console.log('======================================================\n')
}

runPhase2Tests().catch((err) => {
  console.error('\n❌ Phase 2 test failed:', err)
  process.exit(1)
})
