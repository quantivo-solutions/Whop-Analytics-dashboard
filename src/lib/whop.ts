import { prisma } from './prisma'

/**
 * Whop API Client
 * Handles authentication and API requests to Whop
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
 * Make an authenticated request to Whop API
 * @param path - API endpoint path (e.g., '/v1/company')
 * @param options - Fetch options
 * @returns Response data or null on error
 */
export async function whopFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T | null> {
  try {
    const token = await getWhopToken()

    if (!token) {
      console.error('No Whop token available')
      return null
    }

    const response = await fetch(`https://api.whop.com${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      console.error(`Whop API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    return data as T
  } catch (error) {
    console.error('Error calling Whop API:', error)
    return null
  }
}

/**
 * Fetch daily summary metrics from Whop
 * @param date - Optional date string (YYYY-MM-DD), defaults to today
 * @returns Daily metrics summary
 * 
 * TODO: Implement actual Whop API integration
 * For now, returns fake data for testing
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
    // Example: const data = await whopFetch<WhopDailySummary>('/v1/metrics/daily?date=' + (date || new Date().toISOString().split('T')[0]))
    
    // For now, return fake data
    console.warn('Whop API integration not yet implemented, returning fake data')
    return generateFakeData()
  } catch (error) {
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
 * Test Whop API connection
 * @returns true if connection is successful
 */
export async function testWhopConnection(): Promise<boolean> {
  try {
    const token = await getWhopToken()
    
    if (!token) {
      return false
    }

    // TODO: Replace with actual Whop API health check endpoint
    // Example: const response = await whopFetch('/v1/company')
    // return response !== null
    
    // For now, just check if token exists
    return true
  } catch (error) {
    console.error('Error testing Whop connection:', error)
    return false
  }
}

