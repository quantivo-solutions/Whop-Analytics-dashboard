/**
 * Whop REST API Client (server-side only)
 * Simple fetch-based client for Whop API calls
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
