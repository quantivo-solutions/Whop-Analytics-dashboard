/**
 * Whop Authentication Utilities
 * Handles auto-login via Whop iframe headers (like other Whop apps)
 * 
 * When an app is loaded in a Whop iframe, Whop provides authentication headers
 * that allow us to verify the user is already logged into Whop without requiring OAuth
 */

import { headers } from 'next/headers'
import { whopSdk } from './whop-sdk'
import { cookies } from 'next/headers'

export interface WhopUserInfo {
  userId: string
  companyId?: string
  username?: string
}

/**
 * Verify user token from Whop iframe headers
 * Returns user info if valid, null if not authenticated
 * 
 * This is what other Whop apps use - they check if user is already logged into Whop
 * and auto-authenticate without requiring OAuth flow
 * 
 * Based on Whop docs: https://docs.whop.com/llms-full.txt
 * Example: const { userId } = await whopsdk.verifyUserToken(await headers())
 */
export async function verifyWhopUserToken(): Promise<WhopUserInfo | null> {
  try {
    const headersList = await headers()
    
    // Check if x-whop-user-token header exists
    const userTokenHeader = headersList.get('x-whop-user-token')
    console.log('[Whop Auth] Checking for x-whop-user-token header:', userTokenHeader ? 'present' : 'missing')
    
    if (!userTokenHeader) {
      console.log('[Whop Auth] No x-whop-user-token header found - user not authenticated via Whop iframe')
      return null
    }
    
    // Use Whop SDK to verify user token from headers
    // Pass { dontThrow: true } to handle errors gracefully
    // According to docs: https://docs.whop.com/apps/guides/authentication
    // verifyUserToken throws on validation failure unless dontThrow is true
    const userToken = await whopSdk.verifyUserToken(headersList, { dontThrow: true })
    
    if (!userToken) {
      console.log('[Whop Auth] verifyUserToken returned null - token invalid or expired')
      return null
    }
    
    // The verifyUserToken method returns { userId } according to docs
    // Check what properties are actually returned
    const userId = (userToken as any).userId || (userToken as any).id
    
    if (userId) {
      console.log('[Whop Auth] User verified via Whop iframe headers, userId:', userId)
      return {
        userId: userId as string,
        companyId: (userToken as any).companyId || (userToken as any).company_id || undefined,
        username: (userToken as any).username || undefined,
      }
    }
    
    console.log('[Whop Auth] User token returned but no userId/id found:', userToken)
    return null
  } catch (error) {
    // Not authenticated via Whop headers - this is normal for non-iframe contexts
    // or when user is not logged into Whop
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log('[Whop Auth] Error verifying Whop user token:', errorMessage)
    return null
  }
}

/**
 * Check if request is from Whop iframe
 */
export async function isWhopIframe(): Promise<boolean> {
  try {
    const headersList = await headers()
    const referer = headersList.get('referer')
    const origin = headersList.get('origin')
    
    // Check if request comes from Whop domains
    return referer?.includes('whop.com') === true || origin?.includes('whop.com') === true
  } catch {
    return false
  }
}

/**
 * Create session from Whop user info
 * This auto-authenticates users who are already logged into Whop
 */
export async function createSessionFromWhopUser(
  userInfo: WhopUserInfo,
  installation: { companyId: string; userId?: string; username?: string }
): Promise<void> {
  try {
    const cookieStore = await cookies()
    const sessionToken = Buffer.from(JSON.stringify({
      companyId: installation.companyId,
      userId: userInfo.userId,
      username: userInfo.username || installation.username,
      exp: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days (extended from 7)
    })).toString('base64')

    // Set cookie with proper settings for iframe support
    cookieStore.set('whop_session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none', // Required for iframe
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })
    
    console.log('[Whop Auth] Session created from Whop user token for:', installation.companyId)
  } catch (error) {
    console.error('[Whop Auth] Failed to create session from Whop user:', error)
  }
}

