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

    // CRITICAL: Always allow root path (/) - it handles its own validation
    // Whop validates the app URL during installation by loading it
    // We must NEVER block the root path, as it can break installation
    if (pathname === '/') {
      console.log('[Middleware] ✅ Allowing root path (always allowed for Whop validation)')
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

