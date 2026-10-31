import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register', '/api/auth/login', '/api/auth/register']
const ONBOARDING_PATH = '/setup'
const DASHBOARD_PATHS = ['/overview', '/seasons', '/subjects', '/settings']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionToken = request.cookies.get('exam_os_session')?.value

  // Allow public assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Redirect authenticated users away from auth pages
  if (sessionToken && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/overview', request.url))
  }

  // Protect dashboard and setup routes
  const isProtected =
    pathname === ONBOARDING_PATH ||
    DASHBOARD_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/api/seasons') ||
    pathname.startsWith('/api/subjects') ||
    pathname.startsWith('/api/units') ||
    pathname.startsWith('/api/settings')

  if (isProtected && !sessionToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Root redirect
  if (pathname === '/') {
    if (sessionToken) {
      return NextResponse.redirect(new URL('/overview', request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

