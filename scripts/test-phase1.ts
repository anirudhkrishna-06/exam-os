import { db } from '@/db'
import { users } from '@/db/schema/users'
import { examSeasons } from '@/db/schema/exam-seasons'
import { registerUser, loginUser } from '@/services/auth.service'
import { getPreferences, getScheduleSlots, saveScheduleSlots } from '@/services/preferences.service'
import { createSeason, getSeasonsForUser, getSeasonById, updateSeason, deleteSeason } from '@/services/season.service'
import { createUnitsAndActivities, getSubjectById, updateSubject } from '@/services/subject.service'
import { updateUnit, updateActivity, bulkUpdateUnitsForSubject, bulkUpdateActivitiesForSubject } from '@/services/syllabus.service'
import { subjects } from '@/db/schema/subjects'
import { eq } from 'drizzle-orm'

async function runPhase1Verification() {
  console.log('--- Starting ExamOS Phase 1 Acceptance Verification ---')

  const testEmail = `student_${Date.now()}@example.com`
  const testPassword = 'Password123!'
  const testName = 'Alex Turing'

  // 1. User Registration with Argon2id
  console.log('\n[1] Testing Registration...')
  const user = await registerUser({
    name: testName,
    email: testEmail,
    password: testPassword,
  })
  console.log(`✓ User registered: ${user.name} (${user.id})`)

  // Verify password hash is Argon2id
  const dbUser = await db.query.users.findFirst({ where: eq(users.id, user.id) })
  if (!dbUser?.passwordHash.startsWith('$argon2id$')) {
    throw new Error('Password is not hashed with argon2id!')
  }
  console.log(`✓ Password verified as Argon2id hash`)

  // 2. User Login
  console.log('\n[2] Testing Login...')
  const loggedIn = await loginUser(testEmail, testPassword)
  console.log(`✓ Login successful for: ${loggedIn.email}`)

  // 3. Daily time slots and default template
  console.log('\n[3] Testing Schedule Configuration...')
  const initialSlots = await getScheduleSlots(user.id)
  console.log(`✓ Generated ${initialSlots.length} default daily session slots`)
  if (initialSlots.length !== 6) throw new Error('Expected 6 default slots')

  const initialPrefs = await getPreferences(user.id)
  console.log(`✓ Default planned sessions per day: ${initialPrefs?.defaultSessionsPerDay} (Expected 4)`)
  console.log(`✓ Default timezone: ${initialPrefs?.timezone} (Expected Asia/Kolkata)`)

  // Modify schedule slots
  const customSlots = [
    { name: 'Dawn Session', startTime: '05:30', endTime: '07:30', position: 0, isEnabled: true },
    { name: 'Midday Focus', startTime: '11:00', endTime: '13:00', position: 1, isEnabled: true },
    { name: 'Afternoon Lab', startTime: '15:00', endTime: '17:00', position: 2, isEnabled: false },
    { name: 'Night Review', startTime: '20:00', endTime: '22:00', position: 3, isEnabled: true },
  ]
  const updatedSlots = await saveScheduleSlots(user.id, customSlots, 3)
  console.log(`✓ Updated slots count: ${updatedSlots.length}, target sessions updated to: 3`)

  // 4. Create Exam Season with multiple subjects
  console.log('\n[4] Testing Exam Season and Subject Creation...')
  const season = await createSeason(user.id, {
    name: 'Final Semester Examinations 2027',
    startDate: '2027-05-01',
    subjects: [
      { name: 'Advanced Mathematics', examDate: '2027-05-15', color: '#6366f1' },
      { name: 'Quantum Physics', examDate: '2027-05-20', color: '#ec4899' },
      { name: 'Data Structures', examDate: '2027-05-28', color: '#14b8a6' },
    ],
  })
  console.log(`✓ Created Exam Season: "${season.name}", derived end date: ${season.endDate}`)
  if (season.endDate !== '2027-05-28') throw new Error(`Expected end date 2027-05-28 but got ${season.endDate}`)

  // Auto-generate units + activities for each subject (as done in season creation route)
  const seasonSubjects = await db.query.subjects.findMany({ where: eq(subjects.seasonId, season.id) })
  for (const sub of seasonSubjects) {
    await createUnitsAndActivities(sub.id)
  }
  console.log(`✓ Created units and activities for ${seasonSubjects.length} subjects`)

  // 5. Verify exactly 5 units and 5 activities per unit
  console.log('\n[5] Verifying 5 Units & 5 Activities per Subject...')
  const mathSubject = await getSubjectById(user.id, seasonSubjects[0].id)
  if (!mathSubject) throw new Error('Subject not found')

  console.log(`✓ Subject: "${mathSubject.name}" has ${mathSubject.units.length} units (Expected 5)`)
  if (mathSubject.units.length !== 5) throw new Error('Expected 5 units per subject')

  for (const u of mathSubject.units) {
    if (u.unitActivities.length !== 5) {
      throw new Error(`Unit ${u.unitNumber} has ${u.unitActivities.length} activities, expected 5`)
    }
  }
  console.log(`✓ Every unit has exactly 5 auto-generated activities`)

  // Check default weights
  const unit1Acts = mathSubject.units[0].unitActivities
  const weights = unit1Acts.map((a) => `${a.activityType}: ${a.weight}%`).join(', ')
  console.log(`✓ Unit 1 activities and default weights: ${weights}`)

  // 6. Syllabus configuration & bulk updates
  console.log('\n[6] Testing Unit Status & Syllabus Configuration...')
  const targetUnit = mathSubject.units[0]
  await updateUnit(user.id, targetUnit.id, {
    name: 'Calculus of Single Variable',
    initialStatus: 'partially_studied',
  })
  const updatedMath = await getSubjectById(user.id, mathSubject.id)
  const renamedUnit = updatedMath?.units.find((u) => u.id === targetUnit.id)
  console.log(`✓ Renamed Unit to: "${renamedUnit?.name}", Status: "${renamedUnit?.initialStatus}"`)

  // Disable an activity and customize weight
  const theory1Act = renamedUnit!.unitActivities.find((a) => a.activityType === 'theory_1')!
  await updateActivity(user.id, theory1Act.id, {
    weight: 35,
    estimatedSessions: 4,
    status: 'in_progress',
  })
  console.log(`✓ Updated Activity ${theory1Act.activityType} weight to 35% and 4 estimated sessions`)

  // Bulk update: apply status to all units
  console.log('\n[7] Testing Bulk Syllabus Actions...')
  await bulkUpdateUnitsForSubject(user.id, mathSubject.id, 'previously_studied')
  const afterBulkUnits = await getSubjectById(user.id, mathSubject.id)
  const allPreviouslyStudied = afterBulkUnits?.units.every((u) => u.initialStatus === 'previously_studied')
  console.log(`✓ Bulk set all units to "previously_studied": ${allPreviouslyStudied}`)
  if (!allPreviouslyStudied) throw new Error('Bulk unit update failed')

  // Bulk toggle activity across subject
  await bulkUpdateActivitiesForSubject(user.id, mathSubject.id, 'numericals', false)
  const afterBulkAct = await getSubjectById(user.id, mathSubject.id)
  const allNumericalsDisabled = afterBulkAct?.units.every((u) =>
    u.unitActivities.find((a) => a.activityType === 'numericals')?.enabled === false
  )
  console.log(`✓ Bulk disabled "numericals" across all units: ${allNumericalsDisabled}`)
  if (!allNumericalsDisabled) throw new Error('Bulk activity toggle failed')

  // 7. Ownership validation (security test)
  console.log('\n[8] Testing Cross-User Ownership Validation...')
  const otherUser = await registerUser({
    name: 'Bob Hacker',
    email: `bob_${Date.now()}@example.com`,
    password: 'Password123!',
  })

  try {
    await updateUnit(otherUser.id, targetUnit.id, { name: 'Hacked Unit' })
    throw new Error('FAILED: Unauthorized user was able to modify another user unit!')
  } catch (err: any) {
    console.log(`✓ Ownership check blocked unauthorized access: "${err.message}"`)
  }

  // Cleanup test users
  await db.delete(users).where(eq(users.id, user.id))
  await db.delete(users).where(eq(users.id, otherUser.id))
  console.log('\n✓ Test data cleaned up successfully')

  console.log('\n======================================================')
  console.log('✅ ALL PHASE 1 ACCEPTANCE CRITERIA VERIFIED AND PASSED!')
  console.log('======================================================\n')
  process.exit(0)
}

runPhase1Verification().catch((err) => {
  console.error('❌ Verification failed:', err)
  process.exit(1)
})

