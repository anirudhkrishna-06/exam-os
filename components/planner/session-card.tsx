'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import gsap from 'gsap'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SessionStatus } from './session-status'
import { CheckCircle2, Clock, SkipForward, Edit2, BookOpen, AlertCircle, ArrowUpRight, Loader2 } from 'lucide-react'

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
  confidenceRating?: number | null
  isSyncing?: boolean
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
  onStatusChange?: (sessionId: string, newStatus: SessionCardData['status'], confidenceRating?: number) => Promise<void>
  onEdit?: (session: SessionCardData) => void
  onOpen?: (session: SessionCardData) => void | Promise<void>
}

const ACTIVITY_LABELS: Record<string, string> = {
  theory_1: 'Theory 1',
  theory_2: 'Theory 2',
  numericals: 'Numericals & Problems',
  previous_papers: 'Past Exam Papers',
  revision: 'Final Revision',
}

export function SessionCard({ session, onStatusChange, onEdit, onOpen }: SessionCardProps) {
  const pathname = usePathname()
  const cardRef = useRef<HTMLDivElement>(null)
  const previousStatusRef = useRef(session.status)
  const [loading, setLoading] = useState(false)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confidenceOpen, setConfidenceOpen] = useState(false)
  const [confidence, setConfidence] = useState(session.confidenceRating ?? 0)
  const [confidenceSaved, setConfidenceSaved] = useState(Boolean(session.confidenceRating))

  useEffect(() => {
    // Opening is transient navigation state; never carry it into a new route.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpening(false)
  }, [pathname])

  useEffect(() => {
    const resetOpeningState = () => setOpening(false)
    window.addEventListener('pageshow', resetOpeningState)
    return () => window.removeEventListener('pageshow', resetOpeningState)
  }, [])

  useEffect(() => {
    const card = cardRef.current
    if (!card || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(card, { autoAlpha: 0, y: 10 }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.36,
      delay: Math.min(session.position * 0.04, 0.18),
      ease: 'power3.out',
      clearProps: 'transform,opacity,visibility',
    })
    if (session.isSyncing) {
      gsap.fromTo(card, { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)' }, {
        boxShadow: '0 0 0 5px rgba(16, 185, 129, 0.2)',
        duration: 0.28,
        delay: 0.18,
        yoyo: true,
        repeat: 1,
        clearProps: 'boxShadow',
      })
    }
    return () => { gsap.killTweensOf(card) }
  }, [session.isSyncing, session.position])

  useEffect(() => {
    const card = cardRef.current
    const becameComplete = previousStatusRef.current !== 'completed' && session.status === 'completed'
    previousStatusRef.current = session.status
    if (!card || !becameComplete || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(card, { scale: 1 }, { scale: 1.012, duration: 0.16, yoyo: true, repeat: 1, ease: 'power2.out', clearProps: 'transform' })
  }, [session.status])
  const subject = session.activity?.unit.subject
  const unit = session.activity?.unit
  const activityType = session.activity?.activityType

  const handleStatus = async (status: SessionCardData['status'], rating?: number) => {
    if (!onStatusChange) return
    setLoading(true)
    setError(null)
    try {
      await onStatusChange(session.id, status, rating)
      if (status === 'completed' && rating !== undefined) setConfidenceSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this update')
    } finally {
      setLoading(false)
    }
  }

  const openWorkspace = async () => {
    if (!onOpen || opening) return
    setOpening(true)
    setError(null)
    try {
      await onOpen(session)
    } catch (err) {
      setOpening(false)
      setError(err instanceof Error ? err.message : 'Could not open the workspace')
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
    <Card ref={cardRef} className="relative z-0 overflow-visible border transition-all hover:z-20 hover:shadow-sm">
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
              {error && <p role="alert" className="mt-2 max-w-xs text-xs text-destructive">{error}</p>}
              {session.completionNote && (
                <p className="text-xs bg-muted/50 p-2 rounded mt-2 border text-muted-foreground italic">
                  &ldquo;{session.completionNote}&rdquo;
                </p>
              )}
            </div>

            <div className="relative z-50 flex flex-col items-end gap-2">
              <SessionStatus status={session.status} />
              {session.isSyncing && <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Saving</span>}
              
              <div className="flex items-center gap-1 mt-1">
                {onOpen && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary" disabled={opening} onClick={() => void openWorkspace()} title="Open workspace">
                    {opening ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <ArrowUpRight className="mr-1 h-3.5 w-3.5" />}{opening ? 'Opening…' : 'Open'}
                  </Button>
                )}
                {session.status !== 'completed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                    disabled={loading}
                    onClick={() => setConfidenceOpen(true)}
                    title="Mark Completed"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Done
                  </Button>
                )}
                {session.status === 'completed' && !session.confidenceRating && !confidenceSaved && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary" onClick={() => setConfidenceOpen(true)}>Add confidence</Button>}
                {confidenceOpen && <div className="absolute right-0 top-full z-[100] mt-2 w-64 rounded-xl border bg-background p-3 text-left shadow-2xl" role="dialog" aria-label="Session confidence"><p className="text-xs font-semibold">How confident do you feel?</p><div className="mt-2 grid grid-cols-5 gap-1">{[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" aria-label={`${rating} out of 5`} onClick={() => setConfidence(rating)} className={`rounded-md border px-2 py-2 text-sm ${confidence === rating ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'}`}>{rating}</button>)}</div><div className="mt-2 flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setConfidenceOpen(false)}>Cancel</Button><Button size="sm" disabled={!confidence || loading} onClick={() => { setConfidenceOpen(false); void handleStatus('completed', confidence) }}>Confirm</Button></div></div>}
                {session.status === 'scheduled' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground hover:bg-muted"
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

