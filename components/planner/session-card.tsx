'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SessionStatus } from './session-status'
import { CheckCircle2, Clock, SkipForward, Edit2, BookOpen, AlertCircle, ArrowUpRight } from 'lucide-react'

export interface SessionCardData {
  id: string
  slotName: string
  startTime: string
  endTime: string
  position: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'overdue'
  estimatedDurationMinutes: number
  actualDurationMinutes?: number | null
  completionNote?: string | null
  activity?: {
    id: string
    activityType: string
    unit: {
      id: string
      unitNumber: number
      name: string
      subject: {
        id: string
        name: string
        color: string | null
        examDate: string
      }
    }
  }
}

interface SessionCardProps {
  session: SessionCardData
  onStatusChange?: (sessionId: string, newStatus: SessionCardData['status']) => Promise<void>
  onEdit?: (session: SessionCardData) => void
  onOpen?: (session: SessionCardData) => void
}

const ACTIVITY_LABELS: Record<string, string> = {
  theory_1: 'Theory 1',
  theory_2: 'Theory 2',
  numericals: 'Numericals & Problems',
  previous_papers: 'Past Exam Papers',
  revision: 'Final Revision',
}

export function SessionCard({ session, onStatusChange, onEdit, onOpen }: SessionCardProps) {
  const [loading, setLoading] = useState(false)
  const subject = session.activity?.unit.subject
  const unit = session.activity?.unit
  const activityType = session.activity?.activityType

  const handleStatus = async (status: SessionCardData['status']) => {
    if (!onStatusChange) return
    setLoading(true)
    try {
      await onStatusChange(session.id, status)
    } finally {
      setLoading(false)
    }
  }

  const subjectColor = subject?.color || '#3b82f6'
  const defaultUnitName = unit ? `Unit ${unit.unitNumber}` : null
  const unitLabel = unit
    ? unit.name.trim().toLowerCase() === defaultUnitName?.toLowerCase()
      ? defaultUnitName
      : `${defaultUnitName} · ${unit.name}`
    : 'Study session'

  return (
    <Card className="overflow-hidden border transition-all hover:shadow-sm">
      <div className="flex border-l-4" style={{ borderLeftColor: subjectColor }}>
        <CardContent className="p-4 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: subjectColor }}
                />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {subject?.name || 'General Study'}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {session.startTime.slice(0, 5)} - {session.endTime.slice(0, 5)}
                </span>
              </div>
              <h4 className="text-sm font-semibold leading-snug">{unitLabel}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activityType ? ACTIVITY_LABELS[activityType] || activityType : 'Study Activity'}
                {' '}({session.estimatedDurationMinutes} mins)
              </p>
              {session.completionNote && (
                <p className="text-xs bg-muted/50 p-2 rounded mt-2 border text-muted-foreground italic">
                  &ldquo;{session.completionNote}&rdquo;
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              <SessionStatus status={session.status} />
              
              <div className="flex items-center gap-1 mt-1">
                {onOpen && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary" onClick={() => onOpen(session)} title="Open workspace">
                    <ArrowUpRight className="mr-1 h-3.5 w-3.5" />Open
                  </Button>
                )}
                {session.status !== 'completed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                    disabled={loading}
                    onClick={() => handleStatus('completed')}
                    title="Mark Completed"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Done
                  </Button>
                )}
                {session.status === 'scheduled' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-zinc-500 hover:bg-zinc-100"
                    disabled={loading}
                    onClick={() => handleStatus('skipped')}
                    title="Skip Session"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </Button>
                )}
                {onEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => onEdit(session)}
                    title="Edit Session"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  )
}

