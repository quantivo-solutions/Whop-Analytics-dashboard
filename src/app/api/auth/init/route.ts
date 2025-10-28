/**
 * OAuth Initialization Route
 * Generates Whop OAuth URL manually
 */

import { NextResponse } from 'next/server'
import { WHOP_CLIENT_ID } from '@/lib/whop-sdk'
import crypto from 'crypto'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url)
    
    // Use the origin from the request to build the correct redirect URI
    // This ensures it matches whether accessed via Vercel or Whop iframe domain
    const redirectUri = `${origin}/api/auth/callback`

    // Check if we have context from the referrer (Whop iframe)
    const referrer = request.headers.get('referer') || ''
    const experienceId = searchParams.get('experienceId')
    
    console.log('[OAuth] Generating authorization URL, origin:', origin, 'redirectUri:', redirectUri, 'experienceId:', experienceId || 'none')

    // Generate a random state for CSRF protection and include context
    const stateData = {
      csrf: crypto.randomBytes(16).toString('hex'),
      experienceId: experienceId || null,
      timestamp: Date.now(),
    }
    // Use base64 instead of base64url for compatibility
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

    // Build OAuth authorization URL manually
    const authUrl = new URL('https://whop.com/oauth')
    authUrl.searchParams.set('client_id', WHOP_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'read_user read_memberships')
    authUrl.searchParams.set('state', state)

    const url = authUrl.toString()
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

