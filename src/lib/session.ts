/**
 * Session Management Utilities
 * Handle authentication and session validation
 */

import { cookies } from 'next/headers'

export interface Session {
  companyId: string
  userId: string
  exp: number
}

/**
 * Get current session from cookie
 */
export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('whop_session')
    
    if (!sessionCookie) {
      return null
    }

    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString())
    
    // Check if expired
    if (sessionData.exp < Date.now()) {
      return null
    }

    return sessionData
  } catch (error) {
    console.error('Failed to parse session:', error)
    return null
  }
}

/**
 * Require authentication - throws redirect if not authenticated
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession()
  
  if (!session) {
    throw new Error('UNAUTHORIZED')
  }

  return session
}

/**
 * Get company ID from session or return null
 */
export async function getCompanyId(): Promise<string | null> {
  const session = await getSession()
  return session?.companyId || null
}

