import { prisma } from './prisma'
import { WhopServerSdk } from '@whop/api'

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
    console.log(`📊 Fetching live Whop data for ${dateString}...`)
    
    // Parse the date string to create start and end timestamps
    const targetDate = new Date(dateString + 'T00:00:00Z')
    const startOfDay = Math.floor(targetDate.getTime() / 1000) // Unix timestamp
    const endOfDay = startOfDay + 86400 // Add 24 hours in seconds
    
    console.log(`  Date range: ${new Date(startOfDay * 1000).toISOString()} to ${new Date(endOfDay * 1000).toISOString()}`)

    // Fetch company info to get the company ID
    const companyResult = await client.GET('/company')
    
    if (companyResult.error || !companyResult.data) {
      console.warn('Failed to fetch company info:', companyResult.error)
      console.log('No live Whop data found for', dateString)
      return generateZeroData()
    }

    const companyId = companyResult.data.id
    console.log(`  Company ID: ${companyId}`)

    // Fetch receipts (payments) for the date range
    const receiptsResult = await client.GET('/company/receipts', {
      params: {
        query: {
          company: companyId,
          created_after: startOfDay,
          created_before: endOfDay,
          per: 100, // Max per page
        }
      }
    })

    if (receiptsResult.error) {
      console.warn('Failed to fetch receipts:', receiptsResult.error)
      console.log('No live Whop data found for', dateString)
      return generateZeroData()
    }

    const receipts = receiptsResult.data?.data || []
    console.log(`  Found ${receipts.length} receipts`)

    // Fetch memberships for the date range
    const membershipsResult = await client.GET('/company/memberships', {
      params: {
        query: {
          company: companyId,
          created_after: startOfDay,
          created_before: endOfDay,
          per: 100, // Max per page
        }
      }
    })

    if (membershipsResult.error) {
      console.warn('Failed to fetch memberships:', membershipsResult.error)
    }

    const memberships = membershipsResult.data?.data || []
    console.log(`  Found ${memberships.length} new memberships`)

    // Calculate metrics from the fetched data
    let grossRevenue = 0
    let trialsPaid = 0

    receipts.forEach((receipt: any) => {
      // Sum up the final amount (in cents) and convert to dollars
      if (receipt.final_amount) {
        grossRevenue += receipt.final_amount / 100
      }
      
      // Count conversions from trial to paid
      if (receipt.billing_reason === 'subscription_trial_ending' || 
          receipt.billing_reason === 'subscription_cycle') {
        trialsPaid++
      }
    })

    // Count new memberships and cancellations
    let newMembers = memberships.length
    let cancellations = 0
    let trialsStarted = 0
    let activeMembers = 0

    memberships.forEach((membership: any) => {
      if (membership.status === 'trialing') {
        trialsStarted++
      }
      if (membership.status === 'active' || membership.status === 'trialing') {
        activeMembers++
      }
      if (membership.status === 'cancelled' || membership.status === 'expired') {
        cancellations++
      }
    })

    // Fetch all active memberships to get total active count
    const allMembershipsResult = await client.GET('/company/memberships', {
      params: {
        query: {
          company: companyId,
          status: 'active,trialing',
          per: 1, // We only need the count
        }
      }
    })

    if (!allMembershipsResult.error && allMembershipsResult.data?.pagination?.total) {
      activeMembers = allMembershipsResult.data.pagination.total
    }

    console.log(`✅ Whop data fetched:`)
    console.log(`   Revenue: $${grossRevenue.toFixed(2)}`)
    console.log(`   Active Members: ${activeMembers}`)
    console.log(`   New Members: ${newMembers}`)
    console.log(`   Cancellations: ${cancellations}`)
    console.log(`   Trials Started: ${trialsStarted}`)
    console.log(`   Trials Paid: ${trialsPaid}`)

    return {
      grossRevenue,
      activeMembers,
      newMembers,
      cancellations,
      trialsStarted,
      trialsPaid,
    }
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

