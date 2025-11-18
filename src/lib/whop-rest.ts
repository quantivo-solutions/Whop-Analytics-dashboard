/**
 * Whop REST API Client (server-side only)
 * Simple fetch-based client for Whop API calls
 */

/**
 * Generic GET request to Whop API
 * @param endpoint - API endpoint (e.g., '/payments', '/memberships')
 * @param params - Query parameters
 * @param accessToken - Optional access token (defaults to server key)
 * @returns API response
 */
export async function whopGET<T = any>(
  endpoint: string,
  params?: Record<string, any>,
  accessToken?: string
): Promise<T> {
  const token = accessToken || process.env.WHOP_APP_SERVER_KEY || process.env.WHOP_API_KEY

  if (!token) {
    throw new Error("Missing WHOP_APP_SERVER_KEY/WHOP_API_KEY - required for Whop API calls")
  }

  const url = new URL(`https://api.whop.com/api/v5${endpoint}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Whop API ${endpoint} failed: ${res.status} ${text}`)
  }

  return res.json()
}

/**
 * Get experience by ID
 */
export async function getExperienceById(experienceId: string) {
  const token = process.env.WHOP_APP_SERVER_KEY || process.env.WHOP_API_KEY

  if (!token) {
    throw new Error("Missing WHOP_APP_SERVER_KEY/WHOP_API_KEY - required for Whop API calls")
  }

  console.log(`[Whop REST] 🔍 Fetching experience ${experienceId} from Whop API...`)
  
  const url = new URL(`https://api.whop.com/api/v5/experiences/${experienceId}`)
  url.searchParams.set('include', 'company,workspace,app_installation,app')

  console.log(`[Whop REST] 📡 Experience request URL: ${url.toString()}`)

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })

  console.log(`[Whop REST] 📥 Experience response status: ${res.status} ${res.statusText}`)

  if (res.status === 404) {
    console.warn(`[Whop REST] ⚠️ Experience ${experienceId} not found (404)`)
    return null
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    console.error(`[Whop REST] ❌ Experience API error: ${res.status} ${text}`)
    throw new Error(`Whop getExperience ${experienceId} failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  console.log(`[Whop REST] 📦 Experience data received, keys:`, Object.keys(data))
  if (data.company) {
    console.log(`[Whop REST] 📦 Company data in experience:`, JSON.stringify(data.company, null, 2))
  }
  
  return data
}

/**
 * Get companies for a user (returns array of company objects)
 */
export async function getCompaniesForUser(
  userId: string,
  options?: { accessToken?: string }
): Promise<any[]> {
  if (!userId) {
    throw new Error("getCompaniesForUser requires a userId")
  }

  type TokenCandidate = {
    token?: string | null
    allowSelfEndpoints: boolean
    label: string
  }

  const triedTokens = new Set<string>()
  const tokensToTry: TokenCandidate[] = [
    { token: options?.accessToken, allowSelfEndpoints: true, label: 'iframe-user-token' },
    { token: process.env.WHOP_APP_SERVER_KEY, allowSelfEndpoints: false, label: 'server-key' },
    { token: process.env.WHOP_API_KEY, allowSelfEndpoints: false, label: 'api-key' },
  ]

  let lastError: any = null

  for (const candidate of tokensToTry) {
    const token = candidate.token
    if (!token || triedTokens.has(token)) {
      continue
    }

    triedTokens.add(token)

    const candidateEndpoints = [
      `/users/${userId}/companies`,
      `/users/${userId}/memberships`,
      ...(candidate.allowSelfEndpoints ? [`/me/companies`] : []),
    ]

    for (const endpoint of candidateEndpoints) {
      try {
        const url = new URL(`https://api.whop.com/api/v5${endpoint}`)
        if (endpoint.includes('memberships')) {
          url.searchParams.set('include', 'company')
        }

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })

        if (!res.ok) {
          // Try next endpoint if 404/403; otherwise throw
          const text = await res.text().catch(() => '')
          if (res.status === 404 || res.status === 403) {
            lastError = new Error(
              `Whop API ${endpoint} failed: ${res.status} ${text || ''} (token=${candidate.label})`
            )
            continue
          }
          throw new Error(`Whop API ${endpoint} failed: ${res.status} ${text}`)
        }

        const json = await res.json()

        if (!json) {
          continue
        }

        if (Array.isArray(json)) {
          return json
        }

        if (Array.isArray(json.data)) {
          if (endpoint.includes('memberships')) {
            const companies = json.data
              .map((membership: any) => membership.company || membership.company_id || membership.companyId)
              .filter(Boolean)
            if (companies.length > 0) {
              return companies
            }
            continue
          }
          return json.data
        }
      } catch (error) {
        lastError = error
      }
    }
  }

  if (lastError) {
    throw lastError
  }

  return []
}

/**
 * Get company by ID (returns company name and details)
 */
export async function getCompanyById(companyId: string): Promise<{ name?: string; id: string } | null> {
  const token = process.env.WHOP_APP_SERVER_KEY || process.env.WHOP_API_KEY

  if (!token) {
    throw new Error("Missing WHOP_APP_SERVER_KEY/WHOP_API_KEY - required for Whop API calls")
  }

  console.log(`[Whop REST] 🔍 Fetching company ${companyId} from Whop API...`)
  
  try {
    const url = `https://api.whop.com/api/v5/companies/${companyId}`
    console.log(`[Whop REST] 📡 Request URL: ${url}`)
    
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })

    console.log(`[Whop REST] 📥 Response status: ${res.status} ${res.statusText}`)

    if (res.status === 404) {
      console.warn(`[Whop REST] ⚠️ Company ${companyId} not found (404)`)
      return null
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      console.error(`[Whop REST] ❌ API error: ${res.status} ${text}`)
      throw new Error(`Whop getCompany ${companyId} failed: ${res.status} ${text}`)
    }

    const data = await res.json()
    console.log(`[Whop REST] 📦 Raw API response:`, JSON.stringify(data, null, 2))
    
    // Try multiple possible field names for company name
    const companyName = data.name || data.company_name || data.title || data.display_name || data.business_name || undefined
    
    console.log(`[Whop REST] ✅ Extracted company name: "${companyName}"`)
    console.log(`[Whop REST] ✅ Available fields:`, Object.keys(data))
    
    return {
      id: data.id || companyId,
      name: companyName,
    }
  } catch (error) {
    console.error(`[Whop REST] ❌ Error fetching company ${companyId}:`, error)
    if (error instanceof Error) {
      console.error(`[Whop REST] ❌ Error details:`, error.message, error.stack)
    }
    return null
  }
}


