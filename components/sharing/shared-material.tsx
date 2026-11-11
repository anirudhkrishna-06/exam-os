'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

export type SharedMaterialData = { importId: string; createdAt: string | Date; senderName: string | null; senderEmail: string; content: { title: string; note: { title: string; content: string } | null; links: Array<{ url: string; nickname: string; category: string }>; keywords: string[] } }

function sanitize(html: string) {
  if (typeof window === 'undefined') return ''
  const template = document.createElement('template'); template.innerHTML = html
  template.content.querySelectorAll('script,iframe,object,embed,form,style').forEach((node) => node.remove())
  template.content.querySelectorAll('*').forEach((element) => { for (const attribute of [...element.attributes]) { if (attribute.name.toLowerCase().startsWith('on')) element.removeAttribute(attribute.name); if ((attribute.name === 'href' || attribute.name === 'src') && !/^(https?:|mailto:|#)/i.test(attribute.value)) element.removeAttribute(attribute.name) } })
  return template.innerHTML
}

export function SharedMaterial({ item }: { item: SharedMaterialData; onRemoved?: (id: string) => void }) {
  const html = useMemo(() => sanitize(item.content.note?.content ?? ''), [item.content.note?.content])
  const preview = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 130)
  return <Link href={`/shared/${item.importId}`} className="group block"><Card className="border-primary/20 bg-primary/[0.025] p-5 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/45 group-hover:shadow-md"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline"><Eye className="mr-1 h-3 w-3" />Shared</Badge><h3 className="truncate text-base font-semibold">{item.content.title}</h3></div><p className="mt-1 text-xs text-muted-foreground">Shared by {item.senderName || item.senderEmail} · {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div><ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" /></div><div className="mt-4 flex items-center justify-between gap-3 border-t pt-3 text-xs text-muted-foreground"><span className="truncate">{preview || 'Shared learning material'}</span><span className="shrink-0 font-medium text-primary">Open workspace</span></div></Card></Link>
}
