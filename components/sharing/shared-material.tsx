'use client'

import { useMemo, useState } from 'react'
import { Eye, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export type SharedMaterialData = { importId: string; createdAt: string | Date; senderName: string | null; senderEmail: string; content: { title: string; note: { title: string; content: string } | null; links: Array<{ url: string; nickname: string; category: string }>; keywords: string[] } }

function sanitize(html: string) {
  if (typeof window === 'undefined') return ''
  const template = document.createElement('template'); template.innerHTML = html
  template.content.querySelectorAll('script,iframe,object,embed,form,style').forEach((node) => node.remove())
  template.content.querySelectorAll('*').forEach((element) => { for (const attribute of [...element.attributes]) { if (attribute.name.toLowerCase().startsWith('on')) element.removeAttribute(attribute.name); if ((attribute.name === 'href' || attribute.name === 'src') && !/^(https?:|mailto:|#)/i.test(attribute.value)) element.removeAttribute(attribute.name) } })
  return template.innerHTML
}

export function SharedMaterial({ item, onRemoved }: { item: SharedMaterialData; onRemoved: (id: string) => void }) {
  const [busy, setBusy] = useState(false); const html = useMemo(() => sanitize(item.content.note?.content ?? ''), [item.content.note?.content])
  async function remove() { setBusy(true); const response = await fetch(`/api/shared-imports/${item.importId}`, { method: 'DELETE' }); if (response.ok) onRemoved(item.importId); setBusy(false) }
  return <Card className="border-primary/25 bg-primary/[0.025] p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline"><Eye className="mr-1 h-3 w-3" />Read only</Badge><h3 className="text-base font-semibold">{item.content.title}</h3></div><p className="mt-1 text-xs text-muted-foreground">Shared by {item.senderName || item.senderEmail} · {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div><Button size="sm" variant="ghost" onClick={() => void remove()} disabled={busy}><Trash2 className="mr-1 h-4 w-4" />Remove</Button></div>{html ? <div className="session-editor mt-5 max-h-[34rem] overflow-auto rounded-lg border bg-background p-4 text-sm leading-7" dangerouslySetInnerHTML={{ __html: html }} /> : <p className="mt-5 text-sm text-muted-foreground">This shared session has no notes.</p>}<div className="mt-5 grid gap-4 border-t pt-4 md:grid-cols-2"><div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resources</p>{item.content.links.length ? <div className="space-y-1">{item.content.links.map((link) => <a key={`${link.url}-${link.nickname}`} href={/^(https?:|mailto:)/i.test(link.url) ? link.url : '#'} target="_blank" rel="noreferrer" className="block truncate text-sm text-primary hover:underline">{link.nickname} <span className="text-xs text-muted-foreground">· {link.category}</span></a>)}</div> : <p className="text-xs text-muted-foreground">No resources</p>}</div><div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Keywords</p><div className="flex flex-wrap gap-2">{item.content.keywords.map((keyword) => <span key={keyword} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{keyword}</span>)}</div></div></div></Card>
}
