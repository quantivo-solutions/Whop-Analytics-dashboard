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

  const url = new URL(`https://api.whop.com/api/v5/experiences/${experienceId}`)
  url.searchParams.set('include', 'company,workspace,app_installation,app')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })

  if (res.status === 404) return null

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Whop getExperience ${experienceId} failed: ${res.status} ${text}`)
  }

  return res.json()
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


