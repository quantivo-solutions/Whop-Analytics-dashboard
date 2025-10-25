/**
 * Environment Variables
 * 
 * Strongly-typed access to environment variables for the Whop App.
 * Server-only variables are only accessible in server-side code.
 */

// Server-only environment variables (never exposed to client)
export const WHOP_APP_SERVER_KEY = process.env.WHOP_APP_SERVER_KEY || ''
export const WHOP_WEBHOOK_SECRET = process.env.WHOP_WEBHOOK_SECRET || ''
export const DATABASE_URL = process.env.DATABASE_URL || ''
export const CRON_SECRET = process.env.CRON_SECRET || ''
export const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
export const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || ''
export const REPORT_EMAIL = process.env.REPORT_EMAIL || ''

// Public environment variables (safe to expose to client)
export const NEXT_PUBLIC_WHOP_APP_ID = process.env.NEXT_PUBLIC_WHOP_APP_ID || ''
export const NEXT_PUBLIC_WHOP_AGENT_USER_ID = process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID || ''

/**
 * Validate that required server environment variables are set
 * Call this in API routes to ensure proper configuration
 */
export function validateServerEnv() {
  const missing: string[] = []
  
  if (!WHOP_APP_SERVER_KEY) missing.push('WHOP_APP_SERVER_KEY')
  if (!WHOP_WEBHOOK_SECRET) missing.push('WHOP_WEBHOOK_SECRET')
  if (!DATABASE_URL) missing.push('DATABASE_URL')
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

/**
 * Validate that required public environment variables are set
 * Call this in client components if needed
 */
export function validatePublicEnv() {
  const missing: string[] = []
  
  if (!NEXT_PUBLIC_WHOP_APP_ID) missing.push('NEXT_PUBLIC_WHOP_APP_ID')
  
  if (missing.length > 0) {
    console.warn(`Missing recommended environment variables: ${missing.join(', ')}`)
  }
}

