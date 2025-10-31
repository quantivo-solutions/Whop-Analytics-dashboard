'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

/**
 * Client component to clean up URL query parameters after successful login
 * Removes loggedOut parameter and other temporary params to keep URL clean
 * 
 * Works in iframe contexts by using both Next.js router and window.history
 * Also attempts to update parent frame URL if in iframe context
 */
export function UrlCleanup() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [cleaned, setCleaned] = useState(false)

  useEffect(() => {
    // Only run once
    if (cleaned) return

    // Check if we need to clean up any parameters
    // Note: loggedOut should not be in URL (we use sessionStorage now), but clean it up if present
    const loggedOut = searchParams.get('loggedOut')
    const token = searchParams.get('token')
    
    // IMPORTANT: Don't remove token immediately - it's needed for authentication
    // when cookies aren't readable yet in iframe context
    // Only remove loggedOut for now - token will be removed after session is confirmed
    
    // If we have loggedOut=true, remove it (user has successfully logged in)
    if (loggedOut) {
      // Clean the iframe URL
      const params = new URLSearchParams(window.location.search)
      
      // Remove loggedOut parameter only
      // Don't remove token - it's needed until cookie is confirmed working
      let shouldUpdate = false
      if (loggedOut) {
        params.delete('loggedOut')
        shouldUpdate = true
      }
      
      // Only update URL if we removed something
      if (shouldUpdate) {
        const newSearch = params.toString()
        const newPath = newSearch 
          ? `${pathname}?${newSearch}`
          : pathname
        
        // Method 1: Next.js router (for app router navigation)
        try {
          router.replace(newPath, { scroll: false })
          console.log('[UrlCleanup] Cleaned URL via router:', newPath)
        } catch (err) {
          console.warn('[UrlCleanup] Router replace failed:', err)
        }
        
        // Method 2: window.history.replaceState (for iframe compatibility)
        try {
          const newUrl = newSearch 
            ? `${window.location.pathname}?${newSearch}`
            : window.location.pathname
          
          window.history.replaceState(
            { ...window.history.state, as: newPath, url: newPath },
            '',
            newUrl
          )
          console.log('[UrlCleanup] Cleaned URL via window.history:', newUrl)
        } catch (err) {
          console.warn('[UrlCleanup] window.history.replaceState failed:', err)
        }

        // Method 3: Try to update parent frame URL if in iframe (for Whop compatibility)
        // This might fail due to cross-origin restrictions, but worth trying
        try {
          if (window.parent && window.parent !== window) {
            const parentUrl = new URL(window.parent.location.href)
            parentUrl.searchParams.delete('loggedOut')
            // Don't remove token from parent URL - let it stay until session is confirmed
            
            // Only update if we actually changed something
            if (parentUrl.search !== window.parent.location.search) {
              window.parent.history.replaceState(
                window.parent.history.state,
                '',
                parentUrl.toString()
              )
              console.log('[UrlCleanup] Updated parent frame URL:', parentUrl.toString())
            }
          }
        } catch (err) {
          // Expected to fail due to cross-origin restrictions, but doesn't hurt to try
          const message = err instanceof Error ? err.message : String(err)
          console.log('[UrlCleanup] Cannot update parent frame URL (cross-origin):', message)
        }

        setCleaned(true)
      }
    }
  }, [searchParams, pathname, router, cleaned])

  return null // This component doesn't render anything
}

