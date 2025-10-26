/**
 * Authentication and Authorization Helpers
 * 
 * Provides security for dashboard pages and API routes
 */

import { headers } from 'next/headers'
import { env } from './env'

/**
 * Validates a secret token from query parameters or headers
 * Used for protecting direct company dashboard access
 */
export async function validateSecretToken(token: string | null): Promise<boolean> {
  if (!token) return false
  
  // Check against CRON_SECRET (reusing existing env var)
  // In production, you might want a separate DASHBOARD_SECRET
  return token === env.CRON_SECRET
}

/**
 * Validates Whop iframe embedding
 * Checks if request comes from Whop's iframe context
 */
export async function isWhopIframeRequest(): Promise<boolean> {
  const headersList = await headers()
  const referer = headersList.get('referer')
  const origin = headersList.get('origin')
  
  // Check if request comes from Whop domains
  if (referer?.includes('whop.com') || origin?.includes('whop.com')) {
    return true
  }
  
  // Check for Whop-specific headers (they might add custom headers)
  const whopHeader = headersList.get('x-whop-iframe')
  if (whopHeader) {
    return true
  }
  
  return false
}

/**
 * Validates that the user has permission to view a company's data
 * 
 * For now, we'll implement a simple token-based system
 * In the future, you could integrate with Whop's OAuth or session system
 */
export async function canAccessCompany(
  companyId: string,
  token?: string | null
): Promise<{ allowed: boolean; reason?: string }> {
  // Option 1: Valid secret token (for admin/support access)
  if (token && await validateSecretToken(token)) {
    return { allowed: true, reason: 'admin_token' }
  }
  
  // Option 2: Request from Whop iframe (for embedded views)
  if (await isWhopIframeRequest()) {
    return { allowed: true, reason: 'whop_iframe' }
  }
  
  // Option 3: Demo company (public access for testing)
  if (companyId === 'demo_company' || companyId.includes('demo')) {
    return { allowed: true, reason: 'demo_company' }
  }
  
  // Option 4: Test companies in development mode
  if (process.env.NODE_ENV === 'development') {
    return { allowed: true, reason: 'development_mode' }
  }
  
  // Default: deny access
  return { 
    allowed: false, 
    reason: 'unauthorized' 
  }
}

/**
 * Get the authenticated company ID from the request context
 * This would integrate with your actual auth system (Whop OAuth, JWT, etc.)
 */
export async function getAuthenticatedCompanyId(): Promise<string | null> {
  // TODO: Implement actual authentication
  // For now, return null (requires explicit token or iframe)
  
  // In a real implementation, you would:
  // 1. Check for a session cookie
  // 2. Validate a JWT token
  // 3. Query Whop's OAuth endpoint
  // 4. Return the user's company ID
  
  return null
}

