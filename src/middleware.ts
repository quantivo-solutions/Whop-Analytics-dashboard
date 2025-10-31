/**
 * Next.js Middleware
 * Handles authentication and route protection
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that don't require authentication
const publicRoutes = ['/login', '/auth/loading', '/api/auth/callback', '/api/auth/logout', '/api/auth/init', '/api/auth/debug', '/discover']

// API routes that should bypass auth
const publicApiRoutes = [
  '/api/webhooks/whop',
  '/api/ingest/whop',
  '/api/report/daily',
  '/api/report/weekly',
  '/api/settings', // Settings API used in Whop iframe
  '/api/health',
  '/api/debug',
]

// Routes accessible from Whop iframe (no session required)
const whopIframeRoutes = ['/experiences', '/dashboard']

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  
  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Allow public API routes (with secret authentication)
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Allow Whop iframe routes (they handle their own auth via companyId/experienceId)
  if (whopIframeRoutes.some(route => pathname.startsWith(route))) {
    console.log('[Middleware] Allowing Whop iframe route:', pathname)
    return NextResponse.next()
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get('whop_session')
  
  if (!sessionCookie) {
    // Check if this looks like a Whop iframe request (has companyId or experienceId in URL)
    const hasWhopContext = searchParams.get('experienceId') || searchParams.get('companyId') || searchParams.get('company_id')
    
    if (hasWhopContext) {
      console.log('[Middleware] Allowing request with Whop context params')
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

