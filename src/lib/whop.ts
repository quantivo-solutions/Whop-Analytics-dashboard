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
      
      // Trust the API's company_id filter - memberships don't have company_id in their structure
      // The API has already filtered by company_id query parameter
      allMemberships = allMemberships.concat(memberships)
      
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
/**
 * Count unique users who have created a membership within a date range (for "New users" metric)
 * According to Whop docs: "Total number of new users" = unique users who made their first purchase
 * This should be filtered by the date range that matches the dashboard view period
 * 
 * IMPORTANT: We need to fetch ALL memberships (not just app-scoped) to get the complete count.
 * The CSV shows 60 memberships but API only returns 23, suggesting we're missing data.
 * 
 * @param accessToken - Whop access token
 * @param companyId - Company ID
 * @param startDate - Optional start date (YYYY-MM-DD) - if provided, only count users who joined on or after this date
 * @param endDate - Optional end date (YYYY-MM-DD) - if provided, only count users who joined on or before this date
 */
export async function countUniqueUsers(
  accessToken: string, 
  companyId: string,
  startDate?: string,
  endDate?: string
): Promise<number> {
  try {
    console.log(`[Whoplytics] 👥 Counting unique users for company ${companyId}...`)
    if (startDate && endDate) {
      console.log(`[Whoplytics]   Date range: ${startDate} to ${endDate}`)
    } else if (startDate) {
      console.log(`[Whoplytics]   Date range: from ${startDate} onwards`)
    } else if (endDate) {
      console.log(`[Whoplytics]   Date range: up to ${endDate}`)
    } else {
      console.log(`[Whoplytics]   No date range specified - counting all-time unique users`)
    }
    
    let allMemberships: any[] = []
    const limit = 100
    
    // Approach 1: Try /companies/{id}/memberships endpoint with version fallback
    // This should return ALL memberships for the company, not just app-scoped ones
    try {
      console.log(`[Whoplytics]   Trying /companies/${companyId}/memberships endpoint (company-scoped) with version fallback...`)
      let page = 1
      let hasMorePages = true
      
      while (hasMorePages && page <= 100) {
        const response = await whopGETWithVersionFallback<{ 
          data?: any[]
          pagination?: { 
            current_page?: number
            total_pages?: number
            next?: string | null
            total?: number
          }
        }>(`/companies/${companyId}/memberships`, {
          limit,
          page,
          // No filters - get ALL memberships (active, cancelled, inactive, all products)
        }, accessToken)
        
        if (response.data) {
          allMemberships = allMemberships.concat(response.data)
          console.log(`[Whoplytics]   Fetched ${response.data.length} memberships (page ${page}, total so far: ${allMemberships.length})`)
        }
        
        if (response.pagination?.total !== undefined) {
          console.log(`[Whoplytics]   API reports total: ${response.pagination.total}`)
          // If we've fetched all pages, stop
          if (allMemberships.length >= response.pagination.total) {
            hasMorePages = false
          }
        }
        
        if (response.pagination?.next) {
          page++
        } else if (response.pagination?.current_page && response.pagination?.total_pages) {
          if (response.pagination.current_page < response.pagination.total_pages) {
            page++
          } else {
            hasMorePages = false
          }
        } else {
          hasMorePages = false
        }
      }
      
      console.log(`[Whoplytics]   ✅ Company endpoint: Fetched ${allMemberships.length} total memberships`)
    } catch (error: any) {
      console.log(`[Whoplytics]   ⚠️  /companies/${companyId}/memberships failed: ${error.message}`)
      console.log('[Whoplytics]   Trying alternative endpoints...')
      
      // Try alternative: /memberships with company_id filter (might return all company memberships)
      try {
        console.log(`[Whoplytics]   Trying /memberships endpoint with company_id filter...`)
        let page = 1
        let hasMorePages = true
        
        while (hasMorePages && page <= 50) {
          const response = await whopGETWithVersionFallback<{ 
            data?: any[]
            pagination?: { 
              current_page?: number
              total_pages?: number
              next?: string | null
              total?: number
            }
          }>(`/memberships`, {
            company_id: companyId,
            limit,
            page,
            // No valid filter - get ALL memberships
          }, accessToken)
          
          if (response.data) {
            allMemberships = allMemberships.concat(response.data)
            console.log(`[Whoplytics]   Fetched ${response.data.length} memberships from /memberships (page ${page}, total so far: ${allMemberships.length})`)
          }
          
          if (response.pagination?.total !== undefined) {
            console.log(`[Whoplytics]   API reports total: ${response.pagination.total}`)
            if (allMemberships.length >= response.pagination.total) {
              hasMorePages = false
            }
          }
          
          if (response.pagination?.next) {
            page++
          } else if (response.pagination?.current_page && response.pagination?.total_pages) {
            if (response.pagination.current_page < response.pagination.total_pages) {
              page++
            } else {
              hasMorePages = false
            }
          } else {
            hasMorePages = false
          }
        }
        
        if (allMemberships.length > 0) {
          console.log(`[Whoplytics]   ✅ /memberships endpoint: Fetched ${allMemberships.length} total memberships`)
        }
      } catch (error2: any) {
        console.log(`[Whoplytics]   ⚠️  /memberships with company_id filter failed: ${error2.message}`)
      }
    }
    
    // Approach 2: Also try /app/memberships to supplement (in case company endpoint doesn't return all)
    // This gets app-scoped memberships which might include additional data
    try {
      console.log('[Whoplytics]   Also fetching from /app/memberships endpoint (app-scoped)...')
      const existingIds = new Set(allMemberships.map(m => m.id))
      let page = 1
      let hasMorePages = true
      let fetchedFromApp = 0
      
      while (hasMorePages && page <= 50) {
        const response = await whopGET<{ 
          data?: any[]
          pagination?: { 
            current_page?: number
            total_pages?: number
            next?: string | null
            total?: number
          }
        }>('/app/memberships', {
          company_id: companyId,
          limit,
          page,
          // No valid filter - get ALL memberships
        }, accessToken)
        
        if (response.data) {
          const newMemberships = response.data.filter(m => !existingIds.has(m.id))
          allMemberships = allMemberships.concat(newMemberships)
          fetchedFromApp += newMemberships.length
          existingIds.clear() // Rebuild set
          allMemberships.forEach(m => existingIds.add(m.id))
        }
        
        if (response.pagination?.next) {
          page++
        } else if (response.pagination?.current_page && response.pagination?.total_pages) {
          if (response.pagination.current_page < response.pagination.total_pages) {
            page++
          } else {
            hasMorePages = false
          }
        } else {
          hasMorePages = false
        }
      }
      
      if (fetchedFromApp > 0) {
        console.log(`[Whoplytics]   ✅ App endpoint: Added ${fetchedFromApp} additional memberships`)
      }
      
      // Also fetch cancelled/inactive memberships from app endpoint
      try {
        page = 1
        hasMorePages = true
        
        while (hasMorePages && page <= 20) {
          const response = await whopGET<{ 
            data?: any[]
            pagination?: { 
              current_page?: number
              total_pages?: number
              next?: string | null
            }
          }>('/app/memberships', {
            company_id: companyId,
            valid: false,
            limit,
            page,
          }, accessToken)
          
          if (response.data && response.data.length > 0) {
            const newMemberships = response.data.filter(m => !existingIds.has(m.id))
            allMemberships = allMemberships.concat(newMemberships)
            existingIds.clear()
            allMemberships.forEach(m => existingIds.add(m.id))
            console.log(`[Whoplytics]   Added ${newMemberships.length} cancelled/inactive memberships from app endpoint`)
          }
          
          if (response.pagination?.next) {
            page++
          } else {
            hasMorePages = false
          }
        }
      } catch (error) {
        console.log('[Whoplytics]   Could not fetch invalid memberships from app endpoint')
      }
    } catch (error: any) {
      console.log(`[Whoplytics]   ⚠️  /app/memberships failed: ${error.message}`)
    }
    
    // Filter by date range if provided (before deduplication to reduce processing)
    if (startDate || endDate) {
      const startDateObj = startDate ? new Date(startDate + 'T00:00:00.000Z') : null
      const endDateObj = endDate ? new Date(endDate + 'T23:59:59.999Z') : null
      
      const beforeFilter = allMemberships.length
      allMemberships = allMemberships.filter(m => {
        // Try multiple possible fields for created_at date
        const createdAt = m.created_at || m.createdAt || m.joined_at || m.created
        if (!createdAt) {
          // If no created_at date, exclude from filtered results
          return false
        }
        
        const createdDate = new Date(createdAt)
        
        // Filter by date range
        if (startDateObj && createdDate < startDateObj) return false
        if (endDateObj && createdDate > endDateObj) return false
        
        return true
      })
      
      console.log(`[Whoplytics]   Filtered from ${beforeFilter} to ${allMemberships.length} memberships within date range`)
    }
    
    // Remove duplicates by membership ID
    const uniqueMemberships = Array.from(
      new Map(allMemberships.map(m => [m.id, m])).values()
    )
    
    // Count unique users by user_id (primary) and email (fallback for anonymous users)
    const uniqueUserIds = new Set<string>()
    const uniqueEmails = new Set<string>()
    const emailToUserId = new Map<string, string>() // Track which emails belong to which user_ids
    
    for (const m of uniqueMemberships) {
      // Try multiple possible fields for user_id
      const userId = m.user_id || m.userId || m.user?.id || m.user_id
      // Try multiple possible fields for email
      const email = m.email || m.user?.email || m.customer_email
      
      if (userId) {
        uniqueUserIds.add(userId)
        // If we also have email, map it to this user_id
        if (email) {
          emailToUserId.set(email.toLowerCase(), userId)
        }
      } else if (email) {
        // No user_id but has email - check if this email is already mapped to a user_id
        const normalizedEmail = email.toLowerCase()
        if (!emailToUserId.has(normalizedEmail)) {
          // This is a new email that doesn't map to any user_id
          uniqueEmails.add(normalizedEmail)
        }
        // If email is already mapped to a user_id, we don't count it again
      }
    }
    
    // Total unique users = unique user_ids + unique emails (that don't map to a user_id)
    const totalUniqueUsers = uniqueUserIds.size + uniqueEmails.size
    
    console.log(`[Whoplytics] ✅ Unique users breakdown:`)
    console.log(`[Whoplytics]   - Total memberships fetched: ${uniqueMemberships.length}`)
    console.log(`[Whoplytics]   - Unique users by user_id: ${uniqueUserIds.size}`)
    console.log(`[Whoplytics]   - Unique users by email (no user_id): ${uniqueEmails.size}`)
    console.log(`[Whoplytics]   - Total unique users: ${totalUniqueUsers}`)
    
    // Log sample of memberships without user_id for debugging
    const membershipsWithoutUserId = uniqueMemberships.filter(m => !(m.user_id || m.userId || m.user?.id))
    if (membershipsWithoutUserId.length > 0) {
      console.log(`[Whoplytics]   ⚠️  Found ${membershipsWithoutUserId.length} memberships without user_id`)
      if (membershipsWithoutUserId.length <= 5) {
        console.log(`[Whoplytics]   Sample memberships without user_id:`, 
          membershipsWithoutUserId.map(m => ({ id: m.id, email: m.email || m.user?.email, keys: Object.keys(m).slice(0, 10) }))
        )
      }
    }
    
    return totalUniqueUsers
  } catch (error) {
    console.error(`[Whoplytics] ❌ Error counting unique users:`, error)
    return 0
  }
}

export async function countActiveAtEndOfDay(dateStr: string, accessToken: string, companyId: string): Promise<number> {
  try {
    console.log(`[Whoplytics] 🔢 Counting active memberships at end of ${dateStr} (company: ${companyId})...`)
    
    const endTime = endOfUtcDay(dateStr)
    const isToday = dateStr === new Date().toISOString().split('T')[0]
    
    // Strategy 1: Try to query with status filters and company filter
    try {
      console.log('[Whoplytics]   Attempting to fetch active memberships with status filters...')
      
      // For TODAY: Fetch ALL active memberships (no date filter) to match Whop dashboard exactly
      // For HISTORICAL dates: Use created_before to get count as of that date
      // IMPORTANT: Whop considers memberships with status='completed' and valid=true as active
      // So we should filter by valid=true OR include 'completed' in status filter
      const params: Record<string, any> = {
        valid: true, // Filter by valid=true to match Whop's definition of active
        company_id: companyId, // Filter by company
      }
      
      if (!isToday) {
        // Historical date: only count memberships created before end of that day
        params.created_before = endTime
      }
      // For today: no created_before filter = ALL active memberships regardless of creation date
      
      // Try app-scoped endpoint (works with installation access token)
      // App-scoped endpoints have proper permissions for company apps
      const response = await whopGET<{ 
        data?: any[]
        pagination?: { 
          total?: number
          total_count?: number
          current_page?: number
          total_pages?: number
          next?: string | null
        }
      }>('/app/memberships', params, accessToken)
      
      // Check if API provides a total count
      if (response.pagination?.total !== undefined) {
        const count = response.pagination.total
        console.log(`[Whoplytics] ✅ Active memberships via API pagination.total: ${count}`)
        return count
      } else if (response.pagination?.total_count !== undefined) {
        const count = response.pagination.total_count
        console.log(`[Whoplytics] ✅ Active memberships via API pagination.total_count: ${count}`)
        return count
      } else if (response.data) {
        // If no total count provided, paginate through all to get accurate count
        console.log('[Whoplytics]   ⚠️  API does not provide total count, paginating through all memberships...')
        
        let allMemberships: any[] = []
        let page = 1
        let hasMorePages = true
        const limit = 100
        
        while (hasMorePages) {
          const pageResponse = await whopGET<{ 
            data?: any[]
            pagination?: { 
              current_page?: number
              total_pages?: number
              next?: string | null
            }
          }>('/app/memberships', {
            ...params,
            limit,
            page,
          }, accessToken)
          
          if (pageResponse.data) {
            allMemberships = allMemberships.concat(pageResponse.data)
          }
          
          if (pageResponse.pagination?.next) {
            page++
          } else if (pageResponse.pagination?.current_page && pageResponse.pagination?.total_pages) {
            if (pageResponse.pagination.current_page < pageResponse.pagination.total_pages) {
              page++
            } else {
              hasMorePages = false
            }
          } else {
            hasMorePages = false
          }
          
          if (page > 100) {
            console.warn('[Whoplytics]   ⚠️  Reached max pagination limit (100 pages)')
            hasMorePages = false
          }
        }
        
        // Trust the API's company_id filter - memberships don't have company_id in their structure
        // The API has already filtered by company_id, so we can trust the count
        const count = allMemberships.length
        console.log(`[Whoplytics] ✅ Active memberships via pagination: ${count} (API already filtered by company_id)`)
        return count
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

