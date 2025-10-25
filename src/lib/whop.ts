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
 * Uses Whop SDK to call /company endpoint which supports API key authentication
 * @param apiKey - The Whop API key to validate
 * @returns true if the key is valid, false otherwise
 */
export async function validateWhopKey(apiKey: string): Promise<boolean> {
  try {
    const client = createWhopClient(apiKey)
    
    // Try to fetch company info to validate the key
    await client.GET("/company")
    
    return true
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
 * TODO: Implement actual Whop API integration
 * For now, returns zero values when no data is found
 */
export async function fetchDailySummary(date?: string): Promise<WhopDailySummary> {
  const dateString = date || new Date().toISOString().split('T')[0]
  
  // Check if we have a valid token
  const token = await getWhopToken()

  if (!token) {
    console.log('No Whop token available, returning zero values for', dateString)
    return generateZeroData()
  }

  try {
    // TODO: Replace with actual Whop SDK calls
    // Example implementation:
    // const client = await getWhopClient()
    // if (!client) {
    //   console.log('No live Whop data found for', dateString)
    //   return generateZeroData()
    // }
    // 
    // // Fetch payments and memberships for the date range
    // const payments = await client.GET('/payments', { params: { date: dateString } })
    // const memberships = await client.GET('/memberships', { params: { date: dateString } })
    // 
    // if (!payments.data || payments.data.length === 0) {
    //   console.log('No live Whop data found for', dateString)
    //   return generateZeroData()
    // }
    // 
    // // Calculate metrics from API response
    // return {
    //   grossRevenue: calculateRevenue(payments.data),
    //   activeMembers: memberships.data?.active_count || 0,
    //   newMembers: memberships.data?.new_count || 0,
    //   cancellations: memberships.data?.cancelled_count || 0,
    //   trialsStarted: memberships.data?.trials_started || 0,
    //   trialsPaid: memberships.data?.trials_converted || 0,
    // }
    
    // For now, return zero values (no live data available yet)
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
    const client = await getWhopClient()
    
    if (!client) {
      console.warn('No Whop token available for connection test')
      return false
    }

    // Try to fetch company info to test the connection
    await client.GET("/company")
    
    return true
  } catch (error) {
    console.warn('Error testing Whop connection:', error)
    return false
  }
}

