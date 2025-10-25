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
 * For now, returns fake data for testing (no validation needed)
 */
export async function fetchDailySummary(date?: string): Promise<WhopDailySummary> {
  // Check if we have a valid token
  const token = await getWhopToken()

  if (!token) {
    console.warn('No Whop token available, returning fake data')
    return generateFakeData()
  }

  try {
    // TODO: Replace with actual Whop API endpoint
    // When implementing real API calls, use whopFetch which handles validation:
    // const data = await whopFetch<WhopDailySummary>('/v1/metrics/daily?date=' + (date || new Date().toISOString().split('T')[0]))
    // return data || generateFakeData()
    
    // For now, return fake data WITHOUT validation (since we're not calling the API)
    console.warn('Whop API integration not yet implemented, returning fake data')
    return generateFakeData()
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid Whop API key')) {
      throw error
    }
    console.error('Error fetching daily summary from Whop:', error)
    return generateFakeData()
  }
}

/**
 * Generate fake data for testing
 * @returns Fake daily metrics
 */
function generateFakeData(): WhopDailySummary {
  // Generate realistic fake data with some variation
  const baseGrossRevenue = 1200 + Math.random() * 600 // 1200-1800
  const baseActiveMembers = 80 + Math.floor(Math.random() * 20) // 80-100
  const baseNewMembers = 8 + Math.floor(Math.random() * 8) // 8-16
  const baseCancellations = 2 + Math.floor(Math.random() * 4) // 2-6
  const baseTrialsStarted = 12 + Math.floor(Math.random() * 8) // 12-20
  const baseTrialsPaid = 3 + Math.floor(Math.random() * 5) // 3-8

  return {
    grossRevenue: Math.round(baseGrossRevenue * 100) / 100,
    activeMembers: baseActiveMembers,
    newMembers: baseNewMembers,
    cancellations: baseCancellations,
    trialsStarted: baseTrialsStarted,
    trialsPaid: baseTrialsPaid,
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

