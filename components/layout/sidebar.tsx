'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import gsap from 'gsap'
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  Calendar,
  Clock,
  Settings,
  LogOut,
  BarChart3,
  FileText,
  Menu,
  X,
  ChevronLeft,
  Search,
  Share2,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { GlobalSearch } from '@/components/knowledge/global-search'

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */

type NavItem = { label: string; href: string; icon: LucideIcon }

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Workspace',
    items: [
      { label: 'Overview', href: '/overview', icon: LayoutDashboard },
      { label: 'Daily Planner', href: '/planner', icon: Clock },
      { label: 'Calendar', href: '/planner/calendar', icon: Calendar },
    ],
  },
  {
    title: 'Study',
    items: [
      { label: 'Subjects', href: '/subjects', icon: BookOpen },
      { label: 'Seasons', href: '/seasons', icon: CalendarDays },
      { label: 'Share Box', href: '/share-box', icon: Share2 },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Analytics', href: '/analytics', icon: BarChart3 },
      { label: 'Reports', href: '/reports', icon: FileText },
    ],
  },
  {
    title: 'System',
    items: [{ label: 'Settings', href: '/settings', icon: Settings }],
  },
]

const ALL_HREFS = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href))

const STORAGE_KEY = 'examos:sidebar-collapsed'
const WIDTH_EXPANDED = 264
const WIDTH_COLLAPSED = 76

// Longest matching href wins, so /planner/calendar does not also light up /planner.
function getActiveHref(pathname: string): string | null {
  let best: string | null = null
  for (const href of ALL_HREFS) {
    if (pathname === href || pathname.startsWith(href + '/')) {
      if (!best || href.length > best.length) best = href
    }
  }
  return best
}

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Scales a duration to zero when the user prefers reduced motion.
const t = (seconds: number) => (reducedMotion() ? 0 : seconds)

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

// Tooltip that only appears while the desktop sidebar is collapsed.
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <span
      role="tooltip"
      className={cn(
        'pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 translate-x-1',
        'whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-md',
        'opacity-0 transition-all duration-200',
        'group-data-[collapsed=true]/sidebar:block group-hover/item:translate-x-0 group-hover/item:opacity-100',
      )}
    >
      {children}
    </span>
  )
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem
  active: boolean
  onNavigate?: () => void
}) {
  const { label, href, icon: Icon } = item
  const iconRef = useRef<HTMLSpanElement>(null)

  const hover = (on: boolean) => {
    if (!iconRef.current) return
    gsap.to(iconRef.current, {
      scale: on ? 1.18 : 1,
      rotate: on ? -8 : 0,
      duration: t(on ? 0.35 : 0.3),
      ease: on ? 'back.out(2.4)' : 'power2.out',
      overwrite: 'auto',
    })
  }

  return (
    <div data-nav-item data-href={href} className="group/item relative z-10">
      <Link
        href={href}
        onClick={onNavigate}
        onMouseEnter={() => hover(true)}
        onMouseLeave={() => hover(false)}
        onFocus={() => hover(true)}
        onBlur={() => hover(false)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex h-10 items-center justify-start gap-3 overflow-hidden rounded-md pl-4 pr-3 text-sm font-medium outline-none',
          'transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring/60',
          active
            ? 'text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
        )}
      >
        <span ref={iconRef} className="flex size-5 shrink-0 items-center justify-center">
          <Icon className="size-[18px]" />
        </span>
        <span data-collapsible className="whitespace-nowrap">
          {label}
        </span>
      </Link>
      <Tip>{label}</Tip>
    </div>
  )
}

function NavList({
  activeHref,
  onNavigate,
  scroll = false,
}: {
  activeHref: string | null
  onNavigate?: () => void
  scroll?: boolean
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLDivElement>(null)
  const placed = useRef(false)

  // Entrance: staggered slide-in of the section headers and links.
  useIsoLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const ctx = gsap.context(() => {
      gsap.from('[data-nav-section]', {
        autoAlpha: 0,
        duration: t(0.5),
        stagger: t(0.1),
        delay: t(0.05),
      })
      gsap.from('[data-nav-item]', {
        autoAlpha: 0,
        x: -18,
        duration: t(0.6),
        stagger: t(0.045),
        delay: t(0.12),
        ease: 'power3.out',
        clearProps: 'transform',
      })
    }, root)
    return () => ctx.revert()
  }, [])

  // Sliding active indicator that glides between routes.
  useIsoLayoutEffect(() => {
    const root = rootRef.current
    const pill = pillRef.current
    if (!root || !pill) return

    const target = activeHref
      ? root.querySelector<HTMLElement>(`[data-href="${activeHref}"]`)
      : null

    if (!target) {
      gsap.to(pill, { autoAlpha: 0, duration: t(0.2) })
      return
    }

    const pos = { y: target.offsetTop, height: target.offsetHeight }

    if (!placed.current) {
      placed.current = true
      gsap.set(pill, { ...pos, autoAlpha: 1 })
      return
    }

    const from = gsap.getProperty(pill, 'y') as number
    const distance = Math.abs(pos.y - from)

    gsap.to(pill, {
      ...pos,
      autoAlpha: 1,
      duration: t(0.5 + Math.min(distance / 1200, 0.25)),
      ease: 'expo.out',
      overwrite: 'auto',
    })
    gsap.fromTo(
      pill,
      { scaleX: 0.94 },
      { scaleX: 1, duration: t(0.8), ease: 'elastic.out(1, 0.55)' },
    )
  }, [activeHref])

  return (
    <nav
      aria-label="Main"
      className={cn('sidebar-nav-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden px-3 py-4', scroll && 'overflow-y-auto')}
    >
      <div ref={rootRef} className="relative">
        <div
          ref={pillRef}
          aria-hidden
          className="pointer-events-none invisible absolute inset-x-0 top-0 z-0 rounded-md bg-primary opacity-0 shadow-lg shadow-primary/25"
        />
        {NAV_GROUPS.map((group, i) => (
          <div key={group.title} className={cn(i > 0 && 'mt-2')}>
            <div data-nav-section className="relative flex h-7 items-center pl-4 pr-3">
              <span
                data-collapsible
                className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70"
              >
                {group.title}
              </span>
              <span
                data-collapsed-only
                aria-hidden
                className="invisible absolute inset-x-4 top-1/2 h-px bg-border opacity-0"
              />
            </div>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={item.href === activeHref}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </nav>
  )
}

function UserFooter({
  userName,
  pending,
  onLogout,
}: {
  userName?: string | null
  pending: boolean
  onLogout: () => void
}) {
  return (
    <div className="shrink-0 border-t p-3">
      <div className="flex items-center gap-3 overflow-hidden py-2 pl-2.5 pr-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold ring-2 ring-primary/20">
        {userName?.[0]?.toUpperCase() ?? '?'}
      </div>
      <div
        data-collapsible
        className="w-40 shrink-0 whitespace-nowrap leading-tight"
      >
        <p className="truncate text-sm font-medium">{userName ?? 'User'}</p>
        <p className="text-[11px] text-muted-foreground">Signed in</p>
      </div>
    </div>
      <div className="group/item relative mt-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-full justify-start gap-3 overflow-hidden pl-4 pr-3 text-muted-foreground hover:text-destructive"
          onClick={onLogout}
          disabled={pending}
        >
          <span className="flex size-5 shrink-0 items-center justify-center">
            <LogOut className="size-[18px]" />
          </span>
          <span data-collapsible className="whitespace-nowrap">
            {pending ? 'Signing out…' : 'Sign out'}
          </span>
        </Button>
        <Tip>Sign out</Tip>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Sidebar                                                                   */
/* -------------------------------------------------------------------------- */

interface SidebarProps {
  userName?: string | null
}

export function Sidebar({ userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [collapsed, setCollapsed] = useState(false)
  const [ready, setReady] = useState(false)
  const [drawer, setDrawer] = useState<'closed' | 'open' | 'closing'>('closed')

  const asideRef = useRef<HTMLElement>(null)
  const chevronRef = useRef<HTMLSpanElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const applied = useRef(false)
  const lastPath = useRef(pathname)
  const drawerRef = useRef(drawer)

  const activeHref = getActiveHref(pathname)

  async function handleLogout() {
    startTransition(async () => {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    })
  }

  useEffect(() => {
    drawerRef.current = drawer
  }, [drawer])

  /* ---- persisted collapsed state (read before first paint) ---- */
  useIsoLayoutEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') setCollapsed(true)
    } catch {}
    setReady(true)
  }, [])

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {}
      return next
    })
  }, [])

  /* ---- expand / collapse choreography ---- */
  useIsoLayoutEffect(() => {
    const aside = asideRef.current
    if (!ready || !aside) return

    const labels = aside.querySelectorAll('[data-collapsible]')
    const collapsedOnly = aside.querySelectorAll('[data-collapsed-only]')
    const instant = !applied.current
    applied.current = true

    if (instant) {
      gsap.set(aside, { width: collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED })
      gsap.set(labels, { autoAlpha: collapsed ? 0 : 1 })
      gsap.set(collapsedOnly, { autoAlpha: collapsed ? 1 : 0 })
      gsap.set(chevronRef.current, { rotate: collapsed ? 180 : 0 })
      return
    }

    const tl = gsap.timeline({ defaults: { overwrite: 'auto' } })

    if (collapsed) {
      tl.to(aside, { width: WIDTH_COLLAPSED, duration: t(0.55), ease: 'power3.inOut' }, 0)
      tl.to(labels, { autoAlpha: 0, duration: t(0.3), ease: 'power1.in' }, 0)
      tl.to(collapsedOnly, { autoAlpha: 1, duration: t(0.25) }, t(0.3))
    } else {
      tl.to(collapsedOnly, { autoAlpha: 0, duration: t(0.15) }, 0)
      tl.to(aside, { width: WIDTH_EXPANDED, duration: t(0.55), ease: 'power3.inOut' }, 0)
      tl.to(labels, { autoAlpha: 1, duration: t(0.35), ease: 'power2.out' }, t(0.25))
    }
    tl.to(chevronRef.current, { rotate: collapsed ? 180 : 0, duration: t(0.5), ease: 'back.out(1.6)' }, 0)

    return () => {
      tl.kill()
    }
  }, [collapsed, ready])

  /* ---- keyboard: Ctrl/Cmd + B toggles the rail ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'b') return
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return
      e.preventDefault()
      toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  /* ---- mobile drawer ---- */
  const openDrawer = useCallback(() => {
    drawerRef.current = 'open'
    setDrawer('open')
  }, [])

  const closeDrawer = useCallback(() => {
    if (drawerRef.current !== 'open') return
    drawerRef.current = 'closing'
    setDrawer('closing')
    const panel = panelRef.current
    const backdrop = backdropRef.current
    if (!panel || !backdrop) {
      setDrawer('closed')
      return
    }
    gsap
      .timeline({ onComplete: () => setDrawer('closed') })
      .to(panel, { xPercent: -100, duration: t(0.35), ease: 'power3.in' }, 0)
      .to(backdrop, { autoAlpha: 0, duration: t(0.3) }, 0)
  }, [])

  useIsoLayoutEffect(() => {
    if (drawer !== 'open') return
    const panel = panelRef.current
    const backdrop = backdropRef.current
    if (!panel || !backdrop) return
    const tl = gsap.timeline()
    tl.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: t(0.3) }, 0)
    tl.fromTo(panel, { xPercent: -100 }, { xPercent: 0, duration: t(0.55), ease: 'expo.out' }, 0)
    return () => {
      tl.kill()
    }
  }, [drawer])

  useEffect(() => {
    if (drawer === 'closed') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeDrawer()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [drawer === 'closed']) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- route change: top progress bar + drawer close ---- */
  useEffect(() => {
    if (lastPath.current === pathname) return
    lastPath.current = pathname
    closeDrawer()

    const bar = progressRef.current
    if (!bar) return
    gsap.killTweensOf(bar)
    gsap
      .timeline()
      .set(bar, { autoAlpha: 1, scaleX: 0, transformOrigin: '0% 50%' })
      .to(bar, { scaleX: 0.7, duration: t(0.25), ease: 'power2.out' })
      .to(bar, { scaleX: 1, duration: t(0.3), ease: 'power2.inOut' })
      .to(bar, { autoAlpha: 0, duration: t(0.3) })
  }, [pathname, closeDrawer])

  return (
    <>
      {/* Route progress bar */}
      <div
        ref={progressRef}
        aria-hidden
        className="pointer-events-none invisible fixed inset-x-0 top-0 z-[70] h-0.5 origin-left bg-primary opacity-0"
      />

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-card p-4 md:hidden">
          <Link href="/overview" className="flex min-w-0 items-center" aria-label="paramaa... padi da home">
            <Image src="/logo_parama.png" alt="paramaa... padi da" width={710} height={302} priority className="h-8 w-auto max-w-[170px] object-contain dark:hidden" />
            <Image src="/dark_theme.png" alt="paramaa... padi da" width={766} height={326} priority className="hidden h-8 w-auto max-w-[170px] object-contain dark:block" />
          </Link>
        <Button
          variant="ghost"
          size="sm"
          className="p-1.5"
          onClick={drawer === 'open' ? closeDrawer : openDrawer}
          aria-label="Toggle navigation"
          aria-expanded={drawer === 'open'}
        >
          {drawer === 'open' ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </header>

      {/* Mobile drawer */}
      {drawer !== 'closed' && (
        <>
          <div
            ref={backdropRef}
            onClick={closeDrawer}
            className="fixed inset-x-0 bottom-0 top-[57px] z-40 bg-background/70 backdrop-blur-sm md:hidden"
          />
          <div
            ref={panelRef}
            className="fixed bottom-0 left-0 top-[57px] z-50 flex w-72 flex-col border-r bg-card shadow-2xl md:hidden"
          >
            <NavList activeHref={activeHref} onNavigate={closeDrawer} scroll />
            <UserFooter userName={userName} pending={isPending} onLogout={handleLogout} />
          </div>
        </>
      )}

      {/* Desktop sidebar */}
      <aside
        ref={asideRef}
        data-collapsed={collapsed}
        className="group/sidebar sticky top-0 z-30 hidden h-screen w-64 shrink-0 flex-col border-r bg-card md:flex"
      >
        {/* Ambient top glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-44"
          style={{
            backgroundImage:
              'linear-gradient(to bottom, color-mix(in oklab, hsl(var(--primary)) 9%, transparent), transparent)',
          }}
        />

        {/* Header */}
        <div className="relative flex h-[68px] shrink-0 items-center border-b px-3">
            <Link href="/overview" className="relative flex h-10 min-w-0 flex-1 items-center overflow-hidden pl-2" aria-label="paramaa... padi da home">
              <Image data-collapsible src="/logo_parama.png" alt="paramaa... padi da" width={710} height={302} priority className="h-11 w-auto max-w-[220px] object-contain dark:hidden" />
              <Image data-collapsible src="/dark_theme.png" alt="paramaa... padi da" width={766} height={326} priority className="hidden h-11 w-auto max-w-[220px] object-contain dark:block" />
              <Image data-collapsed-only src="/logo_collapsed.png" alt="paramaa... padi da" width={326} height={358} priority className="invisible absolute left-[26px] top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 object-contain opacity-0" />
            </Link>

          {/* Expand / hide handle sitting on the border */}
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-pressed={collapsed}
            title={collapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
            className="absolute -right-3 top-1/2 z-40 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm outline-none transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <span ref={chevronRef} className="flex">
              <ChevronLeft className="size-3.5" />
            </span>
          </button>
        </div>

        {/* Search (full field when open, icon when collapsed) */}
        <div className="relative shrink-0 overflow-hidden px-3 pt-3">
          <div data-collapsible className="w-[240px] overflow-hidden">
            <GlobalSearch />
          </div>
          <button
            type="button"
            data-collapsed-only
            onClick={toggle}
            aria-label="Expand sidebar to search"
            className="invisible absolute left-3 top-3 flex h-10 w-[52px] items-center justify-center rounded-full border bg-background/60 text-muted-foreground opacity-0 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <Search className="size-[13px]" />
          </button>
        </div>

        <NavList activeHref={activeHref} scroll />

        <UserFooter userName={userName} pending={isPending} onLogout={handleLogout} />
      </aside>
    </>
  )
}
