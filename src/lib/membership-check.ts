/**
 * Membership Status Check Utilities
 * 
 * Properly checks Whop API for active memberships to detect cancellations
 * Since we can't use memberships API (permissions issue), we check via:
 * 1. App memberships endpoint (if available)
 * 2. Check access to Pro product directly
 * 3. Fallback: Trust webhooks (but log warning)
 */

import { env } from './env'
import { whopSdk } from './whop-sdk'

export interface MembershipCheckResult {
  hasActivePro: boolean
  memberships: any[]
  error?: string
}

/**
 * Check if user has active Pro membership
 * Uses multiple strategies since memberships API requires special permissions
 */
export async function checkUserMembershipStatus(
  userId: string,
  accessToken?: string,
  companyId?: string
): Promise<MembershipCheckResult> {
  try {
    const token = accessToken || env.WHOP_APP_SERVER_KEY
    const planId = process.env.NEXT_PUBLIC_WHOP_PRO_PLAN_ID
    
    if (!token) {
      return {
        hasActivePro: false,
        memberships: [],
        error: 'No access token available',
      }
    }
    
    console.log('[Membership Check] Checking membership status for user:', userId)
    console.log('[Membership Check] Using plan ID:', planId)
    console.log('[Membership Check] Company ID:', companyId)
    
    // Strategy 1: Try endpoints that work with member:basic:read permission
    // We have: member:basic:read, member:stats:read, webhook_receive:memberships
    // Try app-scoped endpoints first (these might work with app server key)
    const endpoints = [
      // Try app memberships endpoint with plan filter (most specific)
      // This should work with member:basic:read permission
      planId ? `https://api.whop.com/api/v5/app/memberships?user_id=${userId}&plan_id=${planId}&status=active,valid,trialing` : null,
      // Try app memberships endpoint (all memberships for user in this app)
      `https://api.whop.com/api/v5/app/memberships?user_id=${userId}`,
      // Try checking access to specific plan/product (might work with member:basic:read)
      planId ? `https://api.whop.com/api/v5/users/${userId}/access/${planId}` : null,
      // Try company-scoped memberships (if we have companyId)
      companyId ? `https://api.whop.com/api/v5/companies/${companyId}/memberships?user_id=${userId}` : null,
      // Try v5 users endpoint (might work with member:basic:read)
      `https://api.whop.com/api/v5/users/${userId}/memberships`,
      // Try v2 API as fallback (will likely fail but worth trying)
      `https://api.whop.com/api/v2/memberships?user_id=${userId}`,
    ].filter(Boolean) as string[]
    
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
        // Also handle access check responses (single object, not array)
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
        } else if (data.hasAccess !== undefined || data.access !== undefined || data.valid !== undefined) {
          // This might be an access check response (single object)
          // Convert to membership-like object for processing
          const hasAccess = data.hasAccess || data.access || data.valid
          if (hasAccess) {
            memberships = [{
              id: data.id || 'access_check',
              status: 'valid',
              plan_id: planId,
              product_id: planId,
            }]
            console.log(`[Membership Check] ✅ Access check response: user has access`)
          } else {
            memberships = []
            console.log(`[Membership Check] ✅ Access check response: user does NOT have access`)
          }
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
    
    // Strategy 2: If no memberships found via API, try checking access via SDK
    // This is a fallback when API endpoints don't work
    if (memberships.length === 0 && companyId && planId) {
      console.log('[Membership Check] ⚠️ No memberships found via API, trying SDK access check...')
      try {
        // Try to check if user has access to Pro product via SDK
        // This might work even if memberships API doesn't
        const hasAccess = await checkAccessViaSDK(userId, companyId, planId, token)
        if (hasAccess !== null) {
          console.log('[Membership Check] ✅ SDK access check result:', hasAccess)
          return {
            hasActivePro: hasAccess,
            memberships: [],
          }
        }
      } catch (sdkError) {
        console.warn('[Membership Check] SDK access check failed:', sdkError)
      }
    }
    
    // CRITICAL: If API returned empty array successfully (200 OK), that's a valid "no memberships" response
    // But if API failed with errors, we can't trust the empty result - return error instead
    if (memberships.length === 0 && lastError) {
      const isPermissionError = lastError.message.includes('permissions') || 
                               lastError.message.includes('Unauthorized') ||
                               lastError.message.includes('401') ||
                               lastError.message.includes('403')
      
      if (isPermissionError) {
        console.warn('[Membership Check] ⚠️ API permission error - cannot verify membership status')
        console.warn('[Membership Check] ⚠️ Current permissions: member:basic:read, member:stats:read')
        console.warn('[Membership Check] ⚠️ These permissions should allow reading memberships, but API is rejecting')
        console.warn('[Membership Check] ⚠️ Returning error - caller should NOT downgrade when verification fails')
      } else {
        console.warn('[Membership Check] ⚠️ All API endpoints failed, cannot verify membership status')
        console.warn('[Membership Check] ⚠️ Error:', lastError.message)
      }
      
      // Return error so caller knows verification failed
      // Caller should NOT downgrade when verification fails - only when API confirms no membership
      return {
        hasActivePro: false, // Unknown - can't verify
        memberships: [],
        error: `Cannot verify: ${lastError.message}. Do not downgrade when verification fails.`,
      }
    }
    
    // If we got here with empty memberships but no error, API successfully confirmed no memberships
    // This is a valid "no membership" response - caller can downgrade
    if (memberships.length === 0) {
      console.log('[Membership Check] ✅ API successfully confirmed: user has no memberships')
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

/**
 * Check if user has access to Pro product via SDK or alternative method
 * This is a fallback when memberships API doesn't work
 */
async function checkAccessViaSDK(
  userId: string,
  companyId: string,
  planId: string,
  accessToken: string
): Promise<boolean | null> {
  try {
    // Try checking via app memberships with specific plan filter
    const url = `https://api.whop.com/api/v5/app/memberships?user_id=${userId}&plan_id=${planId}&status=active,valid,trialing`
    console.log('[Membership Check] Trying app memberships with plan filter:', url)
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    })
    
    if (response.ok) {
      const data = await response.json()
      const memberships = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
      const hasActive = memberships.length > 0 && memberships.some((m: any) => {
        const status = m.status || m.state || m.membership_status
        return status === 'active' || status === 'valid' || status === 'trialing'
      })
      console.log('[Membership Check] App memberships check result:', { count: memberships.length, hasActive })
      return hasActive
    }
    
    return null
  } catch (error) {
    console.warn('[Membership Check] SDK access check error:', error)
    return null
  }
}

