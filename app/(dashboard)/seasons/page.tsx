import { getCurrentUser } from '@/lib/auth/session'
import { getSeasonsForUser } from '@/services/season.service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, CalendarDays } from 'lucide-react'
import { formatDate } from '@/lib/date/utils'

export const instant = false

export const metadata = {
  title: 'Seasons | ExamOS',
}

export default async function SeasonsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const seasons = await getSeasonsForUser(user.id)

  const statusLabel: Record<string, string> = {
    draft: 'Draft',
    active: 'Active',
    completed: 'Completed',
    archived: 'Archived',
  }
  const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'outline'> = {
    draft: 'secondary',
    active: 'success',
    completed: 'outline',
    archived: 'outline',
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exam seasons</h1>
          <p className="text-muted-foreground mt-1">Manage your exam preparation periods</p>
        </div>
        <Button asChild>
          <Link href="/seasons/new">
            <Plus className="h-4 w-4 mr-2" />
            New season
          </Link>
        </Button>
      </div>

      {seasons.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No seasons yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Create an exam season to start organizing your preparation
            </p>
            <Button asChild>
              <Link href="/seasons/new">Create your first season</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {seasons.map((season) => (
            <Card key={season.id} className="hover:shadow-sm transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{season.name}</CardTitle>
                      <Badge variant={statusVariant[season.status] ?? 'secondary'}>
                        {statusLabel[season.status]}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(season.startDate)} → {formatDate(season.endDate)}
                      </span>
                    </CardDescription>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/seasons/${season.id}`}>Open</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {season.subjects.map((sub) => (
                    <Link
                      key={sub.id}
                      href={`/subjects/${sub.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs hover:bg-accent transition-colors"
                    >
                      {sub.color && (
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                      )}
                      {sub.name}
                      <span className="text-muted-foreground">· {formatDate(sub.examDate)}</span>
                    </Link>
                  ))}
                  {season.subjects.length === 0 && (
                    <span className="text-xs text-muted-foreground">No subjects added yet</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
