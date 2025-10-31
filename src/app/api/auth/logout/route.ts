/**
 * Logout Handler
 * Clears session cookie and redirects to login
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST() {
  const cookieStore = await cookies()
  // Delete cookie with same options it was created with (for iframe support)
  cookieStore.set('whop_session', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 0,
    path: '/',
  })
  
  console.log('[Logout] Session cookie deleted')
  return NextResponse.json({ success: true })
}

export async function GET() {
  const cookieStore = await cookies()
  // Delete cookie with same options it was created with (for iframe support)
  cookieStore.set('whop_session', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 0,
    path: '/',
  })
  
  console.log('[Logout] Session cookie deleted (GET)')
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
}

