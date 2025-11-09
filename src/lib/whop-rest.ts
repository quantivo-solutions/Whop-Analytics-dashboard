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

  const res = await fetch(`https://api.whop.com/api/v5/experiences/${experienceId}`, {
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
) {
  if (!userId) {
    throw new Error("getCompaniesForUser requires a userId")
  }

  const triedTokens = new Set<string>()
  const tokensToTry: (string | undefined | null)[] = [
    options?.accessToken,
    process.env.WHOP_APP_SERVER_KEY,
    process.env.WHOP_API_KEY,
  ]

  let lastError: any = null

  for (const token of tokensToTry) {
    if (!token || triedTokens.has(token)) {
      continue
    }

    triedTokens.add(token)

    try {
      const res = await fetch(`https://api.whop.com/api/v5/users/${userId}/companies`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Whop API /users/${userId}/companies failed: ${res.status} ${text}`)
      }

      const json = await res.json()

      if (Array.isArray(json)) {
        return json
      }

      if (Array.isArray(json.data)) {
        return json.data
      }

      return []
    } catch (error) {
      lastError = error
    }
  }

  if (lastError) {
    throw lastError
  }

  return []
}


