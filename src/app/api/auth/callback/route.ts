/**
 * Whop OAuth Callback Handler
 * Uses Whop SDK to exchange authorization code for access token and creates session
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { whopSdk } from '@/lib/whop-sdk'

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
    
    console.log('[OAuth] Using Whop SDK to exchange code')

    // Use Whop SDK to exchange code for token (per official docs)
    const authResponse = await whopSdk.oauth.exchangeCode({
      code,
      redirectUri,
    })

    if (!authResponse.ok) {
      console.error('[OAuth] Code exchange failed:', {
        code: authResponse.code,
        raw: authResponse.raw,
      })
      return NextResponse.redirect(new URL(`/login?error=code_exchange_failed`, request.url))
    }

    const { access_token } = authResponse.tokens
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
          accessToken: access_token,
          plan: 'free', // Default plan
        },
      })
    } else {
      // Update access token if installation exists
      await prisma.whopInstallation.update({
        where: { companyId },
        data: { accessToken: access_token },
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

