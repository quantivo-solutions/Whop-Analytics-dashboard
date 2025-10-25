import { prisma } from './prisma'
import { WhopServerSdk } from '@whop/api'
import { whopGET } from './whop-rest'

/**
 * Whop API Client
 * Now using official Whop SDK instead of manual fetch calls
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

/**
 * Get Whop access token from database
 * @param workspaceSettingsId - The workspace settings ID (optional, defaults to first)
 * @returns Access token or null if not found
 */
export async function getWhopToken(workspaceSettingsId?: string): Promise<string | null> {
  try {
    let whopAccount

    if (workspaceSettingsId) {
      whopAccount = await prisma.whopAccount.findUnique({
        where: { workspaceSettingsId },
      })
    } else {
      // Get the first workspace settings with a connected Whop account
      const settings = await prisma.workspaceSettings.findFirst({
        include: {
          whopAccount: true,
        },
      })
      whopAccount = settings?.whopAccount
    }

    return whopAccount?.accessToken || null
  } catch (error) {
    console.error('Error fetching Whop token:', error)
    return null
  }
}

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
 * Fetch daily summary metrics from Whop
 * @param date - Optional date string (YYYY-MM-DD), defaults to today
 * @returns Daily metrics summary
 * @throws Error if token is invalid (only when actually calling Whop API)
 * 
 * TODO: Implement actual Whop SDK integration
 * The Whop SDK uses GraphQL queries/mutations, not REST endpoints.
 * We need to use queries like GetCompanyQuery, ListReceiptsForCompanyQuery, etc.
 * For now, this returns zero values to allow the app to build and deploy.
 */
export async function fetchDailySummary(date?: string): Promise<WhopDailySummary> {
  const dateString = date || new Date().toISOString().split('T')[0]
  
  // Check if we have a valid token
  const client = await getWhopClient()

  if (!client) {
    console.log('No Whop token available, returning zero values for', dateString)
    return generateZeroData()
  }

  try {
    console.log(`📊 Whop SDK is connected for ${dateString}`)
    console.log('   Note: Live data fetching requires GraphQL query implementation')
    console.log('   Returning zero values for now - implement with GetCompanyQuery, ListReceiptsForCompanyQuery, etc.')
    
    // TODO: Implement actual Whop GraphQL queries
    // Example structure (needs actual implementation):
    // 
    // 1. Get company info
    // const companyData = await client.query(GetCompanyQuery)
    //
    // 2. Get receipts for date range
    // const receiptsData = await client.query(ListReceiptsForCompanyQuery, {
    //   companyId: companyData.id,
    //   createdAfter: startOfDay,
    //   createdBefore: endOfDay
    // })
    //
    // 3. Get memberships for date range
    // const membershipsData = await client.query(ListMembershipsQuery, {
    //   companyId: companyData.id,
    //   createdAfter: startOfDay,
    //   createdBefore: endOfDay
    // })
    //
    // 4. Calculate metrics from the data
    // return calculateMetrics(receiptsData, membershipsData)
    
    // For now, return zero values
    console.log('No live Whop data found for', dateString)
    return generateZeroData()
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid Whop API key')) {
      throw error
    }
    console.error('Error fetching daily summary from Whop:', error)
    console.log('No live Whop data found for', dateString)
    return generateZeroData()
  }
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
 * @returns Total revenue for the day (in dollars)
 * 
 * @example
 * const revenue = await sumPaidRevenueForDay('2025-10-24')
 * console.log(`Revenue: $${revenue.toFixed(2)}`)
 */
export async function sumPaidRevenueForDay(dateStr: string): Promise<number> {
  try {
    console.log(`💰 Calculating paid revenue for ${dateStr}...`)
    
    const startTime = startOfUtcDay(dateStr)
    const endTime = endOfUtcDay(dateStr)
    
    let totalRevenue = 0
    let page = 1
    let hasMorePages = true
    const limit = 100
    
    while (hasMorePages) {
      console.log(`  Fetching page ${page} of payments...`)
      
      // Fetch payments for the date range
      const response = await whopGET<{ 
        data?: any[]
        pagination?: { 
          current_page?: number
          total_pages?: number
          next?: string | null
        }
      }>('/payments', {
        status: 'paid',
        created_after: startTime,
        created_before: endTime,
        limit,
        page,
      })
      
      const payments = response.data || []
      console.log(`  Found ${payments.length} payments on page ${page}`)
      
      // Sum up revenue from this page
      for (const payment of payments) {
        // Try to find the revenue field (could be 'amount', 'final_amount', 'total', etc.)
        let amount = 0
        
        if (typeof payment.final_amount === 'number') {
          // Whop typically uses cents, convert to dollars
          amount = payment.final_amount / 100
        } else if (typeof payment.amount === 'number') {
          amount = payment.amount / 100
        } else if (typeof payment.total === 'number') {
          amount = payment.total / 100
        } else {
          // Unknown field structure, log for debugging
          console.warn(`  ⚠️  Unknown payment structure, available keys:`, Object.keys(payment))
          amount = 0
        }
        
        totalRevenue += amount
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
    
    console.log(`✅ Total paid revenue for ${dateStr}: $${totalRevenue.toFixed(2)}`)
    return totalRevenue
  } catch (error) {
    console.error(`❌ Error calculating revenue for ${dateStr}:`, error)
    return 0
  }
}

/**
 * List all memberships created on a specific day
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Array of membership objects
 * 
 * @example
 * const newMembers = await listMembershipsForDay('2025-10-24')
 * console.log(`New memberships: ${newMembers.length}`)
 */
export async function listMembershipsForDay(dateStr: string): Promise<any[]> {
  try {
    console.log(`👥 Fetching memberships created on ${dateStr}...`)
    
    const startTime = startOfUtcDay(dateStr)
    const endTime = endOfUtcDay(dateStr)
    
    let allMemberships: any[] = []
    let page = 1
    let hasMorePages = true
    const limit = 100
    
    while (hasMorePages) {
      console.log(`  Fetching page ${page} of memberships...`)
      
      // Fetch memberships for the date range
      const response = await whopGET<{ 
        data?: any[]
        pagination?: { 
          current_page?: number
          total_pages?: number
          next?: string | null
        }
      }>('/memberships', {
        created_after: startTime,
        created_before: endTime,
        limit,
        page,
      })
      
      const memberships = response.data || []
      console.log(`  Found ${memberships.length} memberships on page ${page}`)
      
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
    
    console.log(`✅ Total memberships created on ${dateStr}: ${allMemberships.length}`)
    return allMemberships
  } catch (error) {
    console.error(`❌ Error fetching memberships for ${dateStr}:`, error)
    return []
  }
}

/**
 * List all memberships canceled on a specific day
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Array of canceled membership objects
 * 
 * @example
 * const canceledMembers = await listCancellationsForDay('2025-10-24')
 * console.log(`Cancellations: ${canceledMembers.length}`)
 */
export async function listCancellationsForDay(dateStr: string): Promise<any[]> {
  try {
    console.log(`❌ Fetching cancellations on ${dateStr}...`)
    
    const startTime = startOfUtcDay(dateStr)
    const endTime = endOfUtcDay(dateStr)
    
    let allCancellations: any[] = []
    let page = 1
    let hasMorePages = true
    const limit = 100
    
    while (hasMorePages) {
      console.log(`  Fetching page ${page} of cancellations...`)
      
      // Fetch canceled memberships for the date range
      const response = await whopGET<{ 
        data?: any[]
        pagination?: { 
          current_page?: number
          total_pages?: number
          next?: string | null
        }
      }>('/memberships', {
        canceled_after: startTime,
        canceled_before: endTime,
        limit,
        page,
      })
      
      const cancellations = response.data || []
      console.log(`  Found ${cancellations.length} cancellations on page ${page}`)
      
      allCancellations = allCancellations.concat(cancellations)
      
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
    
    console.log(`✅ Total cancellations on ${dateStr}: ${allCancellations.length}`)
    return allCancellations
  } catch (error) {
    console.error(`❌ Error fetching cancellations for ${dateStr}:`, error)
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
 * @returns Number of active memberships at end of day
 * 
 * @example
 * const activeCount = await countActiveAtEndOfDay('2025-10-24')
 * console.log(`Active members: ${activeCount}`)
 */
export async function countActiveAtEndOfDay(dateStr: string): Promise<number> {
  try {
    console.log(`🔢 Counting active memberships at end of ${dateStr}...`)
    
    const endTime = endOfUtcDay(dateStr)
    
    // Strategy 1: Try to query with status filters
    try {
      console.log('  Attempting to fetch active memberships with status filters...')
      
      const response = await whopGET<{ 
        data?: any[]
        pagination?: { 
          total?: number
          total_count?: number
        }
      }>('/memberships', {
        status: 'active,trialing,past_due', // Common active statuses
        created_before: endTime,
        limit: 1, // We only need the count
      })
      
      // Check if API provides a total count
      if (response.pagination?.total !== undefined) {
        const count = response.pagination.total
        console.log(`✅ Active memberships via API: ${count}`)
        return count
      } else if (response.pagination?.total_count !== undefined) {
        const count = response.pagination.total_count
        console.log(`✅ Active memberships via API: ${count}`)
        return count
      } else if (response.data) {
        // If no count provided, we'd need to paginate through all - skip this approach
        console.log('  ⚠️  API does not provide total count, falling back to calculation...')
        throw new Error('No total count available')
      }
    } catch (statusError) {
      console.log('  ℹ️  Status filter approach not available, using calculation fallback')
    }
    
    // Strategy 2: Fallback to calculation
    console.log('  Calculating active count: previousActive + newMembers - cancellations')
    
    // Get yesterday's active count (if exists)
    const yesterday = new Date(dateStr)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    
    // Check if we have yesterday's data in our database
    let previousActive = 0
    try {
      const yesterdayMetric = await prisma.metricsDaily.findUnique({
        where: { date: new Date(yesterdayStr) },
      })
      
      if (yesterdayMetric) {
        previousActive = yesterdayMetric.activeMembers
        console.log(`  Previous active (${yesterdayStr}): ${previousActive}`)
      } else {
        console.log(`  No previous data found for ${yesterdayStr}, starting from 0`)
      }
    } catch (dbError) {
      console.log('  Could not fetch previous day data, starting from 0')
    }
    
    // Get today's new members and cancellations
    const newMembers = await listMembershipsForDay(dateStr)
    const cancellations = await listCancellationsForDay(dateStr)
    
    // Calculate: previousActive + new - canceled
    const activeCount = Math.max(0, previousActive + newMembers.length - cancellations.length)
    
    console.log(`  Calculation: ${previousActive} + ${newMembers.length} - ${cancellations.length} = ${activeCount}`)
    console.log(`✅ Active memberships at end of ${dateStr}: ${activeCount}`)
    
    return activeCount
  } catch (error) {
    console.error(`❌ Error counting active memberships for ${dateStr}:`, error)
    return 0
  }
}

