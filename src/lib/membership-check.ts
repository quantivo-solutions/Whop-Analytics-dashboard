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
    const endpoints = [
      `/api/v5/users/${userId}/memberships`,
      `/api/v5/me/memberships`, // If using user token
      `/api/v2/memberships?user_id=${userId}`,
    ]
    
    let memberships: any[] = []
    let lastError: Error | null = null
    
    for (const endpoint of endpoints) {
      try {
        const url = endpoint.startsWith('http') 
          ? endpoint 
          : `https://api.whop.com${endpoint}`
        
        console.log('[Membership Check] Trying endpoint:', url)
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          cache: 'no-store',
        })
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => '')
          console.warn(`[Membership Check] Endpoint ${endpoint} failed:`, response.status, errorText.substring(0, 200))
          
          // If 401/403, try next endpoint
          if (response.status === 401 || response.status === 403) {
            lastError = new Error(`Unauthorized: ${response.status}`)
            continue
          }
          
          // If 404, try next endpoint
          if (response.status === 404) {
            lastError = new Error(`Not found: ${response.status}`)
            continue
          }
          
          throw new Error(`API error: ${response.status} ${errorText}`)
        }
        
        const data = await response.json()
        console.log('[Membership Check] Response structure:', {
          isArray: Array.isArray(data),
          hasData: !!data.data,
          keys: Object.keys(data),
        })
        
        // Handle different response formats
        if (Array.isArray(data)) {
          memberships = data
        } else if (Array.isArray(data.data)) {
          memberships = data.data
        } else if (data.memberships && Array.isArray(data.memberships)) {
          memberships = data.memberships
        } else {
          console.warn('[Membership Check] Unexpected response format:', Object.keys(data))
          continue
        }
        
        console.log(`[Membership Check] ✅ Found ${memberships.length} membership(s)`)
        break // Success, exit loop
      } catch (error) {
        console.warn(`[Membership Check] Error with endpoint ${endpoint}:`, error)
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
    const hasActivePro = memberships.some((m: any) => {
      // Check status - Whop uses various status values
      const status = m.status || m.state || m.membership_status || m.access_status
      const isActive = status === 'valid' || 
                      status === 'active' || 
                      status === 'trialing' ||
                      status === 'past_due' ||
                      status === 'paid'
      
      // Check product/plan match
      const productId = m.product?.id || 
                       m.access_pass?.id || 
                       m.product_id || 
                       m.plan?.id ||
                       m.plan_id
      
      const matchesPlan = !planId || productId === planId
      
      console.log('[Membership Check] Membership:', {
        id: m.id,
        status,
        productId,
        isActive,
        matchesPlan,
        planId,
      })
      
      return isActive && matchesPlan
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

