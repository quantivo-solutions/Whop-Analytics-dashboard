/**
 * Next.js Middleware
 * Handles authentication and route protection
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that don't require authentication
const publicRoutes = ['/login', '/auth/loading', '/api/auth/callback', '/api/auth/logout', '/api/auth/init', '/api/auth/refresh', '/api/auth/debug', '/discover', '/']

// API routes that should bypass auth
const publicApiRoutes = [
  '/api/webhooks/whop',
  '/api/ingest/whop',
  '/api/report/daily',
  '/api/report/weekly',
  '/api/settings', // Settings API used in Whop iframe
  '/api/auth/session', // Session creation API (used for auto-login)
  '/api/export', // CSV export (has its own auth)
  '/api/health',
  '/api/debug',
]

// Routes accessible from Whop iframe (no session required)
const whopIframeRoutes = ['/experiences', '/dashboard']

export function middleware(request: NextRequest) {
  // CRITICAL: Log EVERY request immediately to verify middleware is running
  const { pathname, searchParams } = request.nextUrl
  
  console.log('[Middleware] 🚀 Request received:', {
    pathname,
    method: request.method,
    timestamp: new Date().toISOString(),
    hasSessionCookie: !!request.cookies.get('whop_session'),
    hasWhopToken: !!request.headers.get('x-whop-user-token'),
    referer: request.headers.get('referer') || 'none',
    userAgent: request.headers.get('user-agent')?.substring(0, 50) || 'none',
  })
  
  try {
    // Allow public routes
    if (publicRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.next()
    }

    // Allow public API routes (with secret authentication)
    if (publicApiRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.next()
    }

    // Allow Whop iframe routes (they handle their own auth via companyId/experienceId)
    // CRITICAL: These routes can create installations, so they MUST be allowed
    if (whopIframeRoutes.some(route => pathname.startsWith(route))) {
      console.log('[Middleware] ✅ Allowing Whop iframe route:', pathname)
      return NextResponse.next()
    }

    // CRITICAL: Always allow root path (/) - but if referer is Whop dashboard/experience,
    // auto-redirect to the correct embedded route to avoid showing a generic installing page.
    if (pathname === '/') {
      const referer = request.headers.get('referer') || ''
      const isWhop = referer.includes('whop.com')
      if (isWhop) {
        // Try to extract companyId or experienceId from referer URL
        const bizMatch = referer.match(/\/dashboard\/(biz_[A-Za-z0-9]+)/)
        const expMatch = referer.match(/\/experiences\/(exp_[A-Za-z0-9]+)/)
        if (expMatch && expMatch[1]) {
          const url = new URL(`/experiences/${expMatch[1]}`, request.url)
          console.log('[Middleware] 🔁 Redirecting / -> experience via referer:', expMatch[1])
          return NextResponse.redirect(url)
        }
        if (bizMatch && bizMatch[1]) {
          const url = new URL(`/dashboard/${bizMatch[1]}`, request.url)
          console.log('[Middleware] 🔁 Redirecting / -> dashboard via referer:', bizMatch[1])
          return NextResponse.redirect(url)
        }
      }
      console.log('[Middleware] ✅ Allowing root path (validation or non-Whop access)')
      return NextResponse.next()
    }

    // Check for session cookie
    const sessionCookie = request.cookies.get('whop_session')
    
    if (!sessionCookie) {
      // Check if this looks like a Whop iframe request (has companyId or experienceId in URL)
      const hasWhopContext = searchParams.get('experienceId') || searchParams.get('companyId') || searchParams.get('company_id')
      
      if (hasWhopContext) {
        console.log('[Middleware] ✅ Allowing request with Whop context params')
        return NextResponse.next()
      }
      
      // No session and no Whop context, redirect to login
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    try {
      // Verify session is not expired
      const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString())
      
      if (sessionData.exp < Date.now()) {
        // Session expired, redirect to login
        const loginUrl = new URL('/login', request.url)
        const response = NextResponse.redirect(loginUrl)
        response.cookies.delete('whop_session')
        return response
      }
    } catch (error) {
      // Invalid session, redirect to login
      const loginUrl = new URL('/login', request.url)
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('whop_session')
      return response
    }

    return NextResponse.next()
  } catch (error) {
    // CRITICAL: Log the error but DON'T block the request
    // This ensures new installations aren't blocked by middleware errors
    console.error('[Middleware] ⚠️ Error (NOT blocking):', {
      pathname,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
    })
    
    // Continue to the page even if middleware fails
    // This is critical for new installations
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

