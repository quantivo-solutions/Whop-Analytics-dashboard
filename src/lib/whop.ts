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

