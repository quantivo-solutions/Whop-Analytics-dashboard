'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * Client component to set session cookie via API route after Whop auto-login
 * Called when we have a session token from Whop iframe auth
 * Uses API route to set HttpOnly cookie (can't be set from client directly)
 */
export function SessionSetter({ sessionToken }: { sessionToken?: string }) {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || sessionToken
  const [isSet, setIsSet] = useState(false)

  useEffect(() => {
    if (token && !isSet) {
      // Set cookie via API route (HttpOnly cookies can't be set from client)
      fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: null, // Will be decoded from token
          userId: null,
          username: null,
          sessionToken: token, // Pass token directly
        }),
        credentials: 'include',
      })
        .then(response => {
          if (response.ok) {
            console.log('[SessionSetter] Session cookie set via API route')
            setIsSet(true)
          } else {
            console.error('[SessionSetter] Failed to set cookie via API:', response.status)
          }
        })
        .catch(error => {
          console.error('[SessionSetter] Error setting cookie:', error)
        })
    }
  }, [token, isSet])

  return null // This component doesn't render anything
}

