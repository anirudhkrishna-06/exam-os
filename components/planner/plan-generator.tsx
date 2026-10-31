'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Sparkles, Calendar, BookOpen, Clock, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react'

interface PlanSummary {
  season: {
    id: string
    name: string
    startDate: string
    endDate: string
    status: string
  }
  subjects: number
  totalActivities: number
  enabledActivities: number
  estimatedTotalSessions: number
  completedSessions: number
  hasPlan: boolean
}

interface PlanGeneratorProps {
  seasonId: string
  summary: PlanSummary
}

export function PlanGenerator({ seasonId, summary }: PlanGeneratorProps) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any | null>(null)

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/seasons/${seasonId}/plan`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate plan')
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className="border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Automatic Study Planner
            </span>
            {summary.hasPlan && (
              <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                Plan Active
              </Badge>
            )}
          </div>
          <CardTitle className="text-2xl mt-1">
            {summary.hasPlan ? 'Regenerate Study Plan' : 'Generate Study Plan'}
          </CardTitle>
          <CardDescription>
            Your nearest exam is always the active focus. The planner gives newer and heavier units more priority, schedules revision near the deadline, and rotates through your available time slots naturally.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Readiness Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 border rounded-lg bg-muted/20">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Duration
              </span>
              <p className="text-sm font-semibold">
                {summary.season.startDate}
              </p>
              <p className="text-xs text-muted-foreground">
                to {summary.season.endDate}
              </p>
            </div>

            <div className="p-3 border rounded-lg bg-muted/20">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                Subjects
              </span>
              <p className="text-xl font-bold">{summary.subjects}</p>
              <p className="text-xs text-muted-foreground">in this season</p>
            </div>

            <div className="p-3 border rounded-lg bg-muted/20">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Activities
              </span>
              <p className="text-xl font-bold">{summary.enabledActivities}</p>
              <p className="text-xs text-muted-foreground">enabled for study</p>
            </div>

            <div className="p-3 border rounded-lg bg-muted/20">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                Sessions
              </span>
              <p className="text-xl font-bold">{summary.estimatedTotalSessions}</p>
              <p className="text-xs text-muted-foreground">total required</p>
            </div>
          </div>

          {/* Warnings or info */}
          {summary.subjects === 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertTitle>No subjects added yet</AlertTitle>
              <AlertDescription>
                You must add at least one subject with exam dates before generating a plan.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertTitle>Plan Generation Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Summary */}
          {result && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-300">
                  Plan Generated Successfully!
                </h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-card p-2.5 rounded border">
                  <span className="text-muted-foreground">Scheduled</span>
                  <p className="text-base font-bold text-foreground">
                    {result.output?.stats?.scheduled ?? 0} sessions
                  </p>
                </div>
                <div className="bg-card p-2.5 rounded border">
                  <span className="text-muted-foreground">Slots Used</span>
                  <p className="text-base font-bold text-foreground">
                    {result.output?.stats?.slotsUsed ?? 0}
                  </p>
                </div>
                <div className="bg-card p-2.5 rounded border">
                  <span className="text-muted-foreground">Slots Available</span>
                  <p className="text-base font-bold text-foreground">
                    {result.output?.stats?.slotsAvailable ?? 0}
                  </p>
                </div>
                <div className="bg-card p-2.5 rounded border">
                  <span className="text-muted-foreground">Unscheduled</span>
                  <p className="text-base font-bold text-foreground">
                    {result.output?.stats?.unscheduled ?? 0}
                  </p>
                </div>
              </div>

              {/* Workload warnings if any */}
              {result.output?.warnings && result.output.warnings.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-emerald-500/20">
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Workload Warnings ({result.output.warnings.length})
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {result.output.warnings.map((w: any, idx: number) => (
                      <p key={idx} className="text-xs text-muted-foreground bg-card/60 p-2 rounded border">
                        {w.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={() => router.push(`/planner/${summary.season.startDate > new Date().toISOString().slice(0, 10) ? summary.season.startDate : new Date().toISOString().slice(0, 10)}`)}
                >
                  View Daily Planner
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t bg-muted/10 py-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/seasons/${seasonId}`)}
          >
            Back to Season
          </Button>

          <Button
            disabled={generating || summary.subjects === 0}
            onClick={handleGenerate}
          >
            <Sparkles className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            {generating
              ? 'Generating Plan...'
              : summary.hasPlan
              ? 'Regenerate Study Plan'
              : 'Generate Study Plan'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

