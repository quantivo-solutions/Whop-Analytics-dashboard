'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * Client component to set session cookie after Whop auto-login
 * Called when we have a session token from Whop iframe auth
 */
export function SessionSetter({ sessionToken }: { sessionToken?: string }) {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || sessionToken

  useEffect(() => {
    if (token) {
      // Set cookie on client side
      try {
        document.cookie = `whop_session=${token}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=None; Secure`
        console.log('[SessionSetter] Session cookie set on client side')
      } catch (error) {
        console.error('[SessionSetter] Failed to set cookie:', error)
      }
    }
  }, [token])

  return null // This component doesn't render anything
}

