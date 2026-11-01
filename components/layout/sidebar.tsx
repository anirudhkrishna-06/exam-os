'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  Calendar,
  Clock,
  Settings,
  LogOut,
  GraduationCap,
  BarChart3,
  FileText,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlobalSearch } from '@/components/knowledge/global-search'

const NAV_ITEMS = [
  { label: 'Overview', href: '/overview', icon: LayoutDashboard },
  { label: 'Daily Planner', href: '/planner', icon: Clock },
  { label: 'Calendar', href: '/planner/calendar', icon: Calendar },
  { label: 'Subjects', href: '/subjects', icon: BookOpen },
  { label: 'Seasons', href: '/seasons', icon: CalendarDays },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Reports', href: '/reports', icon: FileText },
  { label: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
  userName?: string | null
}

export function Sidebar({ userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    startTransition(async () => {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    })
  }

  const NavLinks = () => (
    <nav className="flex-1 py-4 px-3 space-y-1">
      {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
        const isActive = pathname === href || (href !== '/overview' && pathname.startsWith(href + '/'))
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between p-4 border-b bg-card sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <span className="font-bold text-base">ExamOS</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="p-1.5"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      {/* Mobile Navigation Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed top-[57px] bottom-0 left-0 w-64 bg-card border-r z-50 flex flex-col">
          <NavLinks />
          <div className="border-t p-3">
            <div className="flex items-center gap-3 px-3 py-2 mb-1">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                {userName?.[0]?.toUpperCase() ?? '?'}
              </div>
              <span className="text-sm font-medium truncate">{userName ?? 'User'}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
              disabled={isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isPending ? 'Signing out…' : 'Sign out'}
            </Button>
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r bg-card h-screen sticky top-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 border-b">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">ExamOS</span>
        </div>

        {/* Navigation */}
        <div className="px-3 pt-3"><GlobalSearch /></div>
        <NavLinks />

        {/* User / logout */}
        <div className="border-t p-3">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
              {userName?.[0]?.toUpperCase() ?? '?'}
            </div>
            <span className="text-sm font-medium truncate">{userName ?? 'User'}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
            disabled={isPending}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isPending ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>
      </aside>
    </>
  )
}
