/**
 * Next.js Middleware
 * Handles authentication and route protection
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that don't require authentication
const publicRoutes = ['/login', '/api/auth/callback', '/api/auth/logout', '/discover']

// API routes that should bypass auth
const publicApiRoutes = [
  '/api/webhooks/whop',
  '/api/ingest/whop',
  '/api/report/daily',
  '/api/report/weekly',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Allow public API routes (with secret authentication)
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get('whop_session')
  
  if (!sessionCookie) {
    // Redirect to login if no session
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

