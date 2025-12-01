'use client'

/**
 * Bootstrap Auto-Refresh Component
 * Automatically refreshes the dashboard while bootstrap is running
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface BootstrapRefreshProps {
  companyId: string
}

export function BootstrapRefresh({ companyId }: BootstrapRefreshProps) {
  const router = useRouter()

  useEffect(() => {
    console.log('[BootstrapRefresh] Starting auto-refresh loop for company:', companyId)
    
    // Refresh every 5 seconds while on the page
    // The server-side check will determine if bootstrap is still running
    const interval = setInterval(() => {
      console.log('[BootstrapRefresh] Refreshing page to check bootstrap status...')
      router.refresh()
    }, 5000) // Refresh every 5 seconds

    return () => {
      clearInterval(interval)
      console.log('[BootstrapRefresh] Stopped auto-refresh loop')
    }
  }, [companyId, router])

  return null
}

