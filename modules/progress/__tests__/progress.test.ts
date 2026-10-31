import { describe, it, expect } from 'vitest'
import { calculateActivityProgress } from '../activity-progress'
import { calculateUnitProgress } from '../unit-progress'
import { calculateSubjectProgress } from '../subject-progress'
import { calculateSeasonProgress } from '../season-progress'

describe('Progress Modules', () => {
  it('calculates activity progress accurately with session counts', () => {
    const act = calculateActivityProgress({
      activityId: 'a1',
      activityType: 'theory_1',
      enabled: true,
      weight: 25,
      estimatedSessions: 4,
      completedSessions: 2,
      status: 'in_progress',
    })
    expect(act.percentComplete).toBe(50)
  })

  it('marks activity as 100% when marked completed directly', () => {
    const act = calculateActivityProgress({
      activityId: 'a2',
      activityType: 'revision',
      enabled: true,
      weight: 15,
      estimatedSessions: 3,
      completedSessions: 0,
      status: 'completed',
    })
    expect(act.percentComplete).toBe(100)
    expect(act.completedSessions).toBe(3)
  })

  it('normalizes enabled activity weights to 100% in unit progress', () => {
    // Only theory_1 (weight 25) and numericals (weight 25) enabled => equal 50% share each
    const unit = calculateUnitProgress({
      unitId: 'u1',
      unitNumber: 1,
      unitName: 'Kinematics',
      initialStatus: 'new',
      activities: [
        {
          activityId: 'a1',
          activityType: 'theory_1',
          enabled: true,
          weight: 25,
          estimatedSessions: 2,
          completedSessions: 2, // 100%
          status: 'completed',
        },
        {
          activityId: 'a2',
          activityType: 'numericals',
          enabled: true,
          weight: 25,
          estimatedSessions: 2,
          completedSessions: 0, // 0%
          status: 'not_started',
        },
        {
          activityId: 'a3',
          activityType: 'revision',
          enabled: false, // disabled
          weight: 50,
          estimatedSessions: 0,
          completedSessions: 0,
          status: 'not_started',
        },
      ],
    })

    // (100 * 25 + 0 * 25) / 50 = 50%
    expect(unit.percentComplete).toBe(50)
  })

  it('calculates subject progress as average of units', () => {
    const sub = calculateSubjectProgress({
      subjectId: 's1',
      subjectName: 'Physics',
      examDate: '2026-11-20',
      color: '#6366f1',
      units: [
        {
          unitId: 'u1',
          unitNumber: 1,
          unitName: 'Unit 1',
          initialStatus: 'new',
          activities: [
            {
              activityId: 'a1',
              activityType: 'theory_1',
              enabled: true,
              weight: 100,
              estimatedSessions: 2,
              completedSessions: 2,
              status: 'completed',
            },
          ],
        },
        {
          unitId: 'u2',
          unitNumber: 2,
          unitName: 'Unit 2',
          initialStatus: 'new',
          activities: [
            {
              activityId: 'a2',
              activityType: 'theory_1',
              enabled: true,
              weight: 100,
              estimatedSessions: 2,
              completedSessions: 0,
              status: 'not_started',
            },
          ],
        },
      ],
    })

    // Unit 1 is 100%, Unit 2 is 0% -> Subject avg is 50%
    expect(sub.percentComplete).toBe(50)
  })

  it('calculates season progress across subjects', () => {
    const season = calculateSeasonProgress({
      seasonId: 'ses1',
      seasonName: 'End Term',
      subjects: [
        {
          subjectId: 's1',
          subjectName: 'Math',
          examDate: '2026-11-25',
          color: '#3b82f6',
          units: [
            {
              unitId: 'u1',
              unitNumber: 1,
              unitName: 'Calculus',
              initialStatus: 'new',
              activities: [
                {
                  activityId: 'a1',
                  activityType: 'theory_1',
                  enabled: true,
                  weight: 100,
                  estimatedSessions: 1,
                  completedSessions: 1,
                  status: 'completed',
                },
              ],
            },
          ],
        },
      ],
      sessionStats: {
        totalCompleted: 5,
        totalScheduled: 10,
        totalPending: 5,
        totalOverdue: 0,
      },
    })

    expect(season.overallPercent).toBe(100)
    expect(season.totalCompleted).toBe(5)
    expect(season.totalScheduled).toBe(10)
  })
})

