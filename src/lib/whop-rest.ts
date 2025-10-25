/**
 * Whop REST API Client
 * 
 * Simple wrapper for making authenticated requests to Whop's REST API v2
 * Uses direct fetch calls with API key authentication
 */

const BASE = "https://api.whop.com/api/v2"

/**
 * Make an authenticated GET request to the Whop API
 * 
 * @param path - API path (e.g., "/company", "/memberships")
 * @param params - Optional query parameters
 * @returns Parsed JSON response
 * @throws Error if API key is missing, unauthorized, or request fails
 * 
 * @example
 * const company = await whopGET<CompanyData>("/company")
 * const memberships = await whopGET("/memberships", { per: 100, page: 1 })
 */
export async function whopGET<T>(
  path: string,
  params?: Record<string, string | number>
): Promise<T> {
  // Ensure API key is available
  // Try both WHOP_API_KEY and WHOP_SK for compatibility
  const apiKey = process.env.WHOP_API_KEY || process.env.WHOP_SK
  
  if (!apiKey) {
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('WHOP')))
    throw new Error('WHOP_API_KEY environment variable is not set')
  }
  
  console.log('✅ Whop API key found, length:', apiKey.length)

  // Build URL with query parameters
  const url = new URL(path, BASE)
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value))
    })
  }

  console.log(`🌐 Whop API: GET ${url.pathname}${url.search}`)

  try {
    // Make authenticated request
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    // Handle unauthorized responses
    if (response.status === 401 || response.status === 403) {
      const errorBody = await response.text().catch(() => 'No error body')
      console.error(`❌ Whop API unauthorized (${response.status}):`, errorBody)
      throw new Error('Unauthorized to Whop API')
    }

    // Handle other errors
    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'No error body')
      console.error(`❌ Whop API error (${response.status} ${response.statusText}):`, errorBody)
      throw new Error(`Whop API request failed: ${response.status} ${response.statusText}`)
    }

    // Parse and return JSON response
    const data = await response.json()
    console.log(`✅ Whop API: Success`)
    
    return data as T
  } catch (error) {
    // Re-throw known errors
    if (error instanceof Error) {
      throw error
    }
    
    // Handle unexpected errors
    console.error('❌ Unexpected error calling Whop API:', error)
    throw new Error('Unexpected error calling Whop API')
  }
}

