'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

/**
 * Client component to remove token from URL AFTER session is confirmed working
 * This ensures the token stays in URL until cookie-based auth is ready
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
      // Wait a moment to ensure cookie is readable, then remove token
      // The experience page should have already used the token for auth
      const timer = setTimeout(() => {
        const params = new URLSearchParams(window.location.search)
        params.delete('token')
        
        const newSearch = params.toString()
        const newPath = newSearch 
          ? `${pathname}?${newSearch}`
          : pathname
        
        // Clean URL via router
        try {
          router.replace(newPath, { scroll: false })
          console.log('[TokenCleanup] Removed token from URL after session confirmed')
        } catch (err) {
          console.warn('[TokenCleanup] Failed to remove token:', err)
        }
        
        setCleaned(true)
      }, 1000) // Wait 1 second after page load to ensure cookie is readable
      
      return () => clearTimeout(timer)
    }
  }, [searchParams, pathname, router, cleaned])

  return null // This component doesn't render anything
}

