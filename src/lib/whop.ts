import { prisma } from './prisma'
import { WhopServerSdk } from '@whop/api'
import { whopGET, whopGETWithVersionFallback } from './whop-rest'
import { getWhopToken } from './whop-installation'

/**
 * Whop API Client
 * Now using official Whop SDK instead of manual fetch calls
 * 
 * NOTE: Ensure your Whop app has read scopes for payments & memberships:
 * - payment:basic:read
 * - member:basic:read (and others if needed)
 * See docs: https://docs.whop.com/api-reference/payments/list-payments and https://docs.whop.com/apps/permissions
 */

export interface WhopDailySummary {
  grossRevenue: number
  activeMembers: number
  newMembers: number
  cancellations: number
  trialsStarted: number
  trialsPaid: number
}

/**
 * Type alias for daily summary (preferred for external use)
 */
export type DailySummary = {
  grossRevenue: number
  activeMembers: number
  newMembers: number
  cancellations: number
  trialsStarted: number
  trialsPaid: number
}

/**
 * Date utility: Get start of UTC day (00:00:00Z)
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns ISO string at start of day (00:00:00.000Z)
 */
export function startOfUtcDay(dateStr: string): string {
  return `${dateStr}T00:00:00.000Z`
}

/**
 * Date utility: Get end of UTC day (23:59:59Z)
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns ISO string at end of day (23:59:59.999Z)
 */
export function endOfUtcDay(dateStr: string): string {
  return `${dateStr}T23:59:59.999Z`
}

/**
 * Create a Whop SDK instance with a specific API key
 * @param apiKey - The Whop API key
 * @returns Configured Whop SDK instance
 */
function createWhopClient(apiKey: string) {
  return WhopServerSdk({
    appId: process.env.NEXT_PUBLIC_WHOP_APP_ID ?? "app_placeholder",
    appApiKey: apiKey,
  })
}

/**
 * Validate a Whop API key by testing it against the Whop API
 * Makes a real API call to verify the key works
 * @param apiKey - The Whop API key to validate
 * @returns true if the key is valid, false otherwise
 */
export async function validateWhopKey(apiKey: string): Promise<boolean> {
  try {
    // Basic validation - just check if key exists and has reasonable length
    if (!apiKey || apiKey.trim().length < 10) {
      console.warn('Invalid Whop API key: too short or empty')
      return false
    }
    
    console.log('🔍 Validating Whop API key with real API call...')
    
    // Make a real API call to validate the key
    // Using /company endpoint which accepts API keys
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch('https://api.whop.com/api/v5/company', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        console.log('✅ Whop API key validated successfully')
        return true
      }

      const errorText = await response.text().catch(() => 'No error body')
      console.warn(`❌ Whop API key validation failed: ${response.status} ${response.statusText}`)
      console.warn(`Response: ${errorText}`)
      return false
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.warn('❌ Whop API key validation timed out')
        return false
      }
      
      console.warn('❌ Error validating Whop API key:', fetchError)
      return false
    }
  } catch (error) {
    console.warn('Whop API key validation failed:', error)
    return false
  }
}

// getWhopToken is now imported from './whop-installation'

/**
 * Get an authenticated Whop SDK client
 * @returns Whop SDK client or null if no token available
 */
export async function getWhopClient() {
  const token = await getWhopToken()
  
  if (!token) {
    console.error('No Whop token available')
    return null
  }
  
  return createWhopClient(token)
}

/**
 * Fetch daily summary metrics from Whop using REST API
 * 
 * This function orchestrates multiple API calls to gather all metrics for a specific day:
 * - Revenue from payments
 * - New memberships created
 * - Memberships canceled
 * - Active member count (with fallback to calculation)
 * 
 * @param dateStr - Date string in YYYY-MM-DD format (required)
 * @param accessToken - The access token to use for Whop API calls
 * @returns Complete daily metrics summary
 * 
 * @example
 * const summary = await fetchDailySummary('2025-10-24', 'whop_access_token')
 * console.log(`Revenue: $${summary.grossRevenue}, Active: ${summary.activeMembers}`)
 */
/**
 * TASK 7 - Add assertions & logs in data layer
 * INTEGRITY: companyId must always be provided
 */
export async function fetchDailySummary(dateStr: string, accessToken: string, companyId: string): Promise<DailySummary> {
  // INTEGRITY: Runtime assert - companyId and token must be provided
  if (!companyId) {
    throw new Error('[Whoplytics] Missing companyId parameter in fetchDailySummary')
  }
  if (!accessToken) {
    throw new Error('[Whoplytics] Missing accessToken parameter in fetchDailySummary')
  }
  
  console.log('[Whoplytics] fetch', { path: 'daily-summary', companyId, dateStr })
  console.log(`[Whoplytics] 📊 Fetching complete daily summary for ${dateStr} (company: ${companyId})...`)
  
  // Fetch revenue with error handling
  const grossRevenue = await sumPaidRevenueForDay(dateStr, accessToken, companyId).catch(() => 0)

  // Fetch new memberships and cancellations with error handling
  const newMembersArr = await listMembershipsForDay(dateStr, accessToken, companyId).catch(() => [])
  const cancelsArr = await listCancellationsForDay(dateStr, accessToken, companyId).catch(() => [])

  const newMembers = newMembersArr.length || 0
  const cancellations = cancelsArr.length || 0

  // Active snapshot (try API-based, else rolling calculation)
  let activeMembers = 0
  try {
    activeMembers = await countActiveAtEndOfDay(dateStr, accessToken, companyId)
  } catch (error) {
    console.log('  Using rolling calculation fallback for active members...')
    
    // Rolling fallback: get previous day from DB and compute
    // INTEGRITY: Must filter by companyId for multi-tenant isolation
    if (!companyId) {
      throw new Error('[Whoplytics] Missing companyId for rolling calculation fallback')
    }
    
    const yesterday = new Date(dateStr)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayDate = new Date(yesterday.toISOString().split('T')[0])
    
    const prev = await prisma.metricsDaily.findFirst({
      where: { 
        companyId, // INTEGRITY: Always filter by companyId
        date: yesterdayDate 
      },
      orderBy: { date: 'desc' },
    })
    
    const prevActive = prev?.activeMembers ?? 0
    activeMembers = Math.max(0, prevActive + newMembers - cancellations)
    
    console.log(`  Calculated active: ${prevActive} + ${newMembers} - ${cancellations} = ${activeMembers}`)
  }

  // Trials (set 0 for now; add real mapping later)
  const trialsStarted = 0
  const trialsPaid = 0

  // If absolutely no live data, log it (but still return the structure)
  if (!grossRevenue && !newMembers && !cancellations) {
    console.log('⚠️  No live Whop data found for', dateStr)
  }

  const summary = {
    grossRevenue,
    activeMembers,
    newMembers,
    cancellations,
    trialsStarted,
    trialsPaid,
  }
  
  console.log(`✅ Daily summary for ${dateStr}:`, JSON.stringify(summary, null, 2))
  
  return summary
}

/**
 * Generate zero values for all metrics
 * Used when no Whop data is available for a given date
 * @returns Zero metrics
 */
function generateZeroData(): WhopDailySummary {
  return {
    grossRevenue: 0,
    activeMembers: 0,
    newMembers: 0,
    cancellations: 0,
    trialsStarted: 0,
    trialsPaid: 0,
  }
}

/**
 * Check if Whop account is connected
 * @returns true if a Whop account is connected
 */
export async function isWhopConnected(): Promise<boolean> {
  const token = await getWhopToken()
  return token !== null
}

/**
 * Test Whop API connection by validating the stored token
 * @returns true if connection is successful and token is valid
 */
export async function testWhopConnection(): Promise<boolean> {
  try {
    const token = await getWhopToken()
    
    if (!token) {
      console.warn('No Whop token available for connection test')
      return false
    }

    // Validate the token format and client creation
    return await validateWhopKey(token)
  } catch (error) {
    console.warn('Error testing Whop connection:', error)
    return false
  }
}

/**
 * Sum paid revenue for a specific day using Whop REST API
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param accessToken - The access token to use for Whop API calls
 * @returns Total revenue for the day (in dollars)
 *
 * @example
 * const revenue = await sumPaidRevenueForDay('2025-10-24', 'whop_access_token')
 * console.log(`Revenue: $${revenue.toFixed(2)}`)
 */
export async function sumPaidRevenueForDay(dateStr: string, accessToken: string, companyId: string): Promise<number> {
  try {
    console.log(`[Whoplytics] 💰 Calculating paid revenue for ${dateStr} (company: ${companyId})...`)
    
    const startTime = startOfUtcDay(dateStr)
    const endTime = endOfUtcDay(dateStr)
    
    let totalRevenue = 0
    let page = 1
    let hasMorePages = true
    const limit = 100
    
    while (hasMorePages) {
      console.log(`[Whoplytics]   Fetching page ${page} of payments...`)
      
      // Fetch payments using app-scoped endpoint (works with installation access token)
      // App-scoped endpoints have proper permissions for company apps
      const response = await whopGET<{ 
        data?: any[]
        pagination?: { 
          current_page?: number
          total_pages?: number
          next?: string | null
        }
      }>('/app/payments', {
        status: 'paid',
        created_after: startTime,
        created_before: endTime,
        company_id: companyId, // Filter by company_id
        limit,
        page,
      }, accessToken)
      
      const payments = response.data || []
      console.log(`[Whoplytics]   Found ${payments.length} payments on page ${page}`)
      
      // Sum up revenue from this page
      // Filter by companyId if payment has company_id field (additional safety check)
      for (const payment of payments) {
        // Additional safety: verify payment belongs to this company if company_id field exists
        const paymentCompanyId = payment.company_id || payment.companyId || payment.company?.id
        if (paymentCompanyId && paymentCompanyId !== companyId) {
          console.warn(`[Whoplytics]   ⚠️  Payment ${payment.id} belongs to different company ${paymentCompanyId}, skipping`)
          continue
        }
        
        // Try to find the revenue field (could be 'amount', 'final_amount', 'total', etc.)
        let amount = 0
        
        // Check multiple possible fields and formats
        if (typeof payment.final_amount === 'number') {
          // Whop typically uses cents, convert to dollars
          amount = payment.final_amount / 100
        } else if (typeof payment.amount === 'number') {
          // Check if already in dollars (if > 1000, likely cents; if < 100, likely dollars)
          amount = payment.amount > 1000 ? payment.amount / 100 : payment.amount
        } else if (typeof payment.total === 'number') {
          amount = payment.total > 1000 ? payment.total / 100 : payment.total
        } else if (typeof payment.price === 'number') {
          amount = payment.price > 1000 ? payment.price / 100 : payment.price
        } else if (typeof payment.price_amount === 'number') {
          amount = payment.price_amount > 1000 ? payment.price_amount / 100 : payment.price_amount
        } else {
          // Log first payment structure for debugging (only once per page)
          if (page === 1 && payments.indexOf(payment) === 0) {
            console.log(`[Whoplytics]   📋 Sample payment structure:`, {
              id: payment.id,
              keys: Object.keys(payment),
              sample: JSON.stringify(payment).substring(0, 500)
            })
          }
          amount = 0
        }
        
        if (amount > 0) {
          totalRevenue += amount
        }
      }
      
      // Check if there are more pages
      if (response.pagination) {
        const { current_page, total_pages, next } = response.pagination
        
        // Determine if we should continue paginating
        if (next !== null && next !== undefined) {
          hasMorePages = true
          page++
        } else if (current_page && total_pages && current_page < total_pages) {
          hasMorePages = true
          page++
        } else {
          hasMorePages = false
        }
      } else {
        // No pagination info, assume single page
        hasMorePages = false
      }
      
      // Safety check: don't paginate more than 100 pages
      if (page > 100) {
        console.warn('  ⚠️  Reached max pagination limit (100 pages)')
        hasMorePages = false
      }
    }
    
    console.log(`[Whoplytics] ✅ Total paid revenue for ${dateStr}: $${totalRevenue.toFixed(2)}`)
    return totalRevenue
  } catch (error) {
    console.error(`[Whoplytics] ❌ Error calculating revenue for ${dateStr}:`, error)
    return 0
  }
}

/**
 * List all memberships created on a specific day
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param accessToken - The access token to use for Whop API calls
 * @returns Array of membership objects
 *
 * @example
 * const newMembers = await listMembershipsForDay('2025-10-24', 'whop_access_token')
 * console.log(`New memberships: ${newMembers.length}`)
 */
export async function listMembershipsForDay(dateStr: string, accessToken: string, companyId: string): Promise<any[]> {
  try {
    console.log(`[Whoplytics] 👥 Fetching memberships created on ${dateStr} (company: ${companyId})...`)
    
    const startTime = startOfUtcDay(dateStr)
    const endTime = endOfUtcDay(dateStr)
    
    let allMemberships: any[] = []
    let page = 1
    let hasMorePages = true
    const limit = 100
    
    while (hasMorePages) {
      console.log(`[Whoplytics]   Fetching page ${page} of memberships...`)
      
      // Fetch memberships using app-scoped endpoint (works with installation access token)
      // App-scoped endpoints have proper permissions for company apps
      const response = await whopGET<{ 
        data?: any[]
        pagination?: { 
          current_page?: number
          total_pages?: number
          next?: string | null
        }
      }>('/app/memberships', {
        created_after: startTime,
        created_before: endTime,
        company_id: companyId, // Filter by company_id
        limit,
        page,
      }, accessToken)
      
      const memberships = response.data || []
      console.log(`[Whoplytics]   Found ${memberships.length} memberships on page ${page}`)
      
      // Additional safety: filter by companyId if membership has company_id field
      const filteredMemberships = memberships.filter((m: any) => {
        const membershipCompanyId = m.company_id || m.companyId || m.company?.id
        if (membershipCompanyId && membershipCompanyId !== companyId) {
          console.warn(`[Whoplytics]   ⚠️  Membership ${m.id} belongs to different company ${membershipCompanyId}, filtering out`)
          return false
        }
        return true
      })
      
      allMemberships = allMemberships.concat(filteredMemberships)
      
      // Check if there are more pages
      if (response.pagination) {
        const { current_page, total_pages, next } = response.pagination
        
        if (next !== null && next !== undefined) {
          hasMorePages = true
          page++
        } else if (current_page && total_pages && current_page < total_pages) {
          hasMorePages = true
          page++
        } else {
          hasMorePages = false
        }
      } else {
        hasMorePages = false
      }
      
      // Safety check: don't paginate more than 100 pages
      if (page > 100) {
        console.warn('  ⚠️  Reached max pagination limit (100 pages)')
        hasMorePages = false
      }
    }
    
    console.log(`[Whoplytics] ✅ Total memberships created on ${dateStr}: ${allMemberships.length}`)
    return allMemberships
  } catch (error) {
    console.error(`[Whoplytics] ❌ Error fetching memberships for ${dateStr}:`, error)
    return []
  }
}

/**
 * List all memberships canceled on a specific day
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param accessToken - The access token to use for Whop API calls
 * @returns Array of canceled membership objects
 *
 * @example
 * const canceledMembers = await listCancellationsForDay('2025-10-24', 'whop_access_token')
 * console.log(`Cancellations: ${canceledMembers.length}`)
 */
export async function listCancellationsForDay(dateStr: string, accessToken: string, companyId: string): Promise<any[]> {
  try {
    console.log(`[Whoplytics] ❌ Fetching cancellations on ${dateStr} (company: ${companyId})...`)
    
    const startTime = startOfUtcDay(dateStr)
    const endTime = endOfUtcDay(dateStr)
    
    let allCancellations: any[] = []
    let page = 1
    let hasMorePages = true
    const limit = 100
    
    while (hasMorePages) {
      console.log(`[Whoplytics]   Fetching page ${page} of cancellations...`)
      
      // Fetch cancellations using app-scoped endpoint (works with installation access token)
      // App-scoped endpoints have proper permissions for company apps
      const response = await whopGET<{ 
        data?: any[]
        pagination?: { 
          current_page?: number
          total_pages?: number
          next?: string | null
        }
      }>('/app/memberships', {
        canceled_after: startTime,
        canceled_before: endTime,
        company_id: companyId, // Filter by company_id
        limit,
        page,
      }, accessToken)
      
      const cancellations = response.data || []
      console.log(`[Whoplytics]   Found ${cancellations.length} raw cancellations on page ${page}`)
      
      // Filter by companyId client-side
      // Since we're using /app/memberships endpoint with company_id filter, 
      // all results should already be scoped to this company
      // But we'll do additional verification if company_id field exists
      const filteredCancellations = cancellations.filter((c: any) => {
        const cancellationCompanyId = 
          c.company_id || 
          c.companyId || 
          c.company?.id ||
          c.product?.company_id ||
          c.product?.companyId ||
          c.plan?.company_id ||
          c.plan?.companyId ||
          c.workspace?.company_id ||
          c.workspace?.companyId
        
        if (cancellationCompanyId) {
          if (cancellationCompanyId !== companyId) {
            console.log(`[Whoplytics]   ⚠️  Cancellation ${c.id} belongs to company ${cancellationCompanyId}, filtering out (expected: ${companyId})`)
            return false
          }
          return true
        }
        
        // If no company_id found but we're using app-scoped endpoint with company_id filter,
        // the API should have already filtered it, so include it
        // (Don't log warning for every cancellation - too noisy)
        return true
      })
      
      console.log(`[Whoplytics]   Filtered to ${filteredCancellations.length} cancellations for company ${companyId}`)
      allCancellations = allCancellations.concat(filteredCancellations)
      
      // Check if there are more pages
      if (response.pagination) {
        const { current_page, total_pages, next } = response.pagination
        
        if (next !== null && next !== undefined) {
          hasMorePages = true
          page++
        } else if (current_page && total_pages && current_page < total_pages) {
          hasMorePages = true
          page++
        } else {
          hasMorePages = false
        }
      } else {
        hasMorePages = false
      }
      
      // Safety check: don't paginate more than 100 pages
      if (page > 100) {
        console.warn('  ⚠️  Reached max pagination limit (100 pages)')
        hasMorePages = false
      }
    }
    
    console.log(`[Whoplytics] ✅ Total cancellations on ${dateStr}: ${allCancellations.length}`)
    return allCancellations
  } catch (error) {
    console.error(`[Whoplytics] ❌ Error fetching cancellations for ${dateStr}:`, error)
    return []
  }
}

/**
 * Count active memberships at the end of a specific day
 * 
 * This function attempts multiple strategies:
 * 1. First tries to query Whop API with status filters (active, trialing, past_due)
 * 2. If that's not supported, falls back to calculation: previousActive + newMembers - cancellations
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param accessToken - The access token to use for Whop API calls
 * @returns Number of active memberships at end of day
 * 
 * @example
 * const activeCount = await countActiveAtEndOfDay('2025-10-24', 'whop_access_token')
 * console.log(`Active members: ${activeCount}`)
 */
export async function countActiveAtEndOfDay(dateStr: string, accessToken: string, companyId: string): Promise<number> {
  try {
    console.log(`[Whoplytics] 🔢 Counting active memberships at end of ${dateStr} (company: ${companyId})...`)
    
    const endTime = endOfUtcDay(dateStr)
    
    // Strategy 1: Try to query with status filters and company filter
    try {
      console.log('[Whoplytics]   Attempting to fetch active memberships with status filters...')
      
      // Try app-scoped endpoint (works with installation access token)
      // App-scoped endpoints have proper permissions for company apps
      const response = await whopGET<{ 
        data?: any[]
        pagination?: { 
          total?: number
          total_count?: number
        }
      }>('/app/memberships', {
        status: 'active,trialing,past_due', // Common active statuses
        // For current date, don't filter by created_before to get ALL active members
        // For historical dates, use created_before to get count as of that date
        ...(dateStr !== new Date().toISOString().split('T')[0] ? { created_before: endTime } : {}),
        company_id: companyId, // Filter by company
        limit: 1, // We only need the count
      }, accessToken)
      
      // Check if API provides a total count
      if (response.pagination?.total !== undefined) {
        const count = response.pagination.total
        console.log(`[Whoplytics] ✅ Active memberships via API: ${count}`)
        return count
      } else if (response.pagination?.total_count !== undefined) {
        const count = response.pagination.total_count
        console.log(`[Whoplytics] ✅ Active memberships via API: ${count}`)
        return count
      } else if (response.data) {
        // If no count provided, we'd need to paginate through all - skip this approach
        console.log('[Whoplytics]   ⚠️  API does not provide total count, falling back to calculation...')
        throw new Error('No total count available')
      }
    } catch (statusError) {
      console.log('[Whoplytics]   ℹ️  Status filter approach not available, using calculation fallback')
    }
    
    // Strategy 2: Fallback to calculation
    console.log('[Whoplytics]   Calculating active count: previousActive + newMembers - cancellations')
    
    // Get yesterday's active count (if exists)
    // INTEGRITY: Must filter by companyId for multi-tenant isolation
    const yesterday = new Date(dateStr)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayDate = new Date(yesterday.toISOString().split('T')[0])
    
    // Check if we have yesterday's data in our database
    // INTEGRITY: Always filter by companyId
    let previousActive = 0
    try {
      const yesterdayMetric = await prisma.metricsDaily.findFirst({
        where: { 
          companyId, // INTEGRITY: Filter by companyId
          date: yesterdayDate 
        },
        orderBy: { date: 'desc' },
      })
      
      if (yesterdayMetric) {
        previousActive = yesterdayMetric.activeMembers
        console.log(`[Whoplytics]   Previous active (${yesterday.toISOString().split('T')[0]}): ${previousActive}`)
      } else {
        console.log(`[Whoplytics]   No previous data found for ${yesterday.toISOString().split('T')[0]}, starting from 0`)
      }
    } catch (dbError) {
      console.log('[Whoplytics]   Could not fetch previous day data, starting from 0')
    }
    
    // Get today's new members and cancellations
    const newMembers = await listMembershipsForDay(dateStr, accessToken, companyId)
    const cancellations = await listCancellationsForDay(dateStr, accessToken, companyId)
    
    // Calculate: previousActive + new - canceled
    const activeCount = Math.max(0, previousActive + newMembers.length - cancellations.length)
    
    console.log(`[Whoplytics]   Calculation: ${previousActive} + ${newMembers.length} - ${cancellations.length} = ${activeCount}`)
    console.log(`[Whoplytics] ✅ Active memberships at end of ${dateStr}: ${activeCount}`)
    
    return activeCount
  } catch (error) {
    console.error(`[Whoplytics] ❌ Error counting active memberships for ${dateStr}:`, error)
    return 0
  }
}

