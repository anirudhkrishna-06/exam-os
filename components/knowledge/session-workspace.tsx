'use client'

import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bold, Check, ChevronDown, ExternalLink, Expand, Italic, Link2, List, ListChecks, ListOrdered, Minimize2, Palette, Plus, Redo2, Save, Strikethrough, Tag, Trash2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

type Workspace = {
  session: { id: string; scheduledDate: string; activity?: { activityType: string; unit: { id: string; name: string; unitNumber: number; subject: { id: string; name: string } } } }
  note: { id: string | null; title: string; content: string }
  links: Array<{ id: string; url: string; nickname: string; category: string }>
  keywords: Array<{ id: string; keyword: string }>
  previous?: { session: any; note: { title: string; content: string } | null } | null
  related?: Array<{ session: any; note: { title: string; content: string } | null }>
}

const labels: Record<string, string> = { theory_1: 'Theory 1', theory_2: 'Theory 2', numericals: 'Numericals', previous_papers: 'Past papers', revision: 'Revision' }
const categories = ['ChatGPT', 'Question Papers', 'Study Material', 'Documentation', 'External Resources', 'Other']
const textColors = [
  { name: 'Red', value: '#c24141', className: 'bg-red-600' },
  { name: 'Dark green', value: '#216e52', className: 'bg-emerald-800' },
  { name: 'Dark blue', value: '#24578a', className: 'bg-blue-800' },
  { name: 'Orange-yellow', value: '#c47a16', className: 'bg-amber-500' },
]

function ToolbarButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <button type="button" title={label} aria-label={label} onMouseDown={(event) => { event.preventDefault(); onClick() }} className="inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{children}</button>
}

export function SessionWorkspace({ initial }: { initial: Workspace }) {
  const [workspace, setWorkspace] = useState(initial)
  const [title, setTitle] = useState(initial.note.title)
  const [content, setContent] = useState(initial.note.content)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [keyword, setKeyword] = useState('')
  const [linkOpen, setLinkOpen] = useState(false)
  const [wideMode, setWideMode] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const hydratedRef = useRef(false)
  const selectionRef = useRef<Range | null>(null)

  // Do not replace innerHTML on every keystroke: doing so resets the browser caret.
  useEffect(() => {
    if (!editorRef.current || hydratedRef.current) return
    editorRef.current.innerHTML = initial.note.content || ''
    hydratedRef.current = true
  }, [initial.note.content])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (title === initial.note.title && content === initial.note.content) return
      setSaveState('saving')
      const response = await fetch(`/api/sessions/${workspace.session.id}/workspace`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, content }) })
      setSaveState(response.ok ? 'saved' : 'unsaved')
    }, 800)
    return () => clearTimeout(timer)
  }, [title, content, initial.note.content, initial.note.title, workspace.session.id])

  async function addKeyword(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || !keyword.trim()) return
    event.preventDefault()
    const response = await fetch(`/api/sessions/${workspace.session.id}/keywords`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyword }) })
    if (response.ok) { const data = await response.json(); setWorkspace((current) => ({ ...current, keywords: [...current.keywords, data.keyword] })); setKeyword('') }
  }

  async function deleteKeyword(id: string) {
    await fetch(`/api/sessions/${workspace.session.id}/keywords?id=${id}`, { method: 'DELETE' })
    setWorkspace((current) => ({ ...current, keywords: current.keywords.filter((item) => item.id !== id) }))
  }

  async function addLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    const response = await fetch(`/api/sessions/${workspace.session.id}/links`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: form.get('url'), nickname: form.get('nickname'), category: form.get('category') }) })
    if (response.ok) { const data = await response.json(); setWorkspace((current) => ({ ...current, links: [...current.links, data.link] })); setLinkOpen(false); event.currentTarget.reset() }
  }

  async function deleteLink(id: string) {
    await fetch(`/api/sessions/${workspace.session.id}/links?id=${id}`, { method: 'DELETE' })
    setWorkspace((current) => ({ ...current, links: current.links.filter((item) => item.id !== id) }))
  }

  function rememberSelection() {
    const selection = window.getSelection()
    if (!selection?.rangeCount || !editorRef.current?.contains(selection.anchorNode)) return
    selectionRef.current = selection.getRangeAt(0).cloneRange()
  }

  function restoreSelection() {
    if (!selectionRef.current) return
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(selectionRef.current)
  }

  function format(command: string, value?: string) {
    restoreSelection()
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    rememberSelection()
    setContent(editorRef.current?.innerHTML ?? '')
    setSaveState('unsaved')
  }

  function escapeHtml(value: string) {
    return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character)
  }

  function markdownTable(lines: string[]) {
    const rows = lines.map((line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim()))
    const header = rows[0]
    const body = rows.slice(2)
    return `<table><thead><tr>${header.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('')}</tr></thead><tbody>${body.map((row) => `<tr>${header.map((_, index) => `<td>${escapeHtml(row[index] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`
  }

  function plainTextToHtml(text: string) {
    const lines = text.replace(/\r/g, '').split('\n')
    const output: string[] = []
    for (let index = 0; index < lines.length;) {
      const line = lines[index]
      const next = lines[index + 1] ?? ''
      if (line.includes('|') && /^\s*\|?\s*:?-{2,}/.test(next)) {
        const tableLines = [line, next]
        index += 2
        while (index < lines.length && lines[index].includes('|')) tableLines.push(lines[index++])
        output.push(markdownTable(tableLines)); continue
      }
      if (line.includes('\t') && lines[index + 1]?.includes('\t')) {
        const tableLines: string[] = []
        while (index < lines.length && lines[index].includes('\t')) tableLines.push(lines[index++].split('\t').join(' | '))
        output.push(markdownTable([tableLines[0], tableLines[0].split('|').map(() => '---').join('|'), ...tableLines.slice(1)])); continue
      }
      if (/^#{1,3}\s+/.test(line)) output.push(`<h${Math.min(3, line.match(/^#+/)?.[0].length ?? 1)}>${escapeHtml(line.replace(/^#{1,3}\s+/, ''))}</h${Math.min(3, line.match(/^#+/)?.[0].length ?? 1)}>`) 
      else if (/^[-*]\s+/.test(line)) output.push(`<ul><li>${escapeHtml(line.replace(/^[-*]\s+/, ''))}</li></ul>`)
      else if (/^\d+[.)]\s+/.test(line)) output.push(`<ol><li>${escapeHtml(line.replace(/^\d+[.)]\s+/, ''))}</li></ol>`)
      else if (line.trim()) output.push(`<p>${escapeHtml(line)}</p>`)
      index += 1
    }
    return output.join('')
  }

  function normalizePastedHtml(html: string, text: string) {
    if (!html.trim()) return plainTextToHtml(text)
    const document = new DOMParser().parseFromString(html, 'text/html')
    document.querySelectorAll('script,style,meta,link,svg').forEach((node) => node.remove())
    const allowed = 'a,blockquote,br,code,div,h1,h2,h3,h4,li,ol,p,pre,strong,em,s,span,table,thead,tbody,tfoot,tr,th,td,ul'
    document.body.querySelectorAll('*').forEach((node) => {
      if (!allowed.split(',').includes(node.tagName.toLowerCase())) { node.replaceWith(...Array.from(node.childNodes)); return }
      Array.from(node.attributes).forEach((attribute) => {
        if (node.tagName.toLowerCase() === 'a' && attribute.name === 'href') return
        if (node.tagName.toLowerCase() === 'span' && attribute.name === 'style' && /color\s*:/.test(attribute.value)) return
        node.removeAttribute(attribute.name)
      })
      if (node.tagName.toLowerCase() === 'a') { node.setAttribute('target', '_blank'); node.setAttribute('rel', 'noreferrer') }
    })
    return document.body.innerHTML || plainTextToHtml(text)
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault()
    restoreSelection()
    const clipboard = event.clipboardData
    const html = normalizePastedHtml(clipboard.getData('text/html'), clipboard.getData('text/plain'))
    document.execCommand('insertHTML', false, html)
    editorRef.current?.focus()
    rememberSelection()
    setContent(editorRef.current?.innerHTML ?? '')
    setSaveState('unsaved')
  }

  function addInlineLink() {
    const url = window.prompt('Paste a URL')
    if (url) format('createLink', url)
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!(event.metaKey || event.ctrlKey)) return
    const key = event.key.toLowerCase()
    if (key === 'b' || key === 'i' || key === 'u') { event.preventDefault(); format(key === 'u' ? 'underline' : key === 'b' ? 'bold' : 'italic') }
    if (key === 'k') { event.preventDefault(); addInlineLink() }
  }

  const unit = workspace.session.activity?.unit
  const activity = workspace.session.activity?.activityType
  const plainPreview = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()

  return <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
    <div className="mb-6 flex items-center justify-between gap-3">
      <Link href={`/planner/${workspace.session.scheduledDate}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"><ArrowLeft className="h-4 w-4" />Planner</Link>
      <div className="flex items-center gap-3"><button type="button" onClick={() => setWideMode((current) => !current)} className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground" title={wideMode ? 'Exit wide writing mode' : 'Expand writing space'}>{wideMode ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}{wideMode ? 'Exit wide view' : 'Wide view'}</button><div className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">{saveState === 'saving' ? <><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />Saving</> : saveState === 'unsaved' ? <><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Unsaved</> : <><Check className="h-3.5 w-3.5 text-emerald-600" />Saved</>}</div></div>
    </div>

    <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><Link href={`/subjects/${unit?.subject.id}`} className="transition hover:text-foreground">{unit?.subject.name}</Link><span>/</span><Link href={`/units/${unit?.id}`} className="transition hover:text-foreground">Unit {unit?.unitNumber}</Link><span>/</span><span>{labels[activity ?? ''] ?? 'Study session'}</span></div>
        <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{unit?.name ?? 'Session workspace'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{new Date(`${workspace.session.scheduledDate}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
      </div>
    </header>

    <div className={`grid items-start gap-6 transition-[grid-template-columns] duration-300 ease-out ${wideMode ? 'xl:grid-cols-1' : 'xl:grid-cols-[minmax(0,1fr)_19rem]'}`}>
      <Card className={`overflow-hidden border-border/70 shadow-sm transition-all duration-300 ${wideMode ? 'rounded-2xl' : ''}`}>
        <div className="flex flex-wrap items-center gap-1 border-b bg-muted/20 px-3 py-2">
          <ToolbarButton label="Undo" onClick={() => format('undo')}><Undo2 className="h-4 w-4" /></ToolbarButton><ToolbarButton label="Redo" onClick={() => format('redo')}><Redo2 className="h-4 w-4" /></ToolbarButton><span className="mx-1 h-5 w-px bg-border" />
          <select aria-label="Text style" defaultValue="p" onMouseDown={rememberSelection} onChange={(event) => format('formatBlock', event.target.value)} className="h-8 rounded-md border-0 bg-transparent px-2 text-xs font-medium text-muted-foreground outline-none hover:bg-muted"><option value="p">Text</option><option value="h2">Heading</option><option value="h3">Subheading</option><option value="blockquote">Quote</option><option value="pre">Code</option></select><span className="mx-1 h-5 w-px bg-border" />
          <ToolbarButton label="Bold (Ctrl+B)" onClick={() => format('bold')}><Bold className="h-4 w-4" /></ToolbarButton><ToolbarButton label="Italic (Ctrl+I)" onClick={() => format('italic')}><Italic className="h-4 w-4" /></ToolbarButton><ToolbarButton label="Strikethrough" onClick={() => format('strikeThrough')}><Strikethrough className="h-4 w-4" /></ToolbarButton><ToolbarButton label="Bulleted list" onClick={() => format('insertUnorderedList')}><List className="h-4 w-4" /></ToolbarButton><ToolbarButton label="Numbered list" onClick={() => format('insertOrderedList')}><ListOrdered className="h-4 w-4" /></ToolbarButton><ToolbarButton label="Checklist" onClick={() => format('insertUnorderedList')}><ListChecks className="h-4 w-4" /></ToolbarButton><ToolbarButton label="Add link (Ctrl+K)" onClick={addInlineLink}><Link2 className="h-4 w-4" /></ToolbarButton>
          <details className="relative"><summary className="flex h-8 cursor-pointer list-none items-center gap-1 rounded-md px-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" title="Text color"><Palette className="h-4 w-4" /><span className="hidden text-xs sm:inline">Color</span></summary><div className="absolute left-0 top-10 z-20 flex gap-1 rounded-lg border bg-popover p-2 shadow-lg">{textColors.map((color) => <button key={color.value} type="button" title={color.name} aria-label={color.name} onMouseDown={(event) => { event.preventDefault(); format('foreColor', color.value) }} className={`h-6 w-6 rounded-full ${color.className} ring-offset-2 transition hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring`} />)}</div></details>
          <span className="ml-auto hidden items-center gap-1 text-xs text-muted-foreground sm:flex"><Save className="h-3.5 w-3.5" />Autosave</span>
        </div>
        <Input value={title} onChange={(event) => { setTitle(event.target.value); setSaveState('unsaved') }} placeholder="Untitled note" aria-label="Note title" className="h-auto rounded-none border-0 border-b px-6 py-5 text-xl font-semibold shadow-none focus-visible:ring-0 sm:px-10 sm:text-2xl" />
        <div ref={editorRef} contentEditable suppressContentEditableWarning dir="ltr" role="textbox" aria-label="Session notes" aria-multiline="true" onKeyDown={handleEditorKeyDown} onKeyUp={rememberSelection} onMouseUp={rememberSelection} onPaste={handlePaste} onInput={(event) => { setContent(event.currentTarget.innerHTML); setSaveState('unsaved') }} data-placeholder="Start writing…" className="session-editor min-h-[32rem] px-6 py-7 text-[0.98rem] leading-7 outline-none sm:px-10 sm:py-9" />
        <div className="flex items-center justify-between border-t bg-muted/10 px-6 py-3 text-xs text-muted-foreground sm:px-10"><span>Write freely. Changes save automatically.</span><span>{plainPreview(content).length} characters</span></div>
      </Card>

      <aside className={`space-y-4 transition-all duration-300 ${wideMode ? 'pointer-events-none hidden opacity-0' : 'opacity-100 xl:sticky xl:top-6'}`}>
        {workspace.previous && <Card className="border-primary/20 bg-primary/[0.035] p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Continue</p><ChevronDown className="h-4 w-4 text-primary" /></div><Link href={`/sessions/${workspace.previous.session.id}`} className="mt-3 block rounded-lg transition hover:bg-primary/5"><p className="truncate text-sm font-medium">{workspace.previous.note?.title || 'Previous session'}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{workspace.previous.note ? plainPreview(workspace.previous.note.content).slice(0, 140) : 'Open your previous notes'}</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">Open session <ExternalLink className="h-3 w-3" /></span></Link></Card>}
        <details open className="rounded-xl border bg-card p-4 shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between font-semibold">Related sessions <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">{workspace.related?.length ?? 0}</span></summary><div className="mt-3 space-y-1">{workspace.related?.length ? workspace.related.map((item) => <Link key={item.session.id} href={`/sessions/${item.session.id}`} className="block rounded-lg px-2 py-2 transition hover:bg-muted"><span className="block text-xs font-medium">{labels[item.session.activity?.activityType ?? ''] ?? 'Study session'}</span><span className="mt-1 block truncate text-[11px] text-muted-foreground">{item.note?.title || item.session.scheduledDate}</span></Link>) : <p className="pt-3 text-xs text-muted-foreground">Your related sessions will appear here.</p>}</div></details>
        <Card className="p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Keywords</h2><Tag className="h-4 w-4 text-muted-foreground" /></div><div className="flex flex-wrap gap-2">{workspace.keywords.map((item) => <button key={item.id} onClick={() => deleteKeyword(item.id)} title="Remove keyword" className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary transition hover:bg-destructive/10 hover:text-destructive">{item.keyword} ×</button>)}{!workspace.keywords.length && <span className="text-xs text-muted-foreground">No keywords yet</span>}</div><Input value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={addKeyword} placeholder="Add keyword · Enter" className="mt-3 h-9 text-xs" /></Card>
        <Card className="p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Links</h2><Link2 className="h-4 w-4 text-muted-foreground" /></div><div className="space-y-2">{workspace.links.map((link) => <div key={link.id} className="group flex items-center gap-2"><a href={link.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm text-primary hover:underline" title={link.url}>{link.nickname}</a><span className="hidden text-[10px] text-muted-foreground sm:block">{link.category}</span><button onClick={() => deleteLink(link.id)} aria-label={`Remove ${link.nickname}`} className="opacity-0 transition group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></button></div>)}{!workspace.links.length && !linkOpen && <p className="text-xs text-muted-foreground">Keep useful resources close.</p>}</div>{linkOpen ? <form onSubmit={addLink} className="mt-3 space-y-2"><Input name="nickname" placeholder="Name" required className="h-8 text-xs" /><Input name="url" type="url" placeholder="https://…" required className="h-8 text-xs" /><select name="category" defaultValue="Other" className="h-8 w-full rounded-md border bg-background px-2 text-xs">{categories.map((item) => <option key={item}>{item}</option>)}</select><div className="flex gap-2"><Button size="sm" type="submit">Save link</Button><Button size="sm" type="button" variant="ghost" onClick={() => setLinkOpen(false)}>Cancel</Button></div></form> : <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setLinkOpen(true)}><Plus className="mr-1 h-3.5 w-3.5" />Add link</Button>}</Card>
      </aside>
    </div>
  </main>
}
