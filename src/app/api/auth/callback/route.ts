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

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.whop.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.NEXT_PUBLIC_WHOP_APP_ID,
        client_secret: process.env.WHOP_APP_SERVER_KEY,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${new URL(request.url).origin}/api/auth/callback`,
      }),
    })

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text())
      return NextResponse.redirect(new URL('/login?error=token_exchange_failed', request.url))
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Get user info from Whop
    const userResponse = await fetch('https://api.whop.com/api/v5/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!userResponse.ok) {
      console.error('Failed to fetch user info:', await userResponse.text())
      return NextResponse.redirect(new URL('/login?error=user_fetch_failed', request.url))
    }

    const userData = await userResponse.json()
    
    // For Whop apps, we need to get the company ID from the user's companies
    // In a real implementation, you'd select the appropriate company
    const companyId = userData.company_id || userData.id

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

