'use client'

import { useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

/**
 * Client component to clean up URL query parameters after successful login
 * Removes loggedOut parameter and other temporary params to keep URL clean
 */
export function UrlCleanup() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if we need to clean up any parameters
    const loggedOut = searchParams.get('loggedOut')
    const token = searchParams.get('token')
    
    // If we have loggedOut=true, remove it (user has successfully logged in)
    // Also remove token param as it's only needed for initial iframe cookie setup
    if (loggedOut || token) {
      const params = new URLSearchParams(searchParams)
      
      // Remove temporary parameters
      if (loggedOut) params.delete('loggedOut')
      if (token) params.delete('token')
      
      // Only update URL if we removed something
      if (loggedOut || token) {
        const newSearch = params.toString()
        const newUrl = newSearch 
          ? `${pathname}?${newSearch}`
          : pathname
        
        // Replace URL without page reload (clean URL)
        router.replace(newUrl, { scroll: false })
        console.log('[UrlCleanup] Cleaned URL parameters, new URL:', newUrl)
      }
    }
  }, [searchParams, pathname, router])

  return null // This component doesn't render anything
}

