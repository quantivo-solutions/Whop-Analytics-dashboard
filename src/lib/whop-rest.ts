/**
 * Whop REST API Client
 * 
 * Simple wrapper for making authenticated requests to Whop's REST API v5
 * Uses direct fetch calls with token authentication from WhopInstallation
 * 
 * Updated to use v5 API which supports the new Company API key format
 */

import { getWhopToken } from './whop-installation'

const BASE = "https://api.whop.com/api/v5"

/**
 * Make an authenticated GET request to the Whop API
 * 
 * @param path - API path (e.g., "/company", "/memberships")
 * @param params - Optional query parameters
 * @param companyId - Optional company ID to get specific installation token
 * @returns Parsed JSON response
 * @throws Error if token is missing, unauthorized, or request fails
 * 
 * @example
 * const company = await whopGET<CompanyData>("/company")
 * const memberships = await whopGET("/memberships", { per: 100, page: 1 })
 */
export async function whopGET<T>(
  path: string,
  params?: Record<string, string | number>,
  companyId?: string
): Promise<T> {
  // Get token from database (installation-based)
  const token = await getWhopToken(companyId)
  
  if (!token) {
    throw new Error('No Whop installation found. Please install the app via Whop.')
  }
  
  console.log('✅ Whop token retrieved from installation, length:', token.length)

  // Build URL with query parameters
  const url = new URL(path, BASE)
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value))
    })
  }

  console.log(`🌐 Whop API: GET ${url.pathname}${url.search}`)

  try {
    // Create timeout controller (5 second timeout)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      // Make authenticated request with timeout
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

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
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      // Handle timeout specifically
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('❌ Whop API request timed out after 5 seconds')
        throw new Error('Whop API request timed out')
      }
      
      throw fetchError
    }
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

