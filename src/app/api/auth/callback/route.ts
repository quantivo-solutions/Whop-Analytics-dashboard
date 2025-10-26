/**
 * Whop OAuth Callback Handler
 * Exchanges authorization code for access token and creates session
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

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
    
    // Exchange code for access token using Whop's OAuth endpoint
    // Try the root OAuth endpoint (not /api/v2/)
    const tokenEndpoint = 'https://api.whop.com/oauth/token'
    const redirectUri = `${new URL(request.url).origin}/api/auth/callback`
    
    // Check if server key is available
    const serverKey = process.env.WHOP_APP_SERVER_KEY
    if (!serverKey) {
      console.error('[OAuth] WHOP_APP_SERVER_KEY is not set!')
      return NextResponse.redirect(new URL('/login?error=server_key_missing', request.url))
    }

    console.log('[OAuth] Token exchange request:', {
      endpoint: tokenEndpoint,
      client_id: process.env.NEXT_PUBLIC_WHOP_APP_ID,
      redirect_uri: redirectUri,
      hasServerKey: !!serverKey,
      serverKeyLength: serverKey.length,
    })

    // Try sending client credentials in body (Whop might prefer this over Basic Auth)
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
        client_secret: serverKey,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }).toString(),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('[OAuth] Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: errorText,
      })
      return NextResponse.redirect(new URL(`/login?error=token_exchange_failed&details=${encodeURIComponent(errorText)}`, request.url))
    }

    const tokenData = await tokenResponse.json()
    console.log('[OAuth] Token received, type:', tokenData.token_type)
    const accessToken = tokenData.access_token

    if (!accessToken) {
      console.error('[OAuth] No access token in response:', tokenData)
      return NextResponse.redirect(new URL('/login?error=no_access_token', request.url))
    }

    // Get user info from Whop using the access token
    const userResponse = await fetch('https://api.whop.com/api/v2/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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
      hasCompany: !!userData.company_id,
    })
    
    // Extract company ID from user data
    const companyId = userData.company_id || userData.id || `user_${userData.id}`

    if (!companyId) {
      return NextResponse.redirect(new URL('/login?error=no_company', request.url))
    }

    // Check if installation exists for this company
    let installation = await prisma.whopInstallation.findUnique({
      where: { companyId },
    })

    // If no installation, create one
    if (!installation) {
      installation = await prisma.whopInstallation.create({
        data: {
          companyId,
          accessToken,
          plan: 'free', // Default plan
        },
      })
    }

    // Create session cookie
    const cookieStore = await cookies()
    const sessionToken = Buffer.from(JSON.stringify({
      companyId,
      userId: userData.id,
      exp: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
    })).toString('base64')

    cookieStore.set('whop_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url))
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(new URL('/login?error=internal_error', request.url))
  }
}

