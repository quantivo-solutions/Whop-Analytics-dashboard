'use client'

import { useEffect, useRef } from 'react'

/**
 * PlanSyncCheck Component
 * 
 * Lightweight plan change detection - only checks when:
 * 1. Page becomes visible (user switches back to tab)
 * 2. Window gains focus (user clicks back into window)
 * 
 * NO continuous polling - relies on webhooks to update plan,
 * and checks only when user returns to the page.
 */
export function PlanSyncCheck() {
  const lastTimestampRef = useRef<string | null>(null)
  const isCheckingRef = useRef(false)
  
  const checkPlan = async (reason = '') => {
    // Prevent concurrent checks
    if (isCheckingRef.current) {
      return
    }
    
    isCheckingRef.current = true
    
    try {
      const url = `/api/plan/current?t=${Date.now()}`
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })
      
      if (response.ok) {
        const data = await response.json()
        const planUpdatedAt = data.planUpdatedAt || null
        
        // Check for timestamp change (indicates DB update from webhook)
        if (planUpdatedAt && 
            lastTimestampRef.current && 
            lastTimestampRef.current !== planUpdatedAt) {
          console.log(`[PlanSyncCheck] 🔄 ${reason} - Plan updated! Reloading...`)
          window.location.reload()
          return
        }
        
        // Update timestamp
        if (planUpdatedAt) {
          lastTimestampRef.current = planUpdatedAt
        }
      }
    } catch (error) {
      // Silently fail
    } finally {
      isCheckingRef.current = false
    }
  }
  
  useEffect(() => {
    // Store initial timestamp after page loads
    const initialTimeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/plan/current?t=${Date.now()}`, {
          credentials: 'include',
          cache: 'no-store',
        })
        if (response.ok) {
          const data = await response.json()
          lastTimestampRef.current = data.planUpdatedAt || null
        }
      } catch (error) {
        // Ignore
      }
    }, 1000)
    
    // Check when window becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Small delay to ensure page is fully visible
        setTimeout(() => checkPlan('visibility'), 500)
      }
    }
    
    // Check when window gains focus
    const handleFocus = () => {
      setTimeout(() => checkPlan('focus'), 500)
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      clearTimeout(initialTimeoutId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])
  
  return null // No UI
}

