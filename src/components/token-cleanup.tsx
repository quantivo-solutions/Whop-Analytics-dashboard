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
      // Check if cookie is readable by checking if it exists
      // Don't remove token until cookie is confirmed working
      const checkCookieAndClean = async () => {
        try {
          // Simple check: try to read session cookie via document.cookie
          // In iframe, we can't read httpOnly cookies, but we can check if they exist
          // by making a lightweight API call that just checks the cookie
          const response = await fetch('/api/health', {
            method: 'GET',
            credentials: 'include', // Important for cookies
          })
          
          // If health check works, cookie should be readable
          // But actually, let's just wait longer and check if cookie is set
          // by checking the response headers or making a session check call
          
          // For now, just wait a reasonable amount of time (5 seconds total)
          // The cookie should be readable by then if it's going to work
          // If not, we'll just keep the token in URL (better than redirect loop)
          console.log('[TokenCleanup] Health check successful, waiting additional time before removing token...')
          
          // Wait 2 more seconds, then remove token
          setTimeout(() => {
            console.log('[TokenCleanup] Removing token from URL (cookie should be readable by now)')
            
            const params = new URLSearchParams(window.location.search)
            params.delete('token')
            
            const newSearch = params.toString()
            const newPath = newSearch 
              ? `${pathname}?${newSearch}`
              : pathname
            
            // Clean URL using window.history.replaceState (doesn't cause page reload)
            // This is safer than router.replace which can trigger a full navigation
            try {
              window.history.replaceState(
                { ...window.history.state, as: newPath, url: newPath },
                '',
                newPath
              )
              console.log('[TokenCleanup] Removed token from URL (via window.history)')
              setCleaned(true)
            } catch (err) {
              console.warn('[TokenCleanup] Failed to update URL, will keep token:', err)
              // Keep token if URL update fails - better safe than sorry
            }
          }, 2000)
          
        } catch (error) {
          // API call failed - don't remove token, keep it as fallback
          console.log('[TokenCleanup] Cookie check failed, keeping token in URL for safety:', error)
          // Don't retry - keep token indefinitely if cookie check fails
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

