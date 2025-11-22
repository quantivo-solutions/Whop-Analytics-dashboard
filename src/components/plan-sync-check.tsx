'use client'

import { useEffect, useRef } from 'react'

/**
 * PlanSyncCheck Component
 * 
 * Detects plan changes from webhooks by checking timestamp changes.
 * Uses efficient polling (every 10 seconds) and visibility detection.
 * 
 * When a plan change is detected, automatically reloads the dashboard.
 */
export function PlanSyncCheck() {
  const lastTimestampRef = useRef<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isReloadingRef = useRef(false)
  
  const checkPlan = async (isInitialCheck = false, reason = '') => {
    // Prevent multiple reloads
    if (isReloadingRef.current) {
      return
    }
    
    try {
      // Use cache-busting URL
      const cacheBuster = Date.now()
      const url = `/api/plan/current?t=${cacheBuster}`
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        const planUpdatedAt = data.planUpdatedAt || null
        
        // On initial check, just store timestamp
        if (isInitialCheck) {
          lastTimestampRef.current = planUpdatedAt
          return
        }
        
        // Check for timestamp change (indicates DB update from webhook)
        // This is more reliable than plan value comparison
        if (planUpdatedAt && 
            lastTimestampRef.current && 
            lastTimestampRef.current !== planUpdatedAt) {
          console.log(`[PlanSyncCheck] 🔄 ${reason} - Plan updated! Timestamp changed: ${lastTimestampRef.current} → ${planUpdatedAt}`)
          isReloadingRef.current = true
          
          // Reload immediately
          window.location.reload()
          return
        }
        
        // Update timestamp
        if (planUpdatedAt) {
          lastTimestampRef.current = planUpdatedAt
        }
      }
    } catch (error) {
      // Silently fail - don't spam console
    }
  }
  
  useEffect(() => {
    // Initial check after page loads
    const initialTimeoutId = setTimeout(() => {
      checkPlan(true, 'initial')
    }, 2000)
    
    // Poll every 10 seconds (much less aggressive)
    intervalRef.current = setInterval(() => {
      checkPlan(false, 'poll')
    }, 10000)
    
    // Check when window becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkPlan(false, 'visibility')
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearTimeout(initialTimeoutId)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
  
  return null // No UI
}

