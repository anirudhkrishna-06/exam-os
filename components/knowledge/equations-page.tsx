'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import katex from 'katex'
import gsap from 'gsap'
import { ArrowLeft, ArrowUpRight, Bookmark, CalendarDays, Pencil, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Equation = {
  id: string
  expression: string
  label: string
  sessionId: string
  scheduledDate: string
  activityType: string
  unit: { id: string; name: string; unitNumber: number }
}

const activityLabels: Record<string, string> = { theory_1: 'Theory 1', theory_2: 'Theory 2', numericals: 'Numericals', previous_papers: 'Past papers', revision: 'Revision' }
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function EquationsPage({ initial, subject }: { initial: Equation[]; subject: { id: string; name: string } }) {
  const [equations, setEquations] = useState(initial)
  const [editing, setEditing] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const pageRef = useRef<HTMLElement>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const grouped = equations.reduce<Record<string, { unit: Equation['unit']; equations: Equation[] }>>((all, equation) => {
    all[equation.unit.id] ??= { unit: equation.unit, equations: [] }
    all[equation.unit.id].equations.push(equation)
    return all
  }, {})

  useEffect(() => {
    if (!pageRef.current || reduceMotion()) return
    const context = gsap.context(() => {
      gsap.fromTo('[data-equation-card]', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out' })
    }, pageRef)
    return () => context.revert()
  }, [])

  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2400)
  }

  async function saveLabel(id: string) {
    setBusy(true)
    const response = await fetch(`/api/equations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label }) })
    setBusy(false)
    if (!response.ok) { notify('Could not update label'); return }
    setEquations((items) => items.map((item) => item.id === id ? { ...item, label: label.trim() || 'Important equation' } : item))
    setEditing(null)
    notify('Equation label updated')
  }

  async function removeEquation(id: string) {
    const element = cardRefs.current[id]
    if (element && !reduceMotion()) await new Promise<void>((resolve) => gsap.to(element, { opacity: 0, y: -8, scale: 0.98, duration: 0.2, onComplete: resolve }))
    const response = await fetch(`/api/equations/${id}`, { method: 'DELETE' })
    if (!response.ok) { notify('Could not remove equation'); return }
    setEquations((items) => items.filter((item) => item.id !== id))
    notify('Equation removed')
  }

  return <main ref={pageRef} className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
    <nav className="flex items-center gap-2 text-sm text-muted-foreground"><Link href={`/subjects/${subject.id}`} className="group inline-flex items-center gap-2 transition hover:text-foreground"><ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />Back to {subject.name}</Link></nav>
    <header className="mt-9 flex flex-col gap-3 border-b border-border/70 pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{subject.name}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Important equations</h1><p className="mt-2 text-sm text-muted-foreground">{equations.length} saved {equations.length === 1 ? 'equation' : 'equations'} across {Object.keys(grouped).length} {Object.keys(grouped).length === 1 ? 'unit' : 'units'}</p></div><div className="hidden rounded-full border border-primary/15 bg-primary/5 p-3 text-primary sm:block"><Bookmark className="h-5 w-5" /></div></header>
    {!equations.length ? <Card className="mt-10 border-dashed p-14 text-center"><Bookmark className="mx-auto h-9 w-9 text-muted-foreground/50" /><h2 className="mt-4 font-medium">No equations saved for this subject</h2><p className="mt-2 text-sm text-muted-foreground">Use the equation selector in a workspace to add important formulas here.</p></Card> : <div className="mt-10 space-y-12">{Object.values(grouped).map(({ unit, equations: items }) => <section key={unit.id}><div className="mb-4 flex items-baseline gap-3"><span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Unit {unit.unitNumber}</span><h2 className="text-xl font-semibold tracking-tight">{unit.name}</h2><span className="text-xs text-muted-foreground">{items.length}</span></div><div className="grid gap-5 xl:grid-cols-2">{items.map((equation) => <EquationCard key={equation.id} equation={equation} editing={editing === equation.id} label={label} busy={busy} cardRef={(element) => { cardRefs.current[equation.id] = element }} onEdit={() => { setEditing(equation.id); setLabel(equation.label) }} onLabelChange={setLabel} onSave={() => void saveLabel(equation.id)} onCancel={() => setEditing(null)} onRemove={() => void removeEquation(equation.id)} />)}</div></section>)}</div>}
    {toast && <div role="status" className="fixed bottom-5 right-5 z-50 rounded-xl border border-border bg-foreground px-4 py-3 text-sm font-medium text-background shadow-xl">{toast}</div>}
  </main>
}

function EquationCard({ equation, editing, label, busy, cardRef, onEdit, onLabelChange, onSave, onCancel, onRemove }: { equation: Equation; editing: boolean; label: string; busy: boolean; cardRef: (element: HTMLDivElement | null) => void; onEdit: () => void; onLabelChange: (value: string) => void; onSave: () => void; onCancel: () => void; onRemove: () => void }) {
  return <Card ref={cardRef} data-equation-card className="group relative overflow-hidden border-border/70 p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg sm:p-6"><div className="absolute inset-x-0 top-0 h-0.5 bg-primary/70" /><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="truncate text-sm font-semibold">{equation.label}</p><p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{activityLabels[equation.activityType] ?? 'Study session'} <span className="text-border">·</span> {equation.scheduledDate}</p></div><div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"><Button size="icon" variant="ghost" aria-label="Edit label" title="Edit label" onClick={onEdit}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Remove equation" title="Remove equation" onClick={onRemove}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></div><FormulaDisplay expression={equation.expression} />{editing && <form className="mt-4 flex gap-2 border-t pt-4" onSubmit={(event) => { event.preventDefault(); onSave() }}><Input value={label} onChange={(event) => onLabelChange(event.target.value)} autoFocus aria-label="Equation label" /><Button type="submit" size="sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button><Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button></form>}<Link href={`/sessions/${equation.sessionId}`} className="mt-5 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-primary">Open source workspace <ArrowUpRight className="h-3.5 w-3.5" /></Link></Card>
}

function FormulaDisplay({ expression }: { expression: string }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const formulaRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const measure = () => {
      const viewport = viewportRef.current
      const formula = formulaRef.current
      if (!viewport || !formula) return
      const available = Math.max(1, viewport.clientWidth - 28)
      setScale(Math.min(1, available / Math.max(formula.scrollWidth, 1)))
    }
    measure()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    if (viewportRef.current) observer?.observe(viewportRef.current)
    return () => observer?.disconnect()
  }, [expression])

  return <div ref={viewportRef} className="my-7 flex min-h-24 w-full items-center justify-center overflow-hidden rounded-xl border border-primary/10 bg-primary/[0.035] px-3 py-5 text-center text-xl"><div ref={formulaRef} className="w-max max-w-none whitespace-nowrap" style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }} dangerouslySetInnerHTML={{ __html: katex.renderToString(expression, { displayMode: true, throwOnError: false }) }} /></div>
}
