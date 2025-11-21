'use client'

import { useEffect } from 'react'

/**
 * PlanSyncCheck Component
 * 
 * Automatically verifies and syncs plan status when dashboard loads.
 * This serves as a fallback if webhooks fail to update the plan.
 * 
 * Runs silently in the background - no UI shown unless there's an error.
 */
export function PlanSyncCheck() {
  useEffect(() => {
    // Only run on client side, and only once per mount
    const verifyPlan = async () => {
      try {
        console.log('[PlanSyncCheck] Verifying plan status...')
        const response = await fetch('/api/plan/verify', {
          method: 'POST',
          credentials: 'include',
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.synced) {
            console.log('[PlanSyncCheck] ✅ Plan was out of sync and has been updated:', data)
            // Reload page to reflect updated plan
            window.location.reload()
          } else {
            console.log('[PlanSyncCheck] ✅ Plan is in sync')
          }
        } else {
          console.warn('[PlanSyncCheck] Plan verification failed:', response.status)
        }
      } catch (error) {
        console.error('[PlanSyncCheck] Error verifying plan:', error)
        // Don't show error to user - this is a background sync
      }
    }
    
    // Verify plan after a short delay to ensure page is loaded
    const timeoutId = setTimeout(verifyPlan, 2000)
    
    return () => clearTimeout(timeoutId)
  }, [])
  
  return null // No UI
}

