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
    
    // Extract username from user data
    const username = userData.username || userData.email || userData.name || userData.id
    
    // 🔧 CRITICAL FIX: Determine the correct company ID for company apps
    // For company apps, experienceId maps to an installation created by app.installed webhook
    // We should look up the installation by experienceId to get the correct company_id
    let companyId: string
    let experienceId: string | null = null
    let stateCompanyId: string | null = null
    
    // First, try to decode experienceId and companyId from state
    try {
      if (state) {
        // Decode base64url back to base64
        const base64 = state.replace(/-/g, '+').replace(/_/g, '/')
        // Add padding if necessary
        const paddedBase64 = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
        const stateData = JSON.parse(Buffer.from(paddedBase64, 'base64').toString())
        experienceId = stateData.experienceId || null
        stateCompanyId = stateData.companyId || null
        console.log('[OAuth] Decoded state, experienceId:', experienceId || 'none', 'companyId:', stateCompanyId || 'none')
      }
    } catch (e) {
      console.warn('[OAuth] Failed to decode state:', e)
    }
    
    // If we have an experienceId, this is a company app accessed via iframe
    // We need to get the company_id for this experience
    if (experienceId) {
      console.log('[OAuth] Iframe login detected, determining company for experienceId:', experienceId)
      
      // Priority 1: Use companyId from state if Whop provided it in URL
      if (stateCompanyId) {
        companyId = stateCompanyId
        console.log('[OAuth] Using company ID from state (passed via URL):', companyId)
      }
      // Priority 2: Check if installation already exists
      else {
        const existingInstallation = await prisma.whopInstallation.findFirst({
          where: { experienceId }
        })
        
        if (existingInstallation) {
          // Found installation - use its company_id
          companyId = existingInstallation.companyId
          console.log('[OAuth] Found existing installation, companyId:', companyId)
        } else {
        // No installation found yet - need to get company_id from Whop
        // Try to fetch experience details from Whop API using user's access token
        console.log('[OAuth] No installation found, fetching company from Whop API...')
        
        try {
          // Try using the user's access token first (they have access to their experiences)
          let expResponse = await fetch(`https://api.whop.com/api/v5/experiences/${experienceId}`, {
            headers: {
              'Authorization': `Bearer ${access_token}`,
            },
          })
          
          // If that fails, try with app server key
          if (!expResponse.ok) {
            console.log('[OAuth] User token failed, trying app server key...')
            const { env } = await import('@/lib/env')
            expResponse = await fetch(`https://api.whop.com/api/v5/experiences/${experienceId}`, {
              headers: {
                'Authorization': `Bearer ${env.WHOP_APP_SERVER_KEY}`,
              },
            })
          }
          
          if (expResponse.ok) {
            const expData = await expResponse.json()
            console.log('[OAuth] Experience data received:', JSON.stringify(expData, null, 2))
            
            // Experience should have company object with id
            if (expData.company?.id) {
              companyId = expData.company.id
              console.log('[OAuth] Got company from experience.company.id:', companyId)
            } else if (expData.company_id) {
              companyId = expData.company_id
              console.log('[OAuth] Got company from experience.company_id:', companyId)
            } else {
              console.warn('[OAuth] Experience data missing company_id, checking other fields...')
              console.warn('[OAuth] Experience keys:', Object.keys(expData))
              // Fall back to user's company
              companyId = userData.company_id || userData.id
            }
          } else {
            const errorText = await expResponse.text()
            console.error('[OAuth] Failed to fetch experience from Whop API:', expResponse.status, errorText)
            // Fall back to user's company
            companyId = userData.company_id || userData.id
          }
        } catch (error) {
          console.error('[OAuth] Error fetching experience:', error)
          // Fall back to user's company
          companyId = userData.company_id || userData.id
        }
        }
      }
    } else {
      // Direct login (not from iframe), use user's company
      companyId = userData.company_id || userData.id
      console.log('[OAuth] Direct login, using user company:', companyId)
    }

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

    // Upsert installation with synced plan, experienceId, userId, and user data
    if (!installation) {
      installation = await prisma.whopInstallation.create({
        data: {
          companyId,
          userId: userData.id, // Store user ID for webhook matching
          experienceId,
          accessToken: access_token,
          plan: userPlan,
          username: userData.username,
          email: userData.email,
          profilePicUrl: userData.profile_pic_url,
        },
      })
      console.log(`[OAuth] Created new installation for ${companyId} (user: ${userData.id}, username: ${userData.username}) with plan: ${userPlan}`)
    } else {
      // Update access token, plan, experienceId, userId, and user data
      await prisma.whopInstallation.update({
        where: { companyId },
        data: { 
          userId: userData.id, // Store/update user ID for webhook matching
          experienceId: experienceId || installation.experienceId, // Keep existing if not provided
          accessToken: access_token,
          plan: userPlan, // Sync plan from Whop
          username: userData.username,
          email: userData.email,
          profilePicUrl: userData.profile_pic_url,
        },
      })
      console.log(`[OAuth] Updated installation for ${companyId} (user: ${userData.id}, username: ${userData.username}) with plan: ${userPlan}`)
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

