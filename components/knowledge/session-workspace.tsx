'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { gsap } from 'gsap'
import { Flip } from 'gsap/Flip'
import { ArrowLeft, Bold, Check, ChevronDown, CircleCheck, Code, Download, ExternalLink, Expand, FileText, Heading1, Heading2, Heading3, Italic, Lightbulb, Link2, List, ListChecks, ListOrdered, ListTree, Loader2, Minimize2, Minus, Palette, Plus, Quote, Redo2, Strikethrough, Tag, Trash2, Type, Underline, Undo2, Unlink, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ShareSessionDialog } from '@/components/sharing/share-session-dialog'
import { ExternalShareDialog } from '@/components/sharing/external-share-dialog'
import katex from 'katex'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

gsap.registerPlugin(Flip)

export type WorkspaceSession = {
  id: string
  scheduledDate: string
  activity?: {
    id?: string
    activityType: string
    unit: { id: string; name: string; unitNumber: number; subject: { id: string; name: string } }
  } | null
}

export type Workspace = {
  session: WorkspaceSession
  note: { id: string | null; title: string; content: string }
  links: Array<{ id: string; url: string; nickname: string; category: string }>
  keywords: Array<{ id: string; keyword: string }>
  previous?: { session: WorkspaceSession; note: { title: string; content: string } | null } | null
  related?: Array<{ session: WorkspaceSession; note: { title: string; content: string } | null }>
}

type BlockId = 'text' | 'h1' | 'h2' | 'h3' | 'bullet' | 'number' | 'todo' | 'quote' | 'code' | 'divider' | 'callout'
type ActiveState = { bold: boolean; italic: boolean; underline: boolean; strike: boolean; list: 'ul' | 'ol' | 'todo' | null }
type BubbleState = { x: number; y: number; visible: boolean; linkMode: boolean }
type SlashState = { query: string; index: number; top: number; bottom: number; left: number }
type OutlineHeading = { id: string; text: string; level: 1 | 2 | 3 }

const labels: Record<string, string> = { theory_1: 'Theory 1', theory_2: 'Theory 2', numericals: 'Numericals', previous_papers: 'Past papers', revision: 'Revision' }
const categories = ['ChatGPT', 'Question Papers', 'Study Material', 'Documentation', 'External Resources', 'Other']

// A colour no one would ever pick. We apply it and then strip it, which is how "Default" works:
// execCommand has no "remove colour" command, so we mark the text and unwrap the marker.
const SENTINEL = 'rgb(0, 0, 1)'
const SENTINEL_HEX = '#000001'

const textColors = [
  { name: 'Gray', value: '#787774' },
  { name: 'Orange', value: '#d9730d' },
  { name: 'Yellow', value: '#cb912f' },
  { name: 'Green', value: '#448361' },
  { name: 'Blue', value: '#337ea9' },
  { name: 'Purple', value: '#9065b0' },
  { name: 'Pink', value: '#c14c8a' },
  { name: 'Red', value: '#d44c47' },
]

const highlightColors = [
  { name: 'Gray', value: 'rgba(130, 130, 130, 0.28)' },
  { name: 'Yellow', value: 'rgba(250, 204, 21, 0.34)' },
  { name: 'Green', value: 'rgba(34, 197, 94, 0.26)' },
  { name: 'Blue', value: 'rgba(59, 130, 246, 0.26)' },
  { name: 'Purple', value: 'rgba(168, 85, 247, 0.26)' },
  { name: 'Pink', value: 'rgba(236, 72, 153, 0.26)' },
  { name: 'Red', value: 'rgba(239, 68, 68, 0.28)' },
]

const iconClass = 'h-4 w-4'
const blocks: Array<{ id: BlockId; title: string; hint: string; keywords: string; icon: ReactNode }> = [
  { id: 'text', title: 'Text', hint: 'Plain paragraph', keywords: 'paragraph plain p', icon: <Type className={iconClass} /> },
  { id: 'h1', title: 'Heading 1', hint: 'Big section heading', keywords: 'h1 title large #', icon: <Heading1 className={iconClass} /> },
  { id: 'h2', title: 'Heading 2', hint: 'Medium section heading', keywords: 'h2 heading ##', icon: <Heading2 className={iconClass} /> },
  { id: 'h3', title: 'Heading 3', hint: 'Small section heading', keywords: 'h3 subheading ###', icon: <Heading3 className={iconClass} /> },
  { id: 'bullet', title: 'Bulleted list', hint: 'A simple bulleted list', keywords: 'ul unordered list bullet -', icon: <List className={iconClass} /> },
  { id: 'number', title: 'Numbered list', hint: 'A list with numbering', keywords: 'ol ordered list number 1.', icon: <ListOrdered className={iconClass} /> },
  { id: 'todo', title: 'To-do list', hint: 'Track tasks with checkboxes', keywords: 'todo checklist checkbox task []', icon: <ListChecks className={iconClass} /> },
  { id: 'quote', title: 'Quote', hint: 'Capture a quote', keywords: 'blockquote cite >', icon: <Quote className={iconClass} /> },
  { id: 'callout', title: 'Callout', hint: 'Make a point stand out', keywords: 'note tip info highlight box', icon: <Lightbulb className={iconClass} /> },
  { id: 'code', title: 'Code', hint: 'Monospace code block', keywords: 'pre snippet formula ```', icon: <Code className={iconClass} /> },
  { id: 'divider', title: 'Divider', hint: 'Visually divide sections', keywords: 'hr line rule separator ---', icon: <Minus className={iconClass} /> },
]

const blockTypeOptions = [
  { value: 'p', label: 'Text' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'blockquote', label: 'Quote' },
  { value: 'pre', label: 'Code' },
]

const editorCss = `
.session-editor { caret-color: currentColor; word-break: break-word; }
.session-editor:empty::before { content: attr(data-placeholder); color: color-mix(in srgb, currentColor 35%, transparent); pointer-events: none; }
.session-editor > *:first-child { margin-top: 0; }
.session-editor p { margin: 0.15rem 0; min-height: 1.75rem; }
.session-editor h1 { font-size: 2rem; line-height: 1.2; font-weight: 700; letter-spacing: -0.02em; margin: 1.9rem 0 0.4rem; }
.session-editor h2 { font-size: 1.55rem; line-height: 1.25; font-weight: 650; letter-spacing: -0.015em; margin: 1.6rem 0 0.35rem; }
.session-editor h3 { font-size: 1.2rem; line-height: 1.3; font-weight: 600; margin: 1.3rem 0 0.3rem; }
.session-editor ul { list-style: disc; padding-left: 1.6rem; margin: 0.2rem 0; }
.session-editor ol { list-style: decimal; padding-left: 1.6rem; margin: 0.2rem 0; }
.session-editor ul ul { list-style: circle; }
.session-editor ul ul ul { list-style: square; }
.session-editor li { padding-left: 0.2rem; margin: 0.1rem 0; }
.session-editor ul[data-checklist] { list-style: none; padding-left: 0; }
.session-editor ul[data-checklist] > li { position: relative; padding-left: 2rem; transition: color 0.2s ease; }
.session-editor ul[data-checklist] > li::before {
  content: ''; position: absolute; left: 0.25rem; top: 0.34rem; height: 1.05rem; width: 1.05rem; border-radius: 0.3rem;
  border: 1.5px solid color-mix(in srgb, currentColor 45%, transparent); cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.session-editor ul[data-checklist] > li:hover::before { border-color: #2383e2; }
.session-editor ul[data-checklist] > li[data-checked='true'] { color: color-mix(in srgb, currentColor 50%, transparent); text-decoration: line-through; }
.session-editor ul[data-checklist] > li[data-checked='true']::before {
  background: #2383e2 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4 8.5l2.7 2.7L12 5.5' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / 100% no-repeat;
  border-color: #2383e2; transform: scale(1.06);
}
.session-editor blockquote { border-left: 3px solid currentColor; padding: 0.15rem 0 0.15rem 1rem; margin: 0.6rem 0; }
.session-editor blockquote[data-callout] {
  position: relative; border: 0; border-radius: 0.65rem; padding: 0.9rem 1rem 0.9rem 2.9rem;
  background: color-mix(in srgb, currentColor 6%, transparent);
}
.session-editor blockquote[data-callout]::before { content: '\\1F4A1'; position: absolute; left: 1rem; top: 0.85rem; font-size: 1.1rem; }
.session-editor pre { background: color-mix(in srgb, currentColor 7%, transparent); border-radius: 0.6rem; padding: 0.9rem 1.1rem; margin: 0.6rem 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.86rem; line-height: 1.65; white-space: pre-wrap; overflow-x: auto; }
.session-editor :not(pre) > code { background: color-mix(in srgb, currentColor 10%, transparent); color: #eb5757; border-radius: 0.3rem; padding: 0.12rem 0.36rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.88em; }
.session-editor a { text-decoration: underline; text-decoration-color: color-mix(in srgb, currentColor 35%, transparent); text-underline-offset: 3px; transition: text-decoration-color 0.15s ease, color 0.15s ease; cursor: text; }
.session-editor a:hover { color: #2383e2; text-decoration-color: #2383e2; }
.session-editor hr { border: 0; border-top: 1px solid color-mix(in srgb, currentColor 18%, transparent); margin: 1.4rem 0; }
.session-editor table { border-collapse: separate; border-spacing: 0; width: 100%; max-width: 100%; margin: 1rem 0; overflow: hidden; border: 1px solid color-mix(in srgb, currentColor 16%, transparent); border-radius: 0.65rem; font-size: 0.92rem; table-layout: fixed; }
.session-editor th, .session-editor td { border-right: 1px solid color-mix(in srgb, currentColor 16%, transparent); border-bottom: 1px solid color-mix(in srgb, currentColor 16%, transparent); padding: 0.55rem 0.75rem; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
.session-editor th { background: color-mix(in srgb, currentColor 5%, transparent); font-weight: 600; }
.session-editor tr:last-child td { border-bottom: 0; }
.session-editor th:last-child, .session-editor td:last-child { border-right: 0; }
.session-editor ::selection { background: rgba(35, 131, 226, 0.28); }
.session-editor [data-math='block'] { display: block; overflow-x: auto; margin: 0.7rem 0; text-align: center; }
.session-editor [data-math='inline'] { white-space: nowrap; }
`

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/* ------------------------------------------------------------------ pure helpers */

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character)
}

function inlineMarkdown(escaped: string) {
  return escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>')
}

function mathHtml(value: string) {
  // Some clipboard sources escape an already escaped TeX delimiter (\\[...\\]).
  // Normalize only delimiter backslashes; TeX command backslashes are untouched.
  const normalized = value.replace(/\\{2,}(?=[()[\]])/g, '\\')
  const pattern = /\\{1,2}\(([\s\S]+?)\\{1,2}\)|\\{1,2}\[([\s\S]+?)\\{1,2}\]|\$\$([\s\S]+?)\$\$/g
  let output = ''
  let cursor = 0
  for (const match of normalized.matchAll(pattern)) {
    const start = match.index ?? 0
    output += escapeHtml(normalized.slice(cursor, start))
    const expression = (match[1] ?? match[2] ?? match[3] ?? '').trim()
    const display = Boolean(match[2] ?? match[3])
    output += `<span data-math="${display ? 'block' : 'inline'}" data-latex="${escapeHtml(expression)}">${katex.renderToString(expression, { displayMode: display, throwOnError: false })}</span>`
    cursor = start + match[0].length
  }
  return output + escapeHtml(normalized.slice(cursor))
}

function normalizeUrl(value: string) {
  const url = value.trim()
  return /^(https?:|mailto:|\/|#)/i.test(url) ? url : `https://${url}`
}

function plainText(html: string) {
  return html.replace(/<\/(p|div|h[1-6]|li|blockquote|tr|pre)>/gi, ' ').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
}

function tableCells(line: string) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())
}

function isTableSeparator(line: string) {
  const cells = tableCells(line)
  return cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(cell))
}

function renderTableCell(cell: string, tag: 'th' | 'td') {
  return `<${tag}>${inlineMarkdown(mathHtml(escapeHtml(cell)))}</${tag}>`
}

function markdownTable(lines: string[]) {
  const rows = lines.map(tableCells)
  const columnCount = Math.max(...rows.map((row) => row.length), 1)
  const header = Array.from({ length: columnCount }, (_, index) => rows[0]?.[index] ?? '')
  const body = rows.slice(2).filter((row) => row.some(Boolean))
  return `<table><thead><tr>${header.map((cell) => renderTableCell(cell, 'th')).join('')}</tr></thead><tbody>${body.map((row) => `<tr>${header.map((_, index) => renderTableCell(row[index] ?? '', 'td')).join('')}</tr>`).join('')}</tbody></table>`
}

function plainTextToHtml(text: string) {
  const lines = text.replace(/\r/g, '').split('\n')
  const output: string[] = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    const next = lines[index + 1] ?? ''
    if (line.includes('|') && isTableSeparator(next)) {
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
    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) { output.push(`<h${heading[1].length}>${inlineMarkdown(escapeHtml(heading[2]))}</h${heading[1].length}>`); index += 1; continue }
    if (/^\s*[-*]\s+\[[ xX]\]\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length) {
        const match = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/.exec(lines[index])
        if (!match) break
        items.push(`<li data-checked="${match[1] !== ' '}">${inlineMarkdown(escapeHtml(match[2]))}</li>`); index += 1
      }
      output.push(`<ul data-checklist="true">${items.join('')}</ul>`); continue
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) items.push(`<li>${inlineMarkdown(escapeHtml(lines[index++].replace(/^\s*[-*]\s+/, '')))}</li>`)
      output.push(`<ul>${items.join('')}</ul>`); continue
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) items.push(`<li>${inlineMarkdown(escapeHtml(lines[index++].replace(/^\s*\d+[.)]\s+/, '')))}</li>`)
      output.push(`<ol>${items.join('')}</ol>`); continue
    }
    if (/^>\s?/.test(line)) { output.push(`<blockquote>${inlineMarkdown(escapeHtml(line.replace(/^>\s?/, '')))}</blockquote>`); index += 1; continue }
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) { output.push('<hr>'); index += 1; continue }
    if (line.trim()) output.push(`<p>${inlineMarkdown(mathHtml(line))}</p>`)
    index += 1
  }
  return output.join('')
}

const allowedTags = new Set('a,b,i,u,blockquote,br,code,div,em,h1,h2,h3,h4,hr,li,ol,p,pre,s,span,strong,table,tbody,td,tfoot,th,thead,tr,ul'.split(','))
const keptDataAttributes = new Set(['data-checklist', 'data-checked', 'data-callout'])

function normalizePastedHtml(html: string, text: string) {
  if (!html.trim()) return plainTextToHtml(text)
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script,style,meta,link,svg,img,iframe').forEach((node) => node.remove())
  doc.body.querySelectorAll('*').forEach((node) => {
    const tag = node.tagName.toLowerCase()
    if (!allowedTags.has(tag)) { node.replaceWith(...Array.from(node.childNodes)); return }
    Array.from(node.attributes).forEach((attribute) => {
      if (tag === 'a' && attribute.name === 'href') return
      if (keptDataAttributes.has(attribute.name)) return
      if (tag === 'span' && attribute.name === 'style' && /color\s*:/.test(attribute.value)) return
      node.removeAttribute(attribute.name)
    })
    if (tag === 'a') { node.setAttribute('target', '_blank'); node.setAttribute('rel', 'noreferrer') }
  })
  doc.body.querySelectorAll('p,div,li,h1,h2,h3,blockquote,td,th').forEach((element) => {
    if (element.querySelector('code,pre,[data-math]')) return
    const source = element.textContent ?? ''
    if (!/[\\$]/.test(source)) return
    element.innerHTML = mathHtml(source)
  })
  return doc.body.innerHTML || plainTextToHtml(text)
}

function closestIn(node: Node | null, selector: string, root: HTMLElement | null): HTMLElement | null {
  const start = node && node.nodeType === 3 ? node.parentElement : (node as HTMLElement | null)
  const found = start?.closest(selector) as HTMLElement | null | undefined
  return found && root && root.contains(found) && found !== root ? found : null
}

function removeAnimated(origin: HTMLElement, done: () => void) {
  const target = (origin.closest('[data-item]') as HTMLElement | null) ?? origin
  if (prefersReducedMotion()) { done(); return }
  gsap.to(target, { opacity: 0, scale: 0.85, duration: 0.18, ease: 'power2.in', onComplete: done })
}

function blockMatches(query: string) {
  const q = query.toLowerCase().trim()
  return blocks.filter((block) => !q || block.title.toLowerCase().includes(q) || block.keywords.toLowerCase().includes(q))
}

function shortcutBlock(text: string): BlockId | null {
  switch (text) {
    case '#': return 'h1'
    case '##': return 'h2'
    case '###': return 'h3'
    case '-': case '*': return 'bullet'
    case '[]': return 'todo'
    case '>': return 'quote'
    case '```': return 'code'
    default: return /^\d+\.$/.test(text) ? 'number' : null
  }
}

/* ------------------------------------------------------------------ small components */

function ToolbarButton({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: ReactNode }) {
  return <button type="button" title={label} aria-label={label} aria-pressed={active} onMouseDown={(event) => { event.preventDefault(); onClick() }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onClick() } }} className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 transition-all duration-150 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{children}</button>
}

function ColorMenu({ onText, onHighlight }: { onText: (value: string | null) => void; onHighlight: (value: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => { if (!wrapRef.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  useEffect(() => {
    if (open && panelRef.current && !prefersReducedMotion()) gsap.fromTo(panelRef.current, { opacity: 0, y: -6, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.18, ease: 'power2.out' })
  }, [open])

  const choose = (apply: () => void) => { apply(); setOpen(false) }
  const swatch = 'grid h-7 w-7 place-items-center rounded-md border text-sm font-semibold transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return <div ref={wrapRef} className="relative">
    <ToolbarButton label="Color and highlight" active={open} onClick={() => setOpen((current) => !current)}><Palette className="h-4 w-4" /><span className="ml-1 hidden text-xs sm:inline">Color</span></ToolbarButton>
    {open && <div ref={panelRef} onMouseDown={(event) => event.preventDefault()} className="absolute left-0 top-full z-50 mt-2 w-60 rounded-xl border bg-popover p-3 text-popover-foreground shadow-xl">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Text color</p>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" title="Default color" aria-label="Default color" onClick={() => choose(() => onText(null))} className={`${swatch} w-auto gap-1 px-2 text-xs font-medium`}><span className="text-sm font-semibold">A</span>Default</button>
        {textColors.map((color) => <button key={color.value} type="button" title={color.name} aria-label={color.name} onClick={() => choose(() => onText(color.value))} style={{ color: color.value }} className={swatch}>A</button>)}
      </div>
      <p className="mb-2 mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Highlight</p>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" title="No highlight" aria-label="No highlight" onClick={() => choose(() => onHighlight(null))} className={`${swatch} w-auto px-2 text-xs font-medium`}>None</button>
        {highlightColors.map((color) => <button key={color.value} type="button" title={color.name} aria-label={`${color.name} highlight`} onClick={() => choose(() => onHighlight(color.value))} style={{ backgroundColor: color.value }} className={swatch}>A</button>)}
      </div>
    </div>}
  </div>
}

function SlashMenu({ items, index, top, bottom, left, onPick, onHover }: { items: typeof blocks; index: number; top: number; bottom: number; left: number; onPick: (id: BlockId) => void; onHover: (index: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const height = Math.min(items.length * 52 + 36, 330)
  const up = bottom + height + 12 > window.innerHeight && top > height + 12
  const style = up ? { bottom: window.innerHeight - top + 8, left: Math.min(left, window.innerWidth - 300) } : { top: bottom + 8, left: Math.min(left, window.innerWidth - 300) }

  useEffect(() => {
    if (ref.current && !prefersReducedMotion()) gsap.fromTo(ref.current, { opacity: 0, y: up ? 8 : -8, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power3.out' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [index])

  return <div ref={ref} style={style} onMouseDown={(event) => event.preventDefault()} className="fixed z-50 max-h-[21rem] w-72 overflow-y-auto rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-2xl" role="listbox" aria-label="Insert block">
    <p className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Blocks</p>
    {items.map((item, position) => <button key={item.id} type="button" role="option" aria-selected={position === index} data-index={position} onMouseEnter={() => onHover(position)} onClick={() => onPick(item.id)} className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${position === index ? 'bg-muted' : ''}`}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border bg-background text-muted-foreground">{item.icon}</span>
      <span className="min-w-0"><span className="block text-sm font-medium">{item.title}</span><span className="block truncate text-xs text-muted-foreground">{item.hint}</span></span>
    </button>)}
  </div>
}

function PopIn({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => { if (ref.current && !prefersReducedMotion()) gsap.from(ref.current, { opacity: 0, scale: 0.85, duration: 0.35, ease: 'back.out(2)', clearProps: 'all' }) })
    return () => window.cancelAnimationFrame(frame)
  }, [])
  return <div ref={ref} data-item className={className}>{children}</div>
}

function SaveIndicator({ state }: { state: 'saved' | 'saving' | 'unsaved' }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => { if (ref.current && !prefersReducedMotion()) gsap.fromTo(ref.current, { opacity: 0.35, y: -4 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }) })
    return () => window.cancelAnimationFrame(frame)
  }, [state])
  return <div ref={ref} className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
    {state === 'saving' ? <><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />Saving…</> : state === 'unsaved' ? <><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Unsaved</> : <><Check className="h-3.5 w-3.5 text-emerald-600" />Saved</>}
  </div>
}

/* ------------------------------------------------------------------ main component */

export function SessionWorkspace({ initial, readOnly = false, sharedBy, external = false }: { initial: Workspace; readOnly?: boolean; sharedBy?: string; external?: boolean }) {
  const [workspace, setWorkspace] = useState(initial)
  const [title, setTitle] = useState(initial.note.title)
  const [content, setContent] = useState(initial.note.content)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [keyword, setKeyword] = useState('')
  const [linkOpen, setLinkOpen] = useState(false)
  const [wideMode, setWideMode] = useState(false)
  const [stuck, setStuck] = useState(false)
  const [active, setActive] = useState<ActiveState>({ bold: false, italic: false, underline: false, strike: false, list: null })
  const [blockType, setBlockType] = useState('p')
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [outline, setOutline] = useState<OutlineHeading[]>([])
  const [activeHeading, setActiveHeading] = useState<string | null>(null)
  const [bubble, setBubble] = useState<BubbleState>({ x: 0, y: 0, visible: false, linkMode: false })
  const [linkUrl, setLinkUrl] = useState('')
  const [slash, setSlash] = useState<SlashState | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportPhase, setExportPhase] = useState('Getting your workspace ready')
  const [exportError, setExportError] = useState('')

  const rootRef = useRef<HTMLElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const asideRef = useRef<HTMLElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const linkInputRef = useRef<HTMLInputElement>(null)
  const linkFormRef = useRef<HTMLFormElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const hydratedRef = useRef(false)
  const selectionRef = useRef<Range | null>(null)
  const slashRef = useRef<{ node: Text; start: number } | null>(null)
  const flipStateRef = useRef<ReturnType<typeof Flip.getState> | null>(null)
  const exportDialogRef = useRef<HTMLDivElement>(null)
  const exportFillRef = useRef<HTMLDivElement>(null)
  const wideBusyRef = useRef(false)
  const savedRef = useRef({ title: initial.note.title, content: initial.note.content })
  const latestRef = useRef({ title, content })
  const saveStateRef = useRef(saveState)

  useEffect(() => {
    latestRef.current = { title, content }
    saveStateRef.current = saveState
  }, [title, content, saveState])

  useEffect(() => {
    if (!exportDialogRef.current || !exporting || prefersReducedMotion()) return
    gsap.fromTo(exportDialogRef.current, { opacity: 0, y: 18, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.42, ease: 'back.out(1.6)' })
  }, [exporting])

  useEffect(() => {
    if (!exportFillRef.current) return
    gsap.to(exportFillRef.current, { width: `${exportProgress}%`, duration: prefersReducedMotion() ? 0 : 0.35, ease: 'power2.out', overwrite: true })
  }, [exportProgress])

  /* ---------- setup: hydrate editor once, never rewrite innerHTML while typing (it would reset the caret) */
  useEffect(() => {
    if (!editorRef.current || hydratedRef.current) return
    const sourceContent = initial.note.content || ''
    const legacy = document.createElement('div')
    // Notes imported as plain text need the same Markdown/TeX conversion as pasted text.
    // Previously they were assigned directly to innerHTML, leaving tables and equations literal.
    legacy.innerHTML = /<[a-z][\s\S]*>/i.test(sourceContent) ? sourceContent : plainTextToHtml(sourceContent)
    legacy.querySelectorAll('p,div,li,h1,h2,h3,blockquote,td,th').forEach((element) => {
      if (element.querySelector('code,pre,[data-math]')) return
      const source = element.textContent ?? ''
      if (/[\\$]/.test(source)) element.innerHTML = mathHtml(source)
    })
    const nextContent = legacy.innerHTML
    editorRef.current.innerHTML = nextContent
    if (nextContent !== sourceContent) {
      queueMicrotask(() => {
        setContent(nextContent)
        setSaveState('unsaved')
      })
    }
    hydratedRef.current = true
    try { document.execCommand('defaultParagraphSeparator', false, 'p') } catch { /* unsupported */ }
  }, [initial.note.content])

  /* ---------- live document outline (desktop only) */
  useEffect(() => {
    const root = editorRef.current
    if (!root) return

    const refreshOutline = () => {
      const next: OutlineHeading[] = []
      root.querySelectorAll<HTMLElement>('h1,h2,h3').forEach((heading, index) => {
        const id = `workspace-heading-${index}`
        heading.id = id
        heading.classList.add('scroll-mt-24')
        const text = (heading.textContent ?? '').trim()
        if (text) next.push({ id, text, level: Number(heading.tagName.slice(1)) as 1 | 2 | 3 })
      })
      setOutline((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next)
      setActiveHeading((current) => current && next.some((heading) => heading.id === current) ? current : next[0]?.id ?? null)
    }

    refreshOutline()
    const observer = new MutationObserver(refreshOutline)
    observer.observe(root, { childList: true, subtree: true, characterData: true })
    const onScroll = () => {
      const headings = Array.from(root.querySelectorAll<HTMLElement>('h1,h2,h3'))
      const current = headings.filter((heading) => heading.getBoundingClientRect().top <= 150).at(-1)
      if (current) setActiveHeading(current.id)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { observer.disconnect(); window.removeEventListener('scroll', onScroll) }
  }, [content])

  function jumpToHeading(id: string) {
    const heading = editorRef.current?.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
    if (!heading) return
    heading.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
    setActiveHeading(id)
  }

  /* ---------- entrance animation */
  useEffect(() => {
    let ctx: ReturnType<typeof gsap.context> | undefined
    const frame = window.requestAnimationFrame(() => {
      if (prefersReducedMotion() || !rootRef.current) return
      ctx = gsap.context(() => {
        gsap.timeline({ defaults: { ease: 'power3.out', clearProps: 'transform,opacity' } })
          .from('[data-anim="top"]', { opacity: 0, y: -8, duration: 0.4 })
          .from('[data-anim="header"] > div > *', { opacity: 0, y: 14, duration: 0.5, stagger: 0.07 }, '-=0.2')
          .from('[data-anim="card"]', { opacity: 0, y: 24, duration: 0.6 }, '-=0.35')
          .from('[data-anim="side"] > *', { opacity: 0, x: 18, duration: 0.5, stagger: 0.08 }, '-=0.45')
      }, rootRef)
    })
    return () => { window.cancelAnimationFrame(frame); ctx?.revert() }
  }, [])

  /* ---------- autosave (debounced) + Ctrl/Cmd+S + leave warning */
  const saveNow = useCallback(async () => {
    const { title: nextTitle, content: nextContent } = latestRef.current
    if (nextTitle === savedRef.current.title && nextContent === savedRef.current.content) { setSaveState('saved'); return }
    setSaveState('saving')
    try {
      const response = await fetch(`/api/sessions/${workspace.session.id}/workspace`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: nextTitle, content: nextContent }) })
      if (response.ok) {
        savedRef.current = { title: nextTitle, content: nextContent }
        setSaveState(latestRef.current.title === nextTitle && latestRef.current.content === nextContent ? 'saved' : 'unsaved')
      } else setSaveState('unsaved')
    } catch { setSaveState('unsaved') }
  }, [workspace.session.id])

  useEffect(() => {
    if (readOnly) return
    const timer = setTimeout(saveNow, 800)
    return () => clearTimeout(timer)
  }, [content, readOnly, saveNow, title])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (saveStateRef.current !== 'saved') { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  /* ---------- selection helpers */
  const rememberSelection = useCallback(() => {
    const selection = window.getSelection()
    if (!selection?.rangeCount || !editorRef.current?.contains(selection.anchorNode)) return
    selectionRef.current = selection.getRangeAt(0).cloneRange()
  }, [])

  function restoreSelection() {
    if (!selectionRef.current) return
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(selectionRef.current)
  }

  function focusEditor() {
    editorRef.current?.focus({ preventScroll: true })
    restoreSelection()
  }

  const sync = useCallback(() => {
    setContent(editorRef.current?.innerHTML ?? '')
    setSaveState('unsaved')
  }, [])

  const updateActive = useCallback(() => {
    const root = editorRef.current
    const selection = window.getSelection()
    if (!root || !selection?.rangeCount || !root.contains(selection.anchorNode)) return
    const list = closestIn(selection.anchorNode, 'ul,ol', root)
    const next: ActiveState = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strike: document.queryCommandState('strikeThrough'),
      list: list ? (list.tagName === 'OL' ? 'ol' : list.hasAttribute('data-checklist') ? 'todo' : 'ul') : null,
    }
    setActive((prev) => (prev.bold === next.bold && prev.italic === next.italic && prev.underline === next.underline && prev.strike === next.strike && prev.list === next.list ? prev : next))
    const block = closestIn(selection.anchorNode, 'h1,h2,h3,blockquote,pre', root)
    setBlockType(block ? block.tagName.toLowerCase() : 'p')
  }, [])

  /* ---------- floating selection toolbar */
  const positionBubble = useCallback((rect: DOMRect) => {
    const width = bubbleRef.current?.offsetWidth ?? 320
    const height = bubbleRef.current?.offsetHeight ?? 44
    let y = rect.top - height - 10
    if (y < 8) y = rect.bottom + 10
    const x = Math.min(Math.max(8, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 8)
    setBubble((current) => (current.x === x && current.y === y && current.visible ? current : { ...current, x, y, visible: true }))
  }, [])

  const updateBubble = useCallback(() => {
    if (readOnly) return
    const root = editorRef.current
    const selection = window.getSelection()
    if (bubbleRef.current?.contains(document.activeElement)) return
    const hide = () => setBubble((current) => (current.visible || current.linkMode ? { ...current, visible: false, linkMode: false } : current))
    if (!root || !selection || !selection.rangeCount || selection.isCollapsed || !root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) { hide(); return }
    const rect = selection.getRangeAt(0).getBoundingClientRect()
    if (!rect.width && !rect.height) { hide(); return }
    positionBubble(rect)
  }, [positionBubble, readOnly])

  useEffect(() => {
    let timer = 0
    const onSelection = () => { window.clearTimeout(timer); timer = window.setTimeout(() => { updateBubble(); updateActive() }, 60) }
    const onViewport = () => updateBubble()
    document.addEventListener('selectionchange', onSelection)
    window.addEventListener('scroll', onViewport, { passive: true })
    window.addEventListener('resize', onViewport)
    return () => { window.clearTimeout(timer); document.removeEventListener('selectionchange', onSelection); window.removeEventListener('scroll', onViewport); window.removeEventListener('resize', onViewport) }
  }, [updateBubble, updateActive])

  useEffect(() => {
    const element = bubbleRef.current
    if (!element) return
    const frame = window.requestAnimationFrame(() => {
      if (prefersReducedMotion()) { gsap.set(element, { autoAlpha: bubble.visible ? 1 : 0 }); return }
      gsap.to(element, { autoAlpha: bubble.visible ? 1 : 0, y: bubble.visible ? 0 : 8, scale: bubble.visible ? 1 : 0.96, duration: 0.18, ease: 'power2.out', overwrite: 'auto' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [bubble.visible])

  useEffect(() => {
    if (!bubble.linkMode) return
    const range = selectionRef.current
    if (range) positionBubble(range.getBoundingClientRect())
    const timer = window.setTimeout(() => { linkInputRef.current?.focus(); linkInputRef.current?.select() }, 30)
    return () => window.clearTimeout(timer)
  }, [bubble.linkMode, positionBubble])

  /* ---------- sticky toolbar shadow */
  useEffect(() => {
    const element = sentinelRef.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), { threshold: 0 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  /* ---------- wide mode: GSAP Flip morphs the card, the sidebar slides away */
  function toggleWide() {
    if (wideBusyRef.current) return
    const card = cardRef.current
    const side = asideRef.current
    const run = () => {
      if (card && !prefersReducedMotion()) { flipStateRef.current = Flip.getState(card); wideBusyRef.current = true }
      setWideMode((current) => !current)
    }
    if (!wideMode && side && !prefersReducedMotion()) {
      wideBusyRef.current = true
      gsap.to(Array.from(side.children), { opacity: 0, x: 24, duration: 0.22, stagger: 0.03, ease: 'power2.in', onComplete: () => { wideBusyRef.current = false; run() } })
    } else run()
  }

  useIsoLayoutEffect(() => {
    const state = flipStateRef.current
    if (!state) return
    flipStateRef.current = null
    Flip.from(state, { duration: 0.7, ease: 'power3.inOut', scale: false, onComplete: () => { wideBusyRef.current = false } })
    const side = asideRef.current
    if (side && !wideMode) gsap.fromTo(Array.from(side.children), { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.07, delay: 0.3, ease: 'power3.out', clearProps: 'transform,opacity' })
  }, [wideMode])

  /* ---------- link form reveal */
  useEffect(() => {
    if (linkOpen && linkFormRef.current && !prefersReducedMotion()) gsap.from(linkFormRef.current, { height: 0, opacity: 0, duration: 0.3, ease: 'power2.out', clearProps: 'all' })
  }, [linkOpen])

  /* ---------- formatting */
  function cleanSentinels() {
    const root = editorRef.current
    if (!root) return
    const nodes = root.querySelectorAll<HTMLElement>('span[style]')
    if (!nodes.length) return
    const selection = window.getSelection()
    const saved = selection && selection.rangeCount && root.contains(selection.anchorNode) ? { an: selection.anchorNode, ao: selection.anchorOffset, fn: selection.focusNode, fo: selection.focusOffset } : null
    let changed = false
    nodes.forEach((node) => {
      const badColor = node.style.color === SENTINEL
      const badBackground = node.style.backgroundColor === SENTINEL
      if (!badColor && !badBackground) return
      if (badColor) node.style.removeProperty('color')
      if (badBackground) node.style.removeProperty('background-color')
      changed = true
      if (!node.getAttribute('style')?.trim()) node.removeAttribute('style')
      if (!node.attributes.length) {
        const parent = node.parentNode
        while (node.firstChild) parent?.insertBefore(node.firstChild, node)
        node.remove()
      }
    })
    if (changed && saved?.an && saved.fn && selection && root.contains(saved.an) && root.contains(saved.fn)) {
      try {
        const range = document.createRange()
        range.setStart(saved.an, saved.ao)
        range.setEnd(saved.fn, saved.fo)
        selection.removeAllRanges()
        selection.addRange(range)
      } catch { /* node changed shape, keep default caret */ }
    }
  }

  function decorateLinks() {
    editorRef.current?.querySelectorAll('a:not([target])').forEach((anchor) => { anchor.setAttribute('target', '_blank'); anchor.setAttribute('rel', 'noreferrer') })
  }

  function format(command: string, value?: string) {
    focusEditor()
    document.execCommand(command, false, value)
    if (command === 'createLink') decorateLinks()
    rememberSelection()
    sync()
    updateActive()
  }

  function applyColor(property: 'foreColor' | 'hiliteColor', value: string | null) {
    focusEditor()
    document.execCommand('styleWithCSS', false, 'true')
    document.execCommand(property, false, value ?? SENTINEL_HEX)
    document.execCommand('styleWithCSS', false, 'false')
    cleanSentinels()
    rememberSelection()
    sync()
  }

  function toggleInlineCode() {
    focusEditor()
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return
    const existing = closestIn(selection.anchorNode, 'code', editorRef.current)
    if (existing && existing.parentElement?.tagName !== 'PRE') existing.replaceWith(...Array.from(existing.childNodes))
    else document.execCommand('insertHTML', false, `<code>${escapeHtml(selection.toString())}</code>`)
    rememberSelection()
    sync()
  }

  function runBlock(id: BlockId) {
    const root = editorRef.current
    if (!root) return
    const anchor = () => window.getSelection()?.anchorNode ?? null
    switch (id) {
      case 'text': document.execCommand('formatBlock', false, 'p'); break
      case 'h1': case 'h2': case 'h3': document.execCommand('formatBlock', false, id); break
      case 'quote': document.execCommand('formatBlock', false, 'blockquote'); break
      case 'code': document.execCommand('formatBlock', false, 'pre'); break
      case 'callout':
        document.execCommand('formatBlock', false, 'blockquote')
        closestIn(anchor(), 'blockquote', root)?.setAttribute('data-callout', 'true')
        break
      case 'bullet': {
        const list = closestIn(anchor(), 'ul', root)
        if (list?.hasAttribute('data-checklist')) list.removeAttribute('data-checklist')
        else document.execCommand('insertUnorderedList')
        break
      }
      case 'number': document.execCommand('insertOrderedList'); break
      case 'todo': {
        const list = closestIn(anchor(), 'ul', root)
        if (list && !list.hasAttribute('data-checklist')) list.setAttribute('data-checklist', 'true')
        else if (list) document.execCommand('insertUnorderedList')
        else {
          document.execCommand('insertUnorderedList')
          closestIn(anchor(), 'ul', root)?.setAttribute('data-checklist', 'true')
        }
        break
      }
      case 'divider': document.execCommand('insertHTML', false, '<hr><p><br></p>'); break
    }
  }

  function applyBlock(id: BlockId) {
    focusEditor()
    runBlock(id)
    rememberSelection()
    sync()
    updateActive()
  }

  function addInlineLink() {
    rememberSelection()
    if (selectionRef.current && !selectionRef.current.collapsed) {
      const anchor = closestIn(selectionRef.current.commonAncestorContainer, 'a', editorRef.current)
      setLinkUrl(anchor?.getAttribute('href') ?? '')
      setBubble((current) => ({ ...current, visible: true, linkMode: true }))
      return
    }
    const url = window.prompt('Paste a URL')
    if (!url) return
    focusEditor()
    document.execCommand('insertHTML', false, `<a href="${escapeHtml(normalizeUrl(url))}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a>`)
    rememberSelection()
    sync()
  }

  function applyLinkFromBubble() {
    const url = linkUrl.trim()
    setBubble((current) => ({ ...current, linkMode: false }))
    if (url) format('createLink', normalizeUrl(url))
    else focusEditor()
  }

  function removeLink() {
    setBubble((current) => ({ ...current, linkMode: false }))
    format('unlink')
  }

  /* ---------- slash menu */
  function closeSlash() {
    slashRef.current = null
    setSlash((current) => (current ? null : current))
  }

  function detectSlash() {
    const selection = window.getSelection()
    const root = editorRef.current
    if (!selection || !root || !selection.rangeCount || !selection.isCollapsed) { closeSlash(); return }
    const node = selection.anchorNode
    if (!node || node.nodeType !== 3 || !root.contains(node) || closestIn(node, 'pre', root)) { closeSlash(); return }
    const before = (node.textContent ?? '').slice(0, selection.anchorOffset)
    const match = /(?:^|\s)\/([^\s/]{0,20})$/.exec(before)
    if (!match || !blockMatches(match[1]).length) { closeSlash(); return }
    slashRef.current = { node: node as Text, start: before.length - match[1].length - 1 }
    const caret = selection.getRangeAt(0).cloneRange()
    caret.collapse(true)
    let rect: DOMRect | undefined = caret.getClientRects()[0]
    if (!rect || (!rect.height && !rect.width)) rect = (node.parentElement ?? root).getBoundingClientRect()
    const { top, bottom, left } = rect
    setSlash((current) => ({ query: match[1], index: current && current.query === match[1] ? current.index : 0, top, bottom, left }))
  }

  function pickSlash(id: BlockId) {
    const target = slashRef.current
    const root = editorRef.current
    setSlash(null)
    slashRef.current = null
    if (!target || !root) return
    const selection = window.getSelection()
    try {
      const end = selection && selection.anchorNode === target.node ? selection.anchorOffset : (target.node.textContent?.length ?? 0)
      const range = document.createRange()
      range.setStart(target.node, target.start)
      range.setEnd(target.node, end)
      range.deleteContents()
      if (!target.node.textContent && !target.node.previousSibling && !target.node.nextSibling) target.node.parentNode?.appendChild(document.createElement('br'))
      selection?.removeAllRanges()
      selection?.addRange(range)
    } catch { /* fall through and apply at the current caret */ }
    root.focus({ preventScroll: true })
    runBlock(id)
    rememberSelection()
    sync()
    updateActive()
  }

  /* ---------- Notion-style markdown shortcuts: "# ", "- ", "1. ", "[] ", "> ", "``` " */
  function tryMarkdownShortcut(event: KeyboardEvent<HTMLDivElement>) {
    const root = editorRef.current
    const selection = window.getSelection()
    if (event.key !== ' ' || !root || !selection || !selection.isCollapsed || !selection.rangeCount) return false
    const node = selection.anchorNode
    if (!node || node.nodeType !== 3) return false
    const previous = node.previousSibling
    if (previous && previous.nodeName !== 'BR') return false
    if (closestIn(node, 'li,pre', root)) return false
    const id = shortcutBlock((node.textContent ?? '').slice(0, selection.anchorOffset))
    if (!id) return false
    event.preventDefault()
    ;(node as Text).deleteData(0, selection.anchorOffset)
    if (!node.textContent && !node.previousSibling && !node.nextSibling) node.parentNode?.appendChild(document.createElement('br'))
    const range = document.createRange()
    range.setStart(node, 0)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
    runBlock(id)
    rememberSelection()
    sync()
    updateActive()
    return true
  }

  /* ---------- editor events */
  function handleInput(event: FormEvent<HTMLDivElement>) {
    const root = event.currentTarget
    cleanSentinels()
    if (!root.textContent && !root.querySelector('hr,table,img,li') && root.innerHTML) root.innerHTML = ''
    sync()
    rememberSelection()
    detectSlash()
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault()
    focusEditor()
    const clipboard = event.clipboardData
    const text = clipboard.getData('text/plain').trim()
    const selection = window.getSelection()
    if (/^https?:\/\/\S+$/i.test(text)) {
      if (selection && !selection.isCollapsed) { format('createLink', text); return }
      document.execCommand('insertHTML', false, `<a href="${escapeHtml(text)}" target="_blank" rel="noreferrer">${escapeHtml(text)}</a>`)
    } else {
      document.execCommand('insertHTML', false, normalizePastedHtml(clipboard.getData('text/html'), clipboard.getData('text/plain')))
    }
    rememberSelection()
    sync()
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.nativeEvent.isComposing) return
    if (slash) {
      const items = blockMatches(slash.query)
      if (event.key === 'ArrowDown') { event.preventDefault(); setSlash((current) => current && { ...current, index: (current.index + 1) % Math.max(items.length, 1) }); return }
      if (event.key === 'ArrowUp') { event.preventDefault(); setSlash((current) => current && { ...current, index: (current.index - 1 + items.length) % Math.max(items.length, 1) }); return }
      if (event.key === 'Enter' || event.key === 'Tab') { event.preventDefault(); const item = items[slash.index]; if (item) pickSlash(item.id); return }
      if (event.key === 'Escape') { event.preventDefault(); closeSlash(); return }
    }

    if (event.metaKey || event.ctrlKey) {
      const key = event.key.toLowerCase()
      if (key === 'b' || key === 'i' || key === 'u') { event.preventDefault(); format(key === 'u' ? 'underline' : key === 'b' ? 'bold' : 'italic'); return }
      if (key === 'k') { event.preventDefault(); addInlineLink(); return }
      if (key === 'e') { event.preventDefault(); toggleInlineCode(); return }
      if (key === 's') { event.preventDefault(); if (event.shiftKey) format('strikeThrough'); else void saveNow(); return }
      return
    }

    if (event.key === 'Tab') {
      const selection = window.getSelection()
      if (closestIn(selection?.anchorNode ?? null, 'li', editorRef.current)) { event.preventDefault(); format(event.shiftKey ? 'outdent' : 'indent') }
      return
    }

    if (tryMarkdownShortcut(event)) return

    if (event.key === 'Enter') {
      // A new checklist item must start unchecked, whatever the item above was.
      requestAnimationFrame(() => {
        const item = closestIn(window.getSelection()?.anchorNode ?? null, 'li', editorRef.current)
        if (item && item.parentElement?.hasAttribute('data-checklist') && item.getAttribute('data-checked') === 'true' && !item.textContent) { item.setAttribute('data-checked', 'false'); sync() }
      })
    }
  }

  function handleEditorMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
    const item = (event.target as HTMLElement).closest('li') as HTMLElement | null
    if (!item || !item.parentElement?.hasAttribute('data-checklist')) return
    const rect = item.getBoundingClientRect()
    if (event.clientX - rect.left > 30) return
    event.preventDefault()
    item.setAttribute('data-checked', item.getAttribute('data-checked') === 'true' ? 'false' : 'true')
    sync()
  }

  function handleEditorClick(event: ReactMouseEvent<HTMLDivElement>) {
    const anchor = (event.target as HTMLElement).closest('a')
    if (anchor && (event.metaKey || event.ctrlKey)) { event.preventDefault(); window.open((anchor as HTMLAnchorElement).href, '_blank', 'noopener') }
  }

  /* ---------- sidebar actions */
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
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const response = await fetch(`/api/sessions/${workspace.session.id}/links`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: form.get('url'), nickname: form.get('nickname'), category: form.get('category') }) })
    if (response.ok) { const data = await response.json(); setWorkspace((current) => ({ ...current, links: [...current.links, data.link] })); setLinkOpen(false); formElement.reset() }
  }

  async function deleteLink(id: string) {
    await fetch(`/api/sessions/${workspace.session.id}/links?id=${id}`, { method: 'DELETE' })
    setWorkspace((current) => ({ ...current, links: current.links.filter((item) => item.id !== id) }))
  }

  /* ---------- derived */
  const unit = workspace.session.activity?.unit
  const activity = workspace.session.activity?.activityType
  const plainPreview = (html: string) => plainText(html)
  const text = plainText(content)
  const words = text ? text.split(/\s+/).length : 0
  const readingMinutes = Math.max(1, Math.round(words / 200))
  const slashItems = slash ? blockMatches(slash.query) : []

  async function downloadPdf() {
    if (exporting) return
    setExporting(true); setExportProgress(2); setExportPhase('Getting your workspace ready'); setExportError('')
    try {
      if (saveStateRef.current !== 'saved') { setExportPhase('Saving the latest changes'); await saveNow() }
      setExportProgress(12); setExportPhase('Building a print-ready layout')
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
      const exportRoot = document.createElement('article')
      exportRoot.dataset.examOsPdfExport = 'true'
      // html2canvas can capture an opacity:0 source as a white canvas. Keep the
      // export fully laid out offscreen and make it visible only to the renderer.
      exportRoot.style.cssText = 'position:absolute;left:-10000px;top:0;z-index:-1;display:block;width:794px;min-height:1123px;padding:0 0 40px;overflow:visible;opacity:1;visibility:visible;pointer-events:none;color:#171717;background:#fff;color-scheme:light;font-family:Arial,sans-serif;font-size:11pt;line-height:1.55;'
      const resourceList = workspace.links.length ? `<h2 style="font-size:14pt;margin-top:20px">Resources</h2><ul>${workspace.links.map((link) => `<li><a href="${escapeHtml(link.url)}">${escapeHtml(link.nickname)}</a> <span style="color:#666">(${escapeHtml(link.category)})</span></li>`).join('')}</ul>` : ''
      const keywordList = workspace.keywords.length ? `<p style="margin-top:16px;color:#555"><strong>Keywords:</strong> ${workspace.keywords.map((item) => escapeHtml(item.keyword)).join(', ')}</p>` : ''
      exportRoot.innerHTML = `<style>
        * { box-sizing: border-box; }
        article, section, div, p, h1, h2, h3, h4, li, td, th, span, strong, em, a { color: #171717 !important; }
        h1, h2, h3, h4 { break-after: avoid; page-break-after: avoid; }
        p, ul, ol, blockquote, pre, table, img { break-inside: avoid; page-break-inside: avoid; }
        p { margin: 6px 0; }
        h1 { font-size: 24px; line-height: 1.2; margin: 8px 0; }
        h2 { font-size: 19px; line-height: 1.25; margin: 18px 0 7px; }
        h3 { font-size: 16px; line-height: 1.3; margin: 14px 0 5px; }
        ul, ol { padding-left: 25px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th, td { border: 1px solid #b8b8b8; padding: 6px 8px; text-align: left; vertical-align: top; }
        th { background: #f0f0f0; font-weight: 700; }
        pre { white-space: pre-wrap; background: #f3f3f3; border: 1px solid #ddd; padding: 10px; }
        a { text-decoration: underline; }
        img { max-width: 100%; }
      </style><div style="border-bottom:1px solid #cfcfcf;padding-bottom:12px;margin-bottom:18px"><img src="/logo_parama.png" alt="paramaa... padi da" style="width:92px;height:auto;vertical-align:middle;margin-right:8px"><span style="font-size:13px">paramaa... padi da · Workspace export</span><h1>${escapeHtml(title.trim() || 'Untitled workspace')}</h1><div style="font-size:13px">${escapeHtml(unit?.subject.name ?? 'Subject')} · ${escapeHtml(unit?.name ?? 'Unit')} · ${escapeHtml(labels[activity ?? ''] ?? 'Study session')} · ${new Date().toLocaleDateString('en-IN')}</div></div><section>${content || '<p>No notes yet.</p>'}${resourceList}${keywordList}</section>`
      document.body.appendChild(exportRoot)
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      if ('fonts' in document) await document.fonts.ready
      const images = Array.from(exportRoot.querySelectorAll('img'))
      await Promise.all(images.map(async (image) => { if (image.complete && image.naturalWidth > 0) return; await new Promise<void>((resolve) => { image.addEventListener('load', () => resolve(), { once: true }); image.addEventListener('error', () => resolve(), { once: true }) }) }))
      setExportProgress(26); setExportPhase('Rendering notes, tables, and equations')
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      const filename = [unit?.subject.name, unit?.name, title.trim() || 'Workspace', new Date().toISOString().slice(0, 10)].filter(Boolean).join('-').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') + '.pdf'
      const canvas = await html2canvas(exportRoot, { backgroundColor: '#ffffff', scale: Math.min(2, window.devicePixelRatio || 1.5), useCORS: true, allowTaint: false, logging: false, width: exportRoot.scrollWidth, height: exportRoot.scrollHeight, windowWidth: exportRoot.scrollWidth, windowHeight: exportRoot.scrollHeight, scrollX: 0, scrollY: 0, onclone: (clonedDocument) => {
        const clonedRoot = clonedDocument.querySelector('[data-exam-os-pdf-export]') as HTMLElement | null
        if (clonedRoot) { clonedRoot.style.opacity = '1'; clonedRoot.style.visibility = 'visible'; clonedRoot.style.left = '0'; clonedRoot.style.top = '0' }
      } })
      if (canvas.width === 0 || canvas.height === 0) throw new Error('The PDF canvas was empty.')
      pdf.setProperties({ title: title.trim() || 'paramaa... padi da workspace', subject: `${unit?.subject.name ?? 'Subject'} workspace` })
      const margin = 18
      const pageWidth = 210
      const pageHeight = 297
      const contentWidth = pageWidth - margin * 2
      const contentHeight = pageHeight - margin * 2
      const sliceHeight = Math.max(1, Math.floor(canvas.width * (contentHeight / contentWidth)))
      const pageCount = Math.ceil(canvas.height / sliceHeight)
      for (let offsetY = 0, page = 0; offsetY < canvas.height; offsetY += sliceHeight, page += 1) {
        setExportPhase(`Composing page ${page + 1} of ${pageCount}`)
        if (page > 0) pdf.addPage()
        const slice = document.createElement('canvas')
        slice.width = canvas.width
        slice.height = Math.min(sliceHeight, canvas.height - offsetY)
        const context = slice.getContext('2d')
        if (!context) throw new Error('The PDF canvas could not be read.')
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, slice.width, slice.height)
        context.drawImage(canvas, 0, offsetY, canvas.width, slice.height, 0, 0, slice.width, slice.height)
        pdf.addImage(slice.toDataURL('image/png'), 'PNG', margin, margin, contentWidth, (slice.height / slice.width) * contentWidth, undefined, 'FAST')
        setExportProgress(58 + Math.round(((page + 1) / pageCount) * 36))
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      }
      setExportProgress(98); setExportPhase('Finalizing your download')
      pdf.save(filename)
      setExportProgress(100); setExportPhase('Your PDF is ready')
      await new Promise((resolve) => setTimeout(resolve, 450))
    } catch (error) { setExportError(error instanceof Error ? error.message : 'The PDF could not be prepared.'); setExportPhase('We could not finish the PDF') }
    finally { document.querySelectorAll('article[data-exam-os-pdf-export]').forEach((node) => node.remove()); setExporting(false) }
  }

  return <main ref={rootRef} className={`relative mx-auto w-full bg-white px-4 py-5 text-slate-950 sm:px-6 lg:px-8 lg:py-8 ${wideMode ? 'max-w-[110rem]' : 'max-w-7xl'}`}>
    <style>{editorCss}</style>
    {external && <Image src="/logo_parama.png" alt="Paramaa" width={144} height={48} priority className="absolute right-6 top-6 z-40 h-auto w-28 sm:right-10 sm:top-9 sm:w-36" />}

    <div data-anim="top" className="mb-6 flex items-center justify-between gap-3">
      {!external ? <Link href={readOnly ? `/subjects/${unit?.subject.id}#unit-${unit?.id}` : `/planner/${workspace.session.scheduledDate}`} className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"><ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />{readOnly ? 'Back to subject' : 'Planner'}</Link> : <span />}
      <div className="flex items-center gap-3">
        {!external && <button type="button" onClick={toggleWide} className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95" title={wideMode ? 'Exit wide writing mode' : 'Expand writing space'}>{wideMode ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}{wideMode ? 'Exit wide view' : 'Wide view'}</button>}
        {!external && <Button size="sm" variant="outline" onClick={() => void downloadPdf()} disabled={exporting}><Download className="mr-1.5 h-4 w-4" />{exporting ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Preparing…</> : 'Download PDF'}</Button>}
        {external ? null : readOnly ? <span className="rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">Read-only shared workspace</span> : <><ShareSessionDialog sessionId={workspace.session.id} /><ExternalShareDialog sessionId={workspace.session.id} /><SaveIndicator state={saveState} /></>}
        {exportError && <span role="alert" className="text-xs text-destructive">{exportError}</span>}
      </div>
    </div>

    <header data-anim="header" className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {!external && <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><Link href={`/subjects/${unit?.subject.id}`} className="transition hover:text-foreground">{unit?.subject.name}</Link><span>/</span><Link href={`/units/${unit?.id}`} className="transition hover:text-foreground">Unit {unit?.unitNumber}</Link><span>/</span><span>{readOnly ? 'Shared material' : labels[activity ?? ''] ?? 'Study session'}</span></div>}
        <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{readOnly ? title : unit?.name ?? 'Session workspace'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{new Date(`${workspace.session.scheduledDate}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
        {readOnly && sharedBy && <p className="mt-2 text-sm text-muted-foreground">Shared by <span className="font-medium text-foreground">{sharedBy}</span></p>}
      </div>
    </header>

    <div className={`grid items-start gap-6 ${wideMode ? 'xl:grid-cols-1' : 'xl:grid-cols-[minmax(0,1fr)_19rem]'}`}>
      <div ref={cardRef} data-anim="card" className="min-w-0">
        <Card className="border-border/70 shadow-sm">
          <div ref={sentinelRef} className="h-px w-full" aria-hidden />
          {!readOnly && <div className={`sticky top-0 z-30 flex flex-wrap items-center gap-1 rounded-t-xl border-b bg-background/85 px-3 py-2 backdrop-blur-md transition-shadow duration-200 ${stuck ? 'shadow-md' : ''}`}>
            <ToolbarButton label="Undo (Ctrl+Z)" onClick={() => format('undo')}><Undo2 className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Redo (Ctrl+Shift+Z)" onClick={() => format('redo')}><Redo2 className="h-4 w-4" /></ToolbarButton>
            <span className="mx-1 h-5 w-px bg-border" />
            <select aria-label="Text style" value={blockType} onMouseDown={rememberSelection} onChange={(event) => format('formatBlock', event.target.value)} className="h-8 max-w-[8rem] rounded-md border-0 bg-transparent px-2 text-xs font-medium text-muted-foreground outline-none transition hover:bg-muted">
              {blockTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <span className="mx-1 h-5 w-px bg-border" />
            <ToolbarButton label="Bold (Ctrl+B)" active={active.bold} onClick={() => format('bold')}><Bold className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Italic (Ctrl+I)" active={active.italic} onClick={() => format('italic')}><Italic className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Underline (Ctrl+U)" active={active.underline} onClick={() => format('underline')}><Underline className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Strikethrough (Ctrl+Shift+S)" active={active.strike} onClick={() => format('strikeThrough')}><Strikethrough className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Inline code (Ctrl+E)" onClick={toggleInlineCode}><Code className="h-4 w-4" /></ToolbarButton>
            <span className="mx-1 h-5 w-px bg-border" />
            <ToolbarButton label="Bulleted list" active={active.list === 'ul'} onClick={() => applyBlock('bullet')}><List className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Numbered list" active={active.list === 'ol'} onClick={() => applyBlock('number')}><ListOrdered className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Checklist" active={active.list === 'todo'} onClick={() => applyBlock('todo')}><ListChecks className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="Add link (Ctrl+K)" onClick={addInlineLink}><Link2 className="h-4 w-4" /></ToolbarButton>
            <ColorMenu onText={(value) => applyColor('foreColor', value)} onHighlight={(value) => applyColor('hiliteColor', value)} />
            <span className="ml-auto hidden items-center gap-1 text-xs text-muted-foreground md:flex">Type <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">/</kbd> for blocks</span>
          </div>}
          {readOnly ? <div className={`border-b px-6 py-5 text-xl font-semibold sm:px-10 sm:text-2xl ${wideMode ? 'sm:px-16 xl:px-24' : ''}`}>{title}</div> : <Input value={title} onChange={(event) => { setTitle(event.target.value); setSaveState('unsaved') }} placeholder="Untitled note" aria-label="Note title" className={`h-auto rounded-none border-0 border-b px-6 py-5 text-xl font-semibold shadow-none focus-visible:ring-0 sm:text-2xl ${wideMode ? 'sm:px-16 xl:px-24' : 'sm:px-10'}`} />}
          <div ref={editorRef} contentEditable={!readOnly} suppressContentEditableWarning spellCheck={!readOnly} dir="ltr" role="textbox" aria-label="Session notes" aria-multiline="true" onKeyDown={readOnly ? undefined : handleEditorKeyDown} onKeyUp={readOnly ? undefined : rememberSelection} onMouseUp={readOnly ? undefined : rememberSelection} onMouseDown={readOnly ? undefined : handleEditorMouseDown} onClick={readOnly ? undefined : handleEditorClick} onPaste={readOnly ? undefined : handlePaste} onInput={readOnly ? undefined : handleInput} data-placeholder="Start writing, or press “/” for commands…" className={`session-editor min-h-[32rem] px-6 py-7 text-[0.98rem] leading-7 outline-none ${wideMode ? 'sm:px-16 xl:px-24' : 'sm:px-10'} sm:py-9`} />
          <div className={`flex items-center justify-between rounded-b-xl border-t bg-muted/10 px-6 py-3 text-xs text-muted-foreground ${wideMode ? 'sm:px-16 xl:px-24' : 'sm:px-10'}`}><span>{readOnly ? 'Viewing shared material' : 'Write freely. Changes save automatically.'}</span><span>{words} {words === 1 ? 'word' : 'words'} · {readingMinutes} min read</span></div>
        </Card>
      </div>

      <aside ref={asideRef} data-anim="side" className={`space-y-4 ${external || readOnly || wideMode ? 'hidden' : 'xl:sticky xl:top-6'}`}>
        {workspace.previous && <Card className="border-primary/20 bg-primary/[0.035] p-4 shadow-sm transition-shadow hover:shadow-md"><div className="flex items-center justify-between"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Continue</p><ChevronDown className="h-4 w-4 text-primary" /></div><Link href={`/sessions/${workspace.previous.session.id}`} className="group mt-3 block rounded-lg transition hover:bg-primary/5"><p className="truncate text-sm font-medium">{workspace.previous.note?.title || 'Previous session'}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{workspace.previous.note ? plainPreview(workspace.previous.note.content).slice(0, 140) : 'Open your previous notes'}</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">Open session <ExternalLink className="h-3 w-3 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span></Link></Card>}
        <details open className="rounded-xl border bg-card p-4 shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between font-semibold">Related sessions <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">{workspace.related?.length ?? 0}</span></summary><div className="mt-3 space-y-1">{workspace.related?.length ? workspace.related.map((item) => <Link key={item.session.id} href={`/sessions/${item.session.id}`} className="block rounded-lg px-2 py-2 transition hover:translate-x-0.5 hover:bg-muted"><span className="block text-xs font-medium">{labels[item.session.activity?.activityType ?? ''] ?? 'Study session'}</span><span className="mt-1 block truncate text-[11px] text-muted-foreground">{item.note?.title || item.session.scheduledDate}</span></Link>) : <p className="pt-3 text-xs text-muted-foreground">Your related sessions will appear here.</p>}</div></details>
        <Card className="p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Keywords</h2><Tag className="h-4 w-4 text-muted-foreground" /></div><div className="flex flex-wrap gap-2">{workspace.keywords.map((item) => <PopIn key={item.id} className="inline-flex"><button onClick={(event) => removeAnimated(event.currentTarget, () => deleteKeyword(item.id))} title="Remove keyword" className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary transition hover:bg-destructive/10 hover:text-destructive active:scale-95">{item.keyword} ×</button></PopIn>)}{!workspace.keywords.length && <span className="text-xs text-muted-foreground">No keywords yet</span>}</div><Input value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={addKeyword} placeholder="Add keyword · Enter" className="mt-3 h-9 text-xs" /></Card>
        <Card className="p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Links</h2><Link2 className="h-4 w-4 text-muted-foreground" /></div><div className="space-y-2">{workspace.links.map((link) => <PopIn key={link.id} className="group flex items-center gap-2"><a href={link.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm text-primary hover:underline" title={link.url}>{link.nickname}</a><span className="hidden text-[10px] text-muted-foreground sm:block">{link.category}</span><button onClick={(event) => removeAnimated(event.currentTarget, () => deleteLink(link.id))} aria-label={`Remove ${link.nickname}`} className="opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"><Trash2 className="h-3.5 w-3.5 text-muted-foreground transition hover:text-destructive" /></button></PopIn>)}{!workspace.links.length && !linkOpen && <p className="text-xs text-muted-foreground">Keep useful resources close.</p>}</div>{linkOpen ? <form ref={linkFormRef} onSubmit={addLink} className="-m-1 mt-3 space-y-2 overflow-hidden p-1"><Input name="nickname" placeholder="Name" required className="h-8 text-xs" /><Input name="url" type="url" placeholder="https://…" required className="h-8 text-xs" /><select name="category" defaultValue="Other" className="h-8 w-full rounded-md border bg-background px-2 text-xs">{categories.map((item) => <option key={item}>{item}</option>)}</select><div className="flex gap-2"><Button size="sm" type="submit">Save link</Button><Button size="sm" type="button" variant="ghost" onClick={() => setLinkOpen(false)}>Cancel</Button></div></form> : <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setLinkOpen(true)}><Plus className="mr-1 h-3.5 w-3.5" />Add link</Button>}</Card>
      </aside>
    </div>

    <div className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 xl:block">
      <div className={`origin-right transition-all duration-200 ${outlineOpen ? 'mb-2 scale-100 opacity-100' : 'pointer-events-none absolute right-0 top-0 scale-95 opacity-0'}`} aria-hidden={!outlineOpen}>
        <div className="w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border bg-card/95 p-3 shadow-xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">In this note</p><p className="mt-0.5 text-sm font-medium">Document outline</p></div>
            <button type="button" onClick={() => setOutlineOpen(false)} aria-label="Close document outline" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <nav aria-label="Document outline" className="max-h-[min(55vh,32rem)] space-y-0.5 overflow-y-auto pr-1">
            {outline.length ? outline.map((heading) => <button key={heading.id} type="button" onClick={() => jumpToHeading(heading.id)} className={`block w-full truncate rounded-md py-1.5 text-left text-xs transition-colors ${heading.level === 1 ? 'font-semibold' : heading.level === 2 ? 'pl-3' : 'pl-6'} ${activeHeading === heading.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{heading.text}</button>) : <p className="px-1 py-3 text-xs text-muted-foreground">Add headings to build an outline.</p>}
          </nav>
        </div>
      </div>
      <button type="button" onClick={() => setOutlineOpen((current) => !current)} aria-label={outlineOpen ? 'Close document outline' : 'Open document outline'} aria-expanded={outlineOpen} className="flex h-10 items-center gap-2 rounded-full border bg-card/95 px-3 text-xs font-medium text-muted-foreground shadow-lg backdrop-blur transition hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ListTree className="h-4 w-4" />{outline.length > 0 && <span>{outline.length}</span>}</button>
    </div>

    {/* Floating toolbar: follows the selection, so formatting never needs a trip to the top of the page */}
    <div ref={bubbleRef} style={{ left: bubble.x, top: bubble.y, opacity: 0, visibility: 'hidden' }} onMouseDown={(event) => { if (!(event.target instanceof HTMLInputElement)) event.preventDefault() }} className="fixed z-50 flex items-center gap-0.5 rounded-xl border bg-popover/95 p-1 text-popover-foreground shadow-xl backdrop-blur" role="toolbar" aria-label="Text formatting">
      {bubble.linkMode ? <div className="flex items-center gap-1 px-1">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        <input ref={linkInputRef} value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyLinkFromBubble() } if (event.key === 'Escape') { event.preventDefault(); setBubble((current) => ({ ...current, linkMode: false })); focusEditor() } }} placeholder="Paste or type a link, then Enter" aria-label="Link URL" className="h-8 w-60 bg-transparent px-1 text-sm outline-none" />
        <ToolbarButton label="Remove link" onClick={removeLink}><Unlink className="h-4 w-4" /></ToolbarButton>
      </div> : <>
        <ToolbarButton label="Bold (Ctrl+B)" active={active.bold} onClick={() => format('bold')}><Bold className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton label="Italic (Ctrl+I)" active={active.italic} onClick={() => format('italic')}><Italic className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton label="Underline (Ctrl+U)" active={active.underline} onClick={() => format('underline')}><Underline className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton label="Strikethrough (Ctrl+Shift+S)" active={active.strike} onClick={() => format('strikeThrough')}><Strikethrough className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton label="Inline code (Ctrl+E)" onClick={toggleInlineCode}><Code className="h-4 w-4" /></ToolbarButton>
        <span className="mx-0.5 h-5 w-px bg-border" />
        <ToolbarButton label="Add link (Ctrl+K)" onClick={addInlineLink}><Link2 className="h-4 w-4" /></ToolbarButton>
        <ColorMenu onText={(value) => applyColor('foreColor', value)} onHighlight={(value) => applyColor('hiliteColor', value)} />
      </>}
    </div>

    {exporting && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/35 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="pdf-export-title" aria-describedby="pdf-export-status">
      <div ref={exportDialogRef} className="w-full max-w-md overflow-hidden rounded-2xl border border-white/60 bg-background/95 p-6 shadow-2xl shadow-slate-950/20">
        <div className="mb-6 flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25"><FileText className="h-6 w-6" /></div>
          <div className="min-w-0"><h2 id="pdf-export-title" className="text-lg font-semibold tracking-tight">Creating your PDF</h2><p id="pdf-export-status" className="mt-1 text-sm text-muted-foreground">{exportPhase}</p></div>
          <span className="ml-auto shrink-0 text-2xl font-semibold tabular-nums tracking-tight text-primary">{exportProgress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div ref={exportFillRef} className="h-full rounded-full bg-gradient-to-r from-primary via-blue-500 to-cyan-400" style={{ width: 0 }} /></div>
        <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />Preserving tables, equations, spacing, and page breaks</div>
        {exportProgress === 100 && <div className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-600"><CircleCheck className="h-4 w-4" />Download started</div>}
      </div>
    </div>}

    {slash && slashItems.length > 0 && <SlashMenu items={slashItems} index={Math.min(slash.index, slashItems.length - 1)} top={slash.top} bottom={slash.bottom} left={slash.left} onPick={pickSlash} onHover={(index) => setSlash((current) => current && { ...current, index })} />}
  </main>
}
