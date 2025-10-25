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
 * Validate a Whop API key by testing it against the Whop API
 * Uses /api/v5/company endpoint which supports API key authentication
 * @param apiKey - The Whop API key to validate
 * @returns true if the key is valid (returns 200 OK), false otherwise
 */
export async function validateWhopKey(apiKey: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

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
      return true
    }

    console.warn(`Whop API key validation failed: ${response.status} ${response.statusText}`)
    return false
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Whop API key validation timed out')
    } else {
      console.warn('Error validating Whop API key:', error)
    }
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
 * Make an authenticated request to Whop API
 * @param path - API endpoint path (e.g., '/v1/company')
 * @param options - Fetch options
 * @returns Response data or null on error
 * @throws Error if token is invalid
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

    // Validate token before using it
    const isValid = await validateWhopKey(token)
    if (!isValid) {
      console.warn('Whop API key validation failed in whopFetch')
      throw new Error('Invalid Whop API key — please reconnect Whop')
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
    if (error instanceof Error && error.message.includes('Invalid Whop API key')) {
      throw error
    }
    console.error('Error calling Whop API:', error)
    return null
  }
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
    const token = await getWhopToken()
    
    if (!token) {
      console.warn('No Whop token available for connection test')
      return false
    }

    // Validate the token
    const isValid = await validateWhopKey(token)
    
    if (!isValid) {
      console.warn('Whop API key validation failed in testWhopConnection')
    }
    
    return isValid
  } catch (error) {
    console.warn('Error testing Whop connection:', error)
    return false
  }
}

