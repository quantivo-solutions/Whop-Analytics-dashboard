/**
 * Whop OAuth Callback Handler
 * Uses Whop SDK to exchange authorization code for access token and creates session
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { WHOP_CLIENT_ID, WHOP_CLIENT_SECRET } from '@/lib/whop-sdk'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${error}`, request.url))
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/login?error=missing_params', request.url))
    }

    // Log the incoming request for debugging
    console.log('[OAuth] Callback received with code:', code?.substring(0, 10) + '...')
    
    const redirectUri = `${new URL(request.url).origin}/api/auth/callback`
    
    console.log('[OAuth] Exchanging code for token, redirectUri:', redirectUri)

    // Manually exchange code for token using Whop OAuth API
    const tokenResponse = await fetch('https://api.whop.com/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        redirect_uri: redirectUri,
        client_id: WHOP_CLIENT_ID,
        client_secret: WHOP_CLIENT_SECRET,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('[OAuth] Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: errorText,
      })
      return NextResponse.redirect(new URL(`/login?error=code_exchange_failed`, request.url))
    }

    const tokenData = await tokenResponse.json()
    const access_token = tokenData.access_token
    console.log('[OAuth] Token exchange successful')

    // Get user info using the SDK
    const userResponse = await fetch('https://api.whop.com/api/v5/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    })

    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error('[OAuth] Failed to fetch user info:', {
        status: userResponse.status,
        body: errorText,
      })
      return NextResponse.redirect(new URL('/login?error=user_fetch_failed', request.url))
    }

    const userData = await userResponse.json()
    console.log('[OAuth] User data received:', {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      hasCompany: !!userData.company_id,
    })
    
    // Extract company ID and username from user data
    const companyId = userData.company_id || userData.id || `user_${userData.id}`
    const username = userData.username || userData.email || userData.name || companyId

    if (!companyId) {
      return NextResponse.redirect(new URL('/login?error=no_company', request.url))
    }

    // 🔄 CRITICAL: Check Whop API for active memberships to sync plan
    console.log('[OAuth] Fetching active memberships for plan sync...')
    let userPlan = 'free' // Default
    
    try {
      const membershipsResponse = await fetch('https://api.whop.com/api/v5/me/memberships', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      })

      if (membershipsResponse.ok) {
        const membershipsData = await membershipsResponse.json()
        const memberships = membershipsData.data || []
        
        console.log('[OAuth] Found', memberships.length, 'memberships')
        
        // Check for Pro or Business membership
        for (const membership of memberships) {
          const productName = membership.product?.name || ''
          const status = membership.status
          
          // Only count valid/active memberships
          if (status === 'active' || status === 'trialing') {
            if (productName.includes('Pro')) {
              userPlan = 'pro'
              console.log('[OAuth] User has Pro membership')
              break
            } else if (productName.includes('Business')) {
              userPlan = 'business'
              console.log('[OAuth] User has Business membership')
              break
            }
          }
        }
      }
    } catch (membershipError) {
      console.warn('[OAuth] Failed to fetch memberships, defaulting to free:', membershipError)
      // Continue with free plan if API call fails
    }

    // Check if installation exists for this company
    let installation = await prisma.whopInstallation.findUnique({
      where: { companyId },
    })

    // Extract experienceId from state (set during OAuth init)
    let experienceId: string | null = null
    try {
      if (state) {
        // Decode base64url back to base64
        const base64 = state.replace(/-/g, '+').replace(/_/g, '/')
        // Add padding if necessary
        const paddedBase64 = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
        const stateData = JSON.parse(Buffer.from(paddedBase64, 'base64').toString())
        experienceId = stateData.experienceId || null
        console.log('[OAuth] Decoded state, experienceId:', experienceId || 'none')
      }
    } catch (e) {
      console.warn('[OAuth] Failed to decode state:', e)
    }

    // Upsert installation with synced plan and experienceId
    if (!installation) {
      installation = await prisma.whopInstallation.create({
        data: {
          companyId,
          experienceId,
          accessToken: access_token,
          plan: userPlan,
        },
      })
      console.log(`[OAuth] Created new installation for ${companyId} with plan: ${userPlan}, experienceId: ${experienceId || 'none'}`)
    } else {
      // Update access token, plan, and experienceId
      await prisma.whopInstallation.update({
        where: { companyId },
        data: { 
          experienceId: experienceId || installation.experienceId, // Keep existing if not provided
          accessToken: access_token,
          plan: userPlan, // Sync plan from Whop
        },
      })
      console.log(`[OAuth] Updated installation for ${companyId} with plan: ${userPlan}`)
    }

    // Create session cookie
    const cookieStore = await cookies()
    const sessionToken = Buffer.from(JSON.stringify({
      companyId,
      userId: userData.id,
      username,
      exp: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
    })).toString('base64')

    // Set cookie with proper settings for iframe support
    console.log('[OAuth] Setting session cookie for companyId:', companyId)
    cookieStore.set('whop_session', sessionToken, {
      httpOnly: true,
      secure: true, // Required for sameSite=none
      sameSite: 'none', // Allow cookies in iframe (required for Whop apps)
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    // Redirect based on whether we have an experienceId (Whop iframe) or not
    let redirectUrl = '/dashboard'
    if (experienceId) {
      // User came from Whop iframe, redirect to experience dashboard with token
      // Include token in URL for iframe compatibility (cookies may be blocked)
      redirectUrl = `/experiences/${experienceId}?token=${encodeURIComponent(sessionToken)}`
      console.log('[OAuth] Redirecting to experience dashboard:', experienceId)
    } else {
      // User came from direct access, redirect to main dashboard
      redirectUrl = '/dashboard'
      console.log('[OAuth] Redirecting to main dashboard')
    }

    return NextResponse.redirect(new URL(redirectUrl, request.url))
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(new URL('/login?error=internal_error', request.url))
  }
}

