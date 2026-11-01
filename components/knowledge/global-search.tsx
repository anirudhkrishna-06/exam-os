'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import gsap from 'gsap'
import {
  ArrowRight,
  FileText,
  Hash,
  Link2,
  LoaderCircle,
  Search,
  Tag,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'

type Result = {
  id: string
  type: string
  title: string
  preview: string
  meta: string
  href: string
}

function resultIcon(type: string) {
  if (type === 'Note') return <FileText className="size-4" />
  if (type === 'Resource') return <Link2 className="size-4" />
  if (type === 'Keyword') return <Hash className="size-4" />
  return <Tag className="size-4" />
}

function SearchResult({
  result,
  active,
  onSelect,
  index,
}: {
  result: Result
  active: boolean
  onSelect: () => void
  index: number
}) {
  return (
    <button
      id={`search-result-${index}`}
      type="button"
      role="option"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        'group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        active
          ? 'bg-primary/[0.1] shadow-sm ring-1 ring-primary/15'
          : 'hover:bg-foreground/[0.045]',
      )}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-transform duration-200',
          active
            ? 'border-primary/20 bg-primary text-primary-foreground'
            : 'border-border/60 bg-background/65 text-muted-foreground group-hover:scale-105 group-hover:text-foreground',
        )}
      >
        {resultIcon(result.type)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{result.title}</span>
          <span className="shrink-0 rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {result.type}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{result.preview}</span>
        <span className="mt-1 block truncate text-[11px] text-muted-foreground/75">{result.meta}</span>
      </span>
      <ArrowRight
        className={cn(
          'size-4 shrink-0 text-muted-foreground/50 transition-all duration-200',
          active && 'translate-x-0.5 text-primary',
        )}
      />
    </button>
  )
}

export function GlobalSearch() {
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? '')) return
      event.preventDefault()
      setOpen(true)
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const trimmed = query.trim()
    if (!trimmed) {
      const clear = window.setTimeout(() => {
        setResults([])
        setLoading(false)
      }, 0)
      return () => window.clearTimeout(clear)
    }

    setLoading(true) // eslint-disable-line react-hooks/set-state-in-effect
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Search request failed')
        const data = (await response.json()) as { results?: Result[] }
        setResults(data.results ?? [])
        setActiveIndex(0)
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setResults([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 180)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [open, query])

  useLayoutEffect(() => {
    if (!open || !panelRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const panel = panelRef.current
    const overlay = document.querySelector<HTMLElement>('.search-dialog-overlay')
    const ctx = gsap.context(() => {
      gsap.fromTo(
        panel,
        { autoAlpha: 0, y: -12, scaleX: 0.72, scaleY: 0.88 },
        {
          autoAlpha: 1,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          duration: 0.48,
          ease: 'expo.out',
          clearProps: 'transform',
        },
      )
      gsap.fromTo(
        panel.querySelectorAll('[data-search-element]'),
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 0.42, stagger: 0.045, ease: 'power3.out', clearProps: 'transform' },
      )
      if (overlay) {
        gsap.fromTo(
          overlay,
          { autoAlpha: 0, backdropFilter: 'blur(0px)' },
          { autoAlpha: 1, backdropFilter: 'blur(16px)', duration: 0.5, ease: 'power2.out' },
        )
      }
    }, panel)

    return () => ctx.revert()
  }, [open])

  useLayoutEffect(() => {
    const resultsPanel = resultsRef.current
    if (!resultsPanel || !query.trim() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    gsap.fromTo(
      resultsPanel,
      { autoAlpha: 0, y: -8, scaleY: 0.94, transformOrigin: 'top center' },
      { autoAlpha: 1, y: 0, scaleY: 1, duration: 0.32, ease: 'power3.out', clearProps: 'transform' },
    )
  }, [query, results.length, loading])

  function close() {
    setOpen(false)
    setQuery('')
    setResults([])
    setActiveIndex(0)
  }

  function selectResult(result: Result) {
    close()
    router.push(result.href)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (results.length ? (index + 1) % results.length : 0))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (results.length ? (index - 1 + results.length) % results.length : 0))
    }
    if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault()
      selectResult(results[activeIndex])
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search your knowledge"
        className="group flex h-9 w-full items-center gap-2 rounded-lg border bg-background px-3 text-sm text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <Search className="size-4 transition-transform duration-200 group-hover:scale-110" />
        <span>Search knowledge</span>
        <kbd className="ml-auto rounded-md border bg-muted/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
          ⌘ K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <DialogContent
          ref={panelRef}
          overlayClassName="search-dialog-overlay bg-background/45 backdrop-blur-md"
          className="top-[14vh] max-w-[min(680px,calc(100vw-2rem))] translate-y-0 gap-0 overflow-hidden rounded-full border-0 bg-transparent p-0 shadow-none data-[state=open]:animate-none data-[state=closed]:animate-none"
        >
          <DialogTitle className="sr-only">Search ExamOS knowledge</DialogTitle>
          <DialogDescription className="sr-only">
            Search notes, links, and keywords. Use the arrow keys to navigate results.
          </DialogDescription>

          <div
            data-search-element
            className="relative flex h-[68px] w-full items-center rounded-full border border-border/70 bg-card/85 px-5 text-foreground shadow-2xl shadow-black/15 ring-1 ring-primary/10 backdrop-blur-2xl"
          >
            <div className="flex w-full items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center text-primary">
                {loading ? <LoaderCircle className="size-5 animate-spin" /> : <Search className="size-5" />}
              </div>
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                role="combobox"
                aria-autocomplete="list"
                aria-controls="global-search-results"
                aria-expanded={results.length > 0}
                aria-activedescendant={results[activeIndex] ? `search-result-${activeIndex}` : undefined}
                placeholder="Search"
                className="h-12 min-w-0 flex-1 border-0 bg-transparent px-0 text-lg font-normal text-foreground shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/70"
              />
            </div>
          </div>

          {query.trim() && (
            <div
              ref={resultsRef}
              id="global-search-results"
              role="listbox"
              aria-label="Search suggestions"
              className="mt-3 max-h-[min(30rem,55vh)] overflow-y-auto rounded-3xl border border-white/20 bg-background/80 p-3 shadow-2xl backdrop-blur-2xl"
            >
              {loading && results.length === 0 ? (
                <div data-search-element className="flex items-center justify-center gap-2 px-6 py-8 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" />
                  Searching…
                </div>
              ) : results.length === 0 ? (
                <div data-search-element className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No results found
                </div>
              ) : (
                results.map((result, index) => (
                  <SearchResult
                    key={result.id}
                    result={result}
                    index={index}
                    active={index === activeIndex}
                    onSelect={() => selectResult(result)}
                  />
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
