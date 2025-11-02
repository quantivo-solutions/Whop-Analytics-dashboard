/**
 * Session Refresh Endpoint
 * Creates/refreshes session cookie from installation data
 * Used when installation exists but cookie isn't accessible (iframe context)
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId required' },
        { status: 400 }
      )
    }

    // Get installation to verify it exists and get user data
    const installation = await prisma.whopInstallation.findUnique({
      where: { companyId },
    })

    if (!installation) {
      return NextResponse.json(
        { error: 'Installation not found' },
        { status: 404 }
      )
    }

    // Create session from installation data
    const sessionToken = Buffer.from(JSON.stringify({
      companyId: installation.companyId,
      userId: installation.userId || installation.companyId,
      username: installation.username,
      exp: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days (extended from 7)
    })).toString('base64')

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('whop_session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60, // 30 days (extended from 7)
      path: '/',
    })

    console.log('[Auth Refresh] Session cookie refreshed for companyId:', companyId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Auth Refresh] Error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh session' },
      { status: 500 }
    )
  }
}

