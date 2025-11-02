/**
 * Session Creation API Route
 * Creates a session cookie from Whop user authentication
 * Used for auto-login via Whop iframe headers
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    let { companyId, userId, username, sessionToken } = body

    // If sessionToken is provided, decode it to get the data
    // Otherwise, create new token from provided data
    if (sessionToken) {
      try {
        const decoded = JSON.parse(Buffer.from(sessionToken, 'base64').toString())
        companyId = decoded.companyId
        userId = decoded.userId
        username = decoded.username
      } catch (decodeError) {
        return NextResponse.json(
          { error: 'Invalid session token' },
          { status: 400 }
        )
      }
    }

    if (!companyId || !userId) {
      return NextResponse.json(
        { error: 'companyId and userId required (or valid sessionToken)' },
        { status: 400 }
      )
    }

    // Use provided token or create new one
    if (!sessionToken) {
      sessionToken = Buffer.from(JSON.stringify({
        companyId,
        userId,
        username: username || null,
        exp: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
      })).toString('base64')
    }

    // Set cookie with proper settings for iframe support
    const cookieStore = await cookies()
    cookieStore.set('whop_session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none', // Required for iframe
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    console.log('[Session API] Session cookie created for companyId:', companyId)

    return NextResponse.json({ 
      success: true,
      sessionToken // Return token for immediate use if needed
    })
  } catch (error) {
    console.error('[Session API] Error creating session:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}

