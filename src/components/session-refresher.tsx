'use client'

import { useEffect } from 'react'

interface SessionRefresherProps {
  companyId: string
  userId?: string | null
  username?: string | null
}

/**
 * Client component that refreshes the session cookie
 * Called when installation exists but cookie isn't accessible
 */
export function SessionRefresher({ companyId, userId, username }: SessionRefresherProps) {
  useEffect(() => {
    // Call API route to refresh session cookie
    async function refreshSession() {
      try {
        const response = await fetch(`/api/auth/refresh?companyId=${encodeURIComponent(companyId)}`, {
          method: 'POST',
          credentials: 'include',
        })
        
        if (response.ok) {
          console.log('[SessionRefresher] Session cookie refreshed successfully')
        } else {
          console.warn('[SessionRefresher] Failed to refresh session cookie')
        }
      } catch (error) {
        console.error('[SessionRefresher] Error refreshing session:', error)
      }
    }

    refreshSession()
  }, [companyId, userId, username])

  return null // This component doesn't render anything
}

