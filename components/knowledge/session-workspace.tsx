'use client'

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Link2, Plus, Save, Tag, Trash2 } from 'lucide-react'
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

export function SessionWorkspace({ initial }: { initial: Workspace }) {
  const [workspace, setWorkspace] = useState(initial)
  const [title, setTitle] = useState(initial.note.title)
  const [content, setContent] = useState(initial.note.content)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [keyword, setKeyword] = useState('')
  const [linkOpen, setLinkOpen] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)

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
  async function deleteKeyword(id: string) { await fetch(`/api/sessions/${workspace.session.id}/keywords?id=${id}`, { method: 'DELETE' }); setWorkspace((current) => ({ ...current, keywords: current.keywords.filter((item) => item.id !== id) })) }
  async function addLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    const response = await fetch(`/api/sessions/${workspace.session.id}/links`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: form.get('url'), nickname: form.get('nickname'), category: form.get('category') }) })
    if (response.ok) { const data = await response.json(); setWorkspace((current) => ({ ...current, links: [...current.links, data.link] })); setLinkOpen(false); event.currentTarget.reset() }
  }
  async function deleteLink(id: string) { await fetch(`/api/sessions/${workspace.session.id}/links?id=${id}`, { method: 'DELETE' }); setWorkspace((current) => ({ ...current, links: current.links.filter((item) => item.id !== id) })) }
  function format(command: string, value?: string) { document.execCommand(command, false, value); editorRef.current?.focus(); setContent(editorRef.current?.innerHTML ?? '') ; setSaveState('unsaved') }
  function addInlineLink() { const url = window.prompt('Paste a URL'); if (url) format('createLink', url) }

  const unit = workspace.session.activity?.unit
  const activity = workspace.session.activity?.activityType
  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
    <Link href={`/planner/${workspace.session.scheduledDate}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to planner</Link>
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{workspace.session.activity ? labels[activity ?? ''] : 'Study session'}</p><h1 className="mt-1 text-3xl font-bold tracking-tight">{unit?.name ?? 'Session workspace'}</h1><p className="mt-1 text-sm text-muted-foreground"><Link className="hover:text-foreground" href={`/subjects/${unit?.subject.id}`}>{unit?.subject.name}</Link> · Unit {unit?.unitNumber}</p></div><span className="text-sm text-muted-foreground">{saveState === 'saving' ? 'Saving…' : saveState === 'unsaved' ? 'Unsaved changes' : 'Saved'}</span></header>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <Card className="overflow-hidden"><div className="flex items-center gap-1 border-b bg-muted/20 p-2"><Button size="sm" variant="ghost" onClick={() => format('bold')}>Bold</Button><Button size="sm" variant="ghost" onClick={() => format('italic')}>Italic</Button><Button size="sm" variant="ghost" onClick={() => format('formatBlock', 'h2')}>Heading</Button><Button size="sm" variant="ghost" onClick={() => format('insertUnorderedList')}>List</Button><Button size="sm" variant="ghost" onClick={addInlineLink}>Link</Button><span className="ml-auto text-xs text-muted-foreground"><Save className="mr-1 inline h-3.5 w-3.5" />Autosave</span></div><Input value={title} onChange={(event) => { setTitle(event.target.value); setSaveState('unsaved') }} placeholder="Note title" className="rounded-none border-0 border-b px-6 py-5 text-xl font-semibold shadow-none focus-visible:ring-0" /><div ref={editorRef} contentEditable suppressContentEditableWarning onInput={(event) => { setContent(event.currentTarget.innerHTML); setSaveState('unsaved') }} dangerouslySetInnerHTML={{ __html: content }} data-placeholder="Start writing…" className="min-h-[28rem] px-6 py-6 text-[1.05rem] leading-8 outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]" /></Card>
      <aside className="space-y-4">{workspace.previous && <Card className="border-primary/20 bg-primary/[0.03] p-4"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Continue where you left off</p><Link href={`/sessions/${workspace.previous.session.id}`} className="mt-2 block"><p className="truncate text-sm font-medium">{workspace.previous.note?.title || 'Previous session'}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{workspace.previous.note?.content.replace(/<[^>]+>/g, '').slice(0, 120) || 'Open the previous session'}</p></Link></Card>}<details className="rounded-xl border p-4"><summary className="cursor-pointer list-none font-semibold">Related sessions <span className="text-xs font-normal text-muted-foreground">{workspace.related?.length ?? 0}</span></summary><div className="mt-3 space-y-2">{workspace.related?.map((item) => <Link key={item.session.id} href={`/sessions/${item.session.id}`} className="block rounded-lg bg-muted/40 p-2 hover:bg-primary/10"><span className="block text-xs font-medium">{labels[item.session.activity?.activityType ?? ''] ?? 'Study session'}</span><span className="mt-1 block truncate text-[11px] text-muted-foreground">{item.note?.title || item.session.scheduledDate}</span></Link>)}</div></details><Card className="p-4"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Keywords</h2><Tag className="h-4 w-4 text-muted-foreground" /></div><div className="flex flex-wrap gap-2">{workspace.keywords.map((item) => <button key={item.id} onClick={() => deleteKeyword(item.id)} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary hover:bg-destructive/10 hover:text-destructive">{item.keyword} ×</button>)}</div><Input value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={addKeyword} placeholder="Add keyword + Enter" className="mt-3 h-8 text-xs" /></Card><Card className="p-4"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Links</h2><Link2 className="h-4 w-4 text-muted-foreground" /></div><div className="space-y-2">{workspace.links.map((link) => <div key={link.id} className="group flex items-center gap-2"><a href={link.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm text-primary hover:underline" title={link.url}>{link.nickname}</a><span className="text-[10px] text-muted-foreground">{link.category}</span><button onClick={() => deleteLink(link.id)} className="opacity-0 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></button></div>)}</div>{linkOpen ? <form onSubmit={addLink} className="mt-3 space-y-2"><Input name="nickname" placeholder="Name" required className="h-8 text-xs" /><Input name="url" type="url" placeholder="https://…" required className="h-8 text-xs" /><select name="category" defaultValue="Other" className="h-8 w-full rounded-md border bg-background px-2 text-xs">{categories.map((item) => <option key={item}>{item}</option>)}</select><div className="flex gap-2"><Button size="sm" type="submit">Save link</Button><Button size="sm" type="button" variant="ghost" onClick={() => setLinkOpen(false)}>Cancel</Button></div></form> : <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setLinkOpen(true)}><Plus className="mr-1 h-3.5 w-3.5" />Add link</Button>}</Card></aside>
    </div>
  </div>
}
