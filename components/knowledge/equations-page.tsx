'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import Link from 'next/link'
import katex from 'katex'
import gsap from 'gsap'
import { ArrowLeft, ArrowUpRight, Bookmark, CalendarDays, GripVertical, Pencil, Trash2, Ungroup } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Equation = { id: string; expression: string; label: string; sessionId: string; scheduledDate: string; activityType: string; groupId: string | null; unit: { id: string; name: string; unitNumber: number } }
type EquationCluster = { key: string; groupId: string | null; items: Equation[] }
const activityLabels: Record<string, string> = { theory_1: 'Theory 1', theory_2: 'Theory 2', numericals: 'Numericals', previous_papers: 'Past papers', revision: 'Revision' }
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function EquationsPage({ initial, subject }: { initial: Equation[]; subject: { id: string; name: string } }) {
  const [equations, setEquations] = useState(initial)
  const [unitFilter, setUnitFilter] = useState('all')
  const [editing, setEditing] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [draggingIds, setDraggingIds] = useState<string[]>([])
  const [dragTarget, setDragTarget] = useState<string | null>(null)
  const pageRef = useRef<HTMLElement>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const units = useMemo(() => Array.from(new Map(equations.map((item) => [item.unit.id, item.unit])).values()).sort((a, b) => a.unitNumber - b.unitNumber), [equations])
  const visibleEquations = unitFilter === 'all' ? equations : equations.filter((equation) => equation.unit.id === unitFilter)
  const grouped = visibleEquations.reduce<Record<string, { unit: Equation['unit']; cards: EquationCluster[] }>>((all, equation) => {
    all[equation.unit.id] ??= { unit: equation.unit, cards: [] }
    const cards = all[equation.unit.id].cards
    const existing = equation.groupId ? cards.find((card) => card.groupId === equation.groupId) : undefined
    if (existing) existing.items.push(equation)
    else cards.push({ key: equation.groupId ?? equation.id, groupId: equation.groupId, items: [equation] })
    return all
  }, {})

  useEffect(() => {
    if (!pageRef.current || reduceMotion()) return
    const context = gsap.context(() => { gsap.fromTo('[data-equation-card]', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out' }) }, pageRef)
    return () => context.revert()
  }, [])

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(''), 2400) }
  function startDrag(event: DragEvent<HTMLDivElement>, cluster: EquationCluster) { setDraggingIds(cluster.items.map((item) => item.id)); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', cluster.key) }
  function allowDrop(event: DragEvent<HTMLDivElement>, cluster: EquationCluster) { if (!draggingIds.length || draggingIds.some((id) => cluster.items.some((item) => item.id === id))) return; event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDragTarget(cluster.key) }
  async function mergeOnDrop(event: DragEvent<HTMLDivElement>, target: EquationCluster) {
    event.preventDefault()
    const targetIds = target.items.map((item) => item.id)
    const ids = Array.from(new Set([...targetIds, ...draggingIds]))
    setDragTarget(null); setDraggingIds([])
    if (ids.length < 2) return
    const response = await fetch('/api/equations/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ equationIds: ids }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) { notify(result.error ?? 'These equations could not be grouped'); return }
    setEquations((items) => {
      const firstTargetIndex = items.findIndex((item) => targetIds.includes(item.id))
      const groupedItems = ids.map((id) => items.find((item) => item.id === id)).filter((item): item is Equation => Boolean(item)).map((item) => ({ ...item, groupId: result.group.groupId }))
      const remaining = items.filter((item) => !ids.includes(item.id))
      const insertAt = firstTargetIndex < 0 ? remaining.length : Math.min(firstTargetIndex, remaining.length)
      return [...remaining.slice(0, insertAt), ...groupedItems, ...remaining.slice(insertAt)]
    })
    notify('Equations grouped')
  }
  async function ungroup(cluster: EquationCluster) {
    if (!cluster.groupId) return
    const responses = await Promise.all(cluster.items.map((item) => fetch(`/api/equations/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId: null }) })))
    if (responses.every((response) => response.ok)) { setEquations((items) => items.map((item) => cluster.items.some((groupItem) => groupItem.id === item.id) ? { ...item, groupId: null } : item)); notify('Equations ungrouped') }
    else notify('Could not ungroup equations')
  }
  async function saveLabel(id: string) { setBusy(true); const response = await fetch(`/api/equations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label }) }); setBusy(false); if (!response.ok) { notify('Could not update label'); return }; setEquations((items) => items.map((item) => item.id === id ? { ...item, label: label.trim() || 'Important equation' } : item)); setEditing(null); notify('Equation label updated') }
  async function removeEquation(id: string) { const element = cardRefs.current[id]; if (element && !reduceMotion()) await new Promise<void>((resolve) => gsap.to(element, { opacity: 0, y: -8, scale: 0.98, duration: 0.2, onComplete: resolve })); const response = await fetch(`/api/equations/${id}`, { method: 'DELETE' }); if (!response.ok) { notify('Could not remove equation'); return }; setEquations((items) => items.filter((item) => item.id !== id)); notify('Equation removed') }

  return <main ref={pageRef} className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
    <nav className="flex items-center gap-2 text-sm text-muted-foreground"><Link href={`/subjects/${subject.id}`} className="group inline-flex items-center gap-2 transition hover:text-foreground"><ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />Back to {subject.name}</Link></nav>
    <header className="mt-9 flex flex-col gap-4 border-b border-border/70 pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{subject.name}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Important equations</h1></div><div className="flex items-center gap-2"><select value={unitFilter} onChange={(event) => setUnitFilter(event.target.value)} aria-label="Filter equations by unit" className="h-9 rounded-md border border-border/70 bg-background px-3 text-xs text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"><option value="all">All units</option>{units.map((unit) => <option key={unit.id} value={unit.id}>Unit {unit.unitNumber} · {unit.name}</option>)}</select><div className="hidden rounded-full border border-primary/15 bg-primary/5 p-3 text-primary sm:block"></div></div></header>
    {!visibleEquations.length ? <Card className="mt-10 border-dashed p-14 text-center"><Bookmark className="mx-auto h-9 w-9 text-muted-foreground/50" /><h2 className="mt-4 font-medium">No equations saved for this view</h2><p className="mt-2 text-sm text-muted-foreground">Use the equation selector in a workspace to add important formulas here.</p></Card> : <div className="mt-10 space-y-12">{Object.values(grouped).map(({ unit, cards }) => <section key={unit.id}><div className="mb-4 flex items-baseline gap-3"><span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Unit {unit.unitNumber}</span><h2 className="text-xl font-semibold tracking-tight">{unit.name}</h2><span className="text-xs text-muted-foreground">{cards.reduce((total, card) => total + card.items.length, 0)} equations</span></div><div className="grid items-start gap-5 xl:grid-cols-2">{[cards.filter((_, index) => index % 2 === 0), cards.filter((_, index) => index % 2 === 1)].map((column, columnIndex) => <div key={columnIndex} className="space-y-5">{column.map((cluster) => <EquationClusterCard key={cluster.key} cluster={cluster} isTarget={dragTarget === cluster.key} isDragging={draggingIds.some((id) => cluster.items.some((item) => item.id === id))} cardRef={(element) => { cluster.items.forEach((item) => { cardRefs.current[item.id] = element }) }} onDragStart={(event) => startDrag(event, cluster)} onDragOver={(event) => allowDrop(event, cluster)} onDragLeave={() => setDragTarget((current) => current === cluster.key ? null : current)} onDrop={(event) => void mergeOnDrop(event, cluster)} onUngroup={() => void ungroup(cluster)} editing={editing} label={label} busy={busy} onEdit={(item) => { setEditing(item.id); setLabel(item.label) }} onLabelChange={setLabel} onSave={() => void saveLabel(editing ?? '')} onCancel={() => setEditing(null)} onRemove={(id) => void removeEquation(id)} />)}</div>)}</div></section>)}</div>}
    {toast && <div role="status" className="fixed bottom-5 right-5 z-50 rounded-xl border border-border bg-foreground px-4 py-3 text-sm font-medium text-background shadow-xl">{toast}</div>}
  </main>
}

function EquationClusterCard({ cluster, isTarget, isDragging, cardRef, onDragStart, onDragOver, onDragLeave, onDrop, onUngroup, editing, label, busy, onEdit, onLabelChange, onSave, onCancel, onRemove }: { cluster: EquationCluster; isTarget: boolean; isDragging: boolean; cardRef: (element: HTMLDivElement | null) => void; onDragStart: (event: DragEvent<HTMLDivElement>) => void; onDragOver: (event: DragEvent<HTMLDivElement>) => void; onDragLeave: () => void; onDrop: (event: DragEvent<HTMLDivElement>) => void; onUngroup: () => void; editing: string | null; label: string; busy: boolean; onEdit: (item: Equation) => void; onLabelChange: (value: string) => void; onSave: () => void; onCancel: () => void; onRemove: (id: string) => void }) {
  return <Card ref={cardRef} data-equation-card draggable onDragStart={onDragStart} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} className={`group relative overflow-hidden border-border/70 p-5 shadow-sm transition duration-200 sm:p-6 ${isTarget ? 'border-primary bg-primary/[0.04] shadow-lg shadow-primary/10 ring-2 ring-primary/25' : 'hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg'} ${isDragging ? 'opacity-60' : ''}`}><div className="absolute inset-x-0 top-0 h-0.5 bg-primary/70" /><div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><GripVertical className="h-4 w-4 text-primary/70" /><span>{cluster.groupId ? `${cluster.items.length} related equations` : 'Drag onto another equation to group'}</span></div>{cluster.groupId && <Button size="sm" variant="ghost" className="h-7 gap-1.5 px-2 text-xs" onClick={onUngroup}><Ungroup className="h-3.5 w-3.5" />Ungroup</Button>}</div><div className="space-y-5">{cluster.items.map((equation, index) => <div key={equation.id} className={index ? 'border-t border-border/70 pt-5' : ''}><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="truncate text-sm font-semibold">{equation.label}</p><p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{activityLabels[equation.activityType] ?? 'Study session'} <span className="text-border">·</span> {equation.scheduledDate}</p></div><div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"><Button size="icon" variant="ghost" aria-label="Edit label" title="Edit label" onClick={() => onEdit(equation)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Remove equation" title="Remove equation" onClick={() => onRemove(equation.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></div><FormulaDisplay expression={equation.expression} />{editing === equation.id && <form className="mt-4 flex gap-2 border-t pt-4" onSubmit={(event) => { event.preventDefault(); onSave() }}><Input value={label} onChange={(event) => onLabelChange(event.target.value)} autoFocus aria-label="Equation label" /><Button type="submit" size="sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button><Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button></form>}<Link href={`/sessions/${equation.sessionId}`} className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-primary">Open source workspace <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>)}</div></Card>
}

function FormulaDisplay({ expression }: { expression: string }) { const viewportRef = useRef<HTMLDivElement>(null); const formulaRef = useRef<HTMLDivElement>(null); const [scale, setScale] = useState(1); useLayoutEffect(() => { const measure = () => { const viewport = viewportRef.current; const formula = formulaRef.current; if (!viewport || !formula) return; setScale(Math.min(1, Math.max(1, viewport.clientWidth - 28) / Math.max(formula.scrollWidth, 1))) }; measure(); const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null; if (viewportRef.current) observer?.observe(viewportRef.current); return () => observer?.disconnect() }, [expression]); return <div ref={viewportRef} className="my-5 flex min-h-24 w-full items-center justify-center overflow-hidden rounded-xl border border-primary/10 bg-primary/[0.035] px-3 py-5 text-center text-xl"><div ref={formulaRef} className="w-max max-w-none whitespace-nowrap" style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }} dangerouslySetInnerHTML={{ __html: katex.renderToString(expression, { displayMode: true, throwOnError: false }) }} /></div> }
