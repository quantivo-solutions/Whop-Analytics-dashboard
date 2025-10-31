'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

/**
 * Client component to remove token from URL AFTER session cookie is confirmed working
 * This ensures the token stays in URL until cookie-based auth is actually ready
 */
export function TokenCleanup() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [cleaned, setCleaned] = useState(false)

  useEffect(() => {
    // Only run once
    if (cleaned) return

    const token = searchParams.get('token')
    
    // Only clean token if present
    if (token) {
      // Check if cookie is readable by making a test API call
      // Don't remove token until cookie is confirmed working
      const checkCookieAndClean = async () => {
        try {
          // Try to verify session via API (this reads the cookie)
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include', // Important for cookies
          })
          
          if (response.ok) {
            // Cookie is readable - safe to remove token
            console.log('[TokenCleanup] Cookie confirmed readable, removing token from URL')
            
            const params = new URLSearchParams(window.location.search)
            params.delete('token')
            
            const newSearch = params.toString()
            const newPath = newSearch 
              ? `${pathname}?${newSearch}`
              : pathname
            
            // Clean URL via router (without causing page reload)
            router.replace(newPath, { scroll: false })
            console.log('[TokenCleanup] Removed token from URL')
            setCleaned(true)
          } else {
            // Cookie not readable yet - keep token, retry later
            console.log('[TokenCleanup] Cookie not readable yet, keeping token. Retrying in 2s...')
            setTimeout(checkCookieAndClean, 2000)
          }
        } catch (error) {
          // API call failed - cookie might not be ready
          console.log('[TokenCleanup] Cookie check failed, keeping token. Retrying in 2s...')
          setTimeout(checkCookieAndClean, 2000)
        }
      }
      
      // Wait 3 seconds initially (more than loading page delay) before checking cookie
      const initialTimer = setTimeout(() => {
        checkCookieAndClean()
      }, 3000)
      
      return () => clearTimeout(initialTimer)
    }
  }, [searchParams, pathname, router, cleaned])

  return null // This component doesn't render anything
}

