/**
 * OAuth Initialization Route
 * Generates Whop OAuth URL using the SDK
 */

import { NextResponse } from 'next/server'
import { whopSdk } from '@/lib/whop-sdk'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const redirectUri = searchParams.get('redirect_uri') || `${new URL(request.url).origin}/api/auth/callback`

    console.log('[OAuth] Generating authorization URL, redirectUri:', redirectUri)

    // Use Whop SDK to generate OAuth URL
    const { url, state } = whopSdk.oauth.getAuthorizationUrl({
      redirectUri,
      scope: ['read_user'], // Request user read permission
    })

    console.log('[OAuth] Generated URL with state:', state)

    // Return the URL and state to the client
    return NextResponse.json({
      url,
      state,
    })
  } catch (error) {
    console.error('[OAuth] Failed to generate authorization URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    )
  }
}

