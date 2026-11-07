import { getCurrentUser } from '@/lib/auth/session'
import { getSeasonsForUser } from '@/services/season.service'
import { getExamReadiness } from '@/services/readiness.service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PreparationSummary } from '@/components/reports/preparation-summary'
import { ExamReadinessReport } from '@/components/reports/exam-readiness'

export const instant = false

export const metadata = {
  title: 'Exam Readiness Report | paramaa... padi da',
}

export default async function ReportsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const seasons = await getSeasonsForUser(user.id)
  const activeSeason =
    seasons.find((s) => s.status === 'active') ??
    seasons.find((s) => s.status === 'draft') ??
    seasons[0]

  if (!activeSeason) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Readiness Reports</h1>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/60 mb-3" />
            <h3 className="font-semibold text-lg">No Exam Seasons</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1 mb-5">
              Create an exam season to generate readiness reports.
            </p>
            <Button asChild>
              <Link href="/seasons/new">Create Season</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const readinessList = await getExamReadiness(user.id, activeSeason.id)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Examination Readiness Report
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Detailed unit and syllabus readiness for{' '}
            <span className="font-semibold text-foreground">{activeSeason.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/analytics">View Analytics</Link>
          </Button>
        </div>
      </div>

      {/* Aggregate Readiness Summary */}
      <PreparationSummary readinessList={readinessList} />

      {/* Subject-by-Subject Detailed Report */}
      <ExamReadinessReport readinessList={readinessList} />
    </div>
  )
}

