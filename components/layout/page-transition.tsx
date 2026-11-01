'use client'

import { useLayoutEffect, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import gsap from 'gsap'

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/**
 * Animates page content in whenever the route changes.
 *
 * Use it from a Next.js template (templates remount on every navigation):
 *
 *   // app/(dashboard)/template.tsx
 *   import { PageTransition } from '@/components/layout/page-transition'
 *   export default function Template({ children }: { children: React.ReactNode }) {
 *     return <PageTransition>{children}</PageTransition>
 *   }
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // The pathname dependency makes the animation reliable even when Cache
    // Components reuses a template instead of remounting it.
    const page = el.firstElementChild instanceof HTMLElement ? el.firstElementChild : el
    const items = page === el ? el.children : page.children

    const ctx = gsap.context(() => {
      const tl = gsap.timeline()
      tl.fromTo(
        el,
        { autoAlpha: 0, y: 20 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.55,
          ease: 'power3.out',
          clearProps: 'all',
        },
      )
      tl.from(
        items,
        {
          autoAlpha: 0,
          y: 16,
          duration: 0.5,
          ease: 'power3.out',
          stagger: 0.06,
          clearProps: 'all',
        },
        0.06,
      )
    }, ref)

    return () => ctx.revert()
  }, [pathname])

  return <div ref={ref}>{children}</div>
}
