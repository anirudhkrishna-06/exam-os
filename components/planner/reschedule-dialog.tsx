'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react'

interface RescheduleDialogProps {
  seasonId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRescheduled?: (data: any) => void
}

export function RescheduleDialog({
  seasonId,
  open,
  onOpenChange,
  onRescheduled,
}: RescheduleDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any | null>(null)

  const handleReschedule = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/seasons/${seasonId}/plan/reschedule`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reschedule plan')
      setResult(data)
      if (onRescheduled) onRescheduled(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            Reschedule Study Plan
          </DialogTitle>
          <DialogDescription>
            Intelligently re-allocate unfinished sessions across remaining time slots without losing any completed sessions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!result ? (
            <div className="rounded-lg bg-muted/40 p-3 border text-xs space-y-2 text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>
                  <strong>Completed sessions are locked</strong> and will stay in their exact dates and slots.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <RefreshCw className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <span>
                  All scheduled, skipped or overdue sessions will be recalculated using updated subject urgency and workload priorities.
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs space-y-2">
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                Reschedule Complete!
              </p>
              <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                <li>Preserved completed sessions: {result.output?.diff?.preservedCount ?? 0}</li>
                <li>Rescheduled sessions: {result.output?.diff?.newCount ?? 0}</li>
                <li>Workload warnings: {result.output?.warnings?.length ?? 0}</li>
              </ul>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 p-2.5 rounded border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {result ? 'Close' : 'Cancel'}
          </Button>

          {!result && (
            <Button
              type="button"
              size="sm"
              disabled={loading}
              onClick={handleReschedule}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Rescheduling...' : 'Run Rescheduler'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

