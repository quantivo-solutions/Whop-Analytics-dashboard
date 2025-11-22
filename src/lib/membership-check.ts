/**
 * Membership Status Check Utilities
 * 
 * Properly checks Whop API for active memberships to detect cancellations
 * Uses installation access tokens which have proper permissions
 */

import { env } from './env'

export interface MembershipCheckResult {
  hasActivePro: boolean
  memberships: any[]
  error?: string
}

/**
 * Check if user has active Pro membership
 * Uses installation access token for proper permissions
 */
export async function checkUserMembershipStatus(
  userId: string,
  accessToken?: string
): Promise<MembershipCheckResult> {
  try {
    // Use installation access token if available (has proper permissions)
    // Otherwise fall back to server key
    const token = accessToken || env.WHOP_APP_SERVER_KEY
    
    if (!token) {
      return {
        hasActivePro: false,
        memberships: [],
        error: 'No access token available',
      }
    }

    const planId = process.env.NEXT_PUBLIC_WHOP_PRO_PLAN_ID
    
    console.log('[Membership Check] Checking membership status for user:', userId)
    console.log('[Membership Check] Using plan ID:', planId)
    
    // Try multiple API endpoints and formats
    // CRITICAL: Use the correct endpoint based on Whop API docs
    const endpoints = [
      // Try v5 API first (most current)
      `https://api.whop.com/api/v5/users/${userId}/memberships`,
      // Try v2 API as fallback
      `https://api.whop.com/api/v2/memberships?user_id=${userId}`,
      // Try with status filter
      `https://api.whop.com/api/v2/memberships?user_id=${userId}&status=active,valid,trialing`,
    ]
    
    let memberships: any[] = []
    let lastError: Error | null = null
    
    for (const url of endpoints) {
      try {
        console.log('[Membership Check] 🔍 Trying endpoint:', url)
        console.log('[Membership Check] Using token:', token.substring(0, 20) + '...')
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        })
        
        const responseText = await response.text()
        console.log('[Membership Check] Response status:', response.status)
        console.log('[Membership Check] Response preview:', responseText.substring(0, 500))
        
        if (!response.ok) {
          console.warn(`[Membership Check] ❌ Endpoint failed:`, response.status, responseText.substring(0, 300))
          
          // If 401/403, try next endpoint
          if (response.status === 401 || response.status === 403) {
            lastError = new Error(`Unauthorized: ${response.status} - ${responseText.substring(0, 100)}`)
            continue
          }
          
          // If 404, try next endpoint
          if (response.status === 404) {
            lastError = new Error(`Not found: ${response.status}`)
            continue
          }
          
          // For other errors, try next endpoint
          lastError = new Error(`API error: ${response.status} ${responseText.substring(0, 100)}`)
          continue
        }
        
        let data: any
        try {
          data = JSON.parse(responseText)
        } catch (parseError) {
          console.error('[Membership Check] Failed to parse JSON:', parseError)
          lastError = new Error(`Invalid JSON response`)
          continue
        }
        
        console.log('[Membership Check] 📦 Response structure:', {
          isArray: Array.isArray(data),
          hasData: !!data.data,
          keys: Object.keys(data),
          dataType: typeof data,
        })
        
        // Handle different response formats
        if (Array.isArray(data)) {
          memberships = data
          console.log(`[Membership Check] ✅ Found ${memberships.length} membership(s) in array`)
        } else if (Array.isArray(data.data)) {
          memberships = data.data
          console.log(`[Membership Check] ✅ Found ${memberships.length} membership(s) in data array`)
        } else if (data.memberships && Array.isArray(data.memberships)) {
          memberships = data.memberships
          console.log(`[Membership Check] ✅ Found ${memberships.length} membership(s) in memberships array`)
        } else if (data.results && Array.isArray(data.results)) {
          memberships = data.results
          console.log(`[Membership Check] ✅ Found ${memberships.length} membership(s) in results array`)
        } else {
          console.warn('[Membership Check] ⚠️ Unexpected response format:', {
            keys: Object.keys(data),
            type: typeof data,
            preview: JSON.stringify(data).substring(0, 200),
          })
          // Don't continue - try next endpoint
          continue
        }
        
        if (memberships.length > 0) {
          console.log(`[Membership Check] ✅ Successfully retrieved ${memberships.length} membership(s)`)
          break // Success, exit loop
        }
      } catch (error) {
        console.error(`[Membership Check] ❌ Error with endpoint ${url}:`, error)
        lastError = error instanceof Error ? error : new Error(String(error))
        continue
      }
    }
    
    if (memberships.length === 0 && lastError) {
      return {
        hasActivePro: false,
        memberships: [],
        error: lastError.message,
      }
    }
    
    // Check for active Pro membership
    // Log ALL memberships for debugging
    console.log('[Membership Check] 📋 Analyzing', memberships.length, 'membership(s):')
    memberships.forEach((m: any, index: number) => {
      console.log(`[Membership Check] Membership ${index + 1}:`, {
        id: m.id,
        status: m.status || m.state || m.membership_status || m.access_status,
        productId: m.product?.id || m.access_pass?.id || m.product_id || m.plan?.id || m.plan_id,
        productName: m.product?.name || m.access_pass?.name,
        planId: m.plan?.id || m.plan_id,
        allKeys: Object.keys(m),
      })
    })
    
    const hasActivePro = memberships.some((m: any) => {
      // Check status - Whop uses various status values
      const status = m.status || m.state || m.membership_status || m.access_status || m.accessStatus
      
      // More comprehensive status check
      const isActive = status === 'valid' || 
                      status === 'active' || 
                      status === 'trialing' ||
                      status === 'past_due' ||
                      status === 'paid' ||
                      status === 'subscribed' ||
                      (typeof status === 'string' && status.toLowerCase().includes('active')) ||
                      (typeof status === 'string' && status.toLowerCase().includes('valid'))
      
      // Check product/plan match - try multiple fields
      const productId = m.product?.id || 
                       m.access_pass?.id || 
                       m.product_id || 
                       m.plan?.id ||
                       m.plan_id ||
                       m.accessPass?.id ||
                       m.accessPassId
      
      // If no planId configured, any active membership = Pro
      // If planId configured, must match
      const matchesPlan = !planId || productId === planId
      
      const isPro = isActive && matchesPlan
      
      console.log('[Membership Check] Membership analysis:', {
        id: m.id,
        status,
        productId,
        planId,
        isActive,
        matchesPlan,
        isPro,
      })
      
      return isPro
    })
    
    console.log('[Membership Check] Result:', {
      totalMemberships: memberships.length,
      hasActivePro,
      planId,
    })
    
    return {
      hasActivePro,
      memberships,
    }
  } catch (error) {
    console.error('[Membership Check] Fatal error:', error)
    return {
      hasActivePro: false,
      memberships: [],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

