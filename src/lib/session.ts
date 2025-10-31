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
    
    if (!sessionCookie || !sessionCookie.value) {
      console.log('[Session] No session cookie found')
      return null
    }

    // Validate cookie value before parsing
    if (sessionCookie.value.trim().length === 0) {
      console.warn('[Session] Session cookie is empty')
      return null
    }

    try {
      const decoded = Buffer.from(sessionCookie.value, 'base64').toString()
      if (!decoded || decoded.trim().length === 0) {
        console.warn('[Session] Decoded session is empty')
        return null
      }
      
      const sessionData = JSON.parse(decoded)
      
      // Check if expired
      if (sessionData.exp < Date.now()) {
        return null
      }

      console.log('[Session] Valid cookie auth for:', sessionData.companyId)
      return sessionData
    } catch (parseError) {
      console.error('[Session] Failed to parse session cookie:', parseError)
      console.error('[Session] Cookie value length:', sessionCookie.value.length)
      console.error('[Session] Cookie value preview:', sessionCookie.value.substring(0, 50))
      return null
    }
  } catch (error) {
    console.error('[Session] Failed to get session:', error)
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

