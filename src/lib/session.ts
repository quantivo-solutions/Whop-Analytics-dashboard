/**
 * Session Management Utilities
 * Handle authentication and session validation
 */

import { cookies } from 'next/headers'

export interface Session {
  companyId: string
  userId: string
  username?: string
  exp: number
}

/**
 * Get current session from cookie or token parameter
 * Supports both cookie-based auth (direct access) and token-based auth (iframe)
 */
export async function getSession(token?: string | null): Promise<Session | null> {
  try {
    // Try token first (for iframe contexts where cookies may be blocked)
    if (token) {
      try {
        const sessionData = JSON.parse(Buffer.from(token, 'base64').toString())
        if (sessionData.exp && sessionData.exp > Date.now()) {
          console.log('[Session] Valid token auth for:', sessionData.companyId)
          return sessionData
        }
      } catch (tokenError) {
        console.warn('[Session] Invalid token:', tokenError)
      }
    }

    // Fall back to cookie-based auth
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

    console.log('[Session] Valid cookie auth for:', sessionData.companyId)
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

