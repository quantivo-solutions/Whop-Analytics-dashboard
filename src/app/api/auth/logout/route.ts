/**
 * Logout Handler
 * Clears session cookie and redirects to login
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete('whop_session')
  
  return NextResponse.json({ success: true })
}

export async function GET() {
  const cookieStore = await cookies()
  cookieStore.delete('whop_session')
  
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
}

