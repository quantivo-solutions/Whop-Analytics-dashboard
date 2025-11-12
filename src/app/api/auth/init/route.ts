/**
 * OAuth Initialization Route
 * Generates Whop OAuth URL manually
 */

import { NextResponse } from 'next/server'
import { generateWhopOAuthUrl } from '@/lib/whop-oauth'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const experienceId = searchParams.get('experienceId')

    const { url, state } = await generateWhopOAuthUrl({
      origin,
      experienceId,
      headers: request.headers,
    })

    console.log('[OAuth] Generated authorization URL:', url, 'state:', state)

    return NextResponse.redirect(url, { status: 302 })
  } catch (error) {
    console.error('[OAuth] Failed to generate authorization URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    )
  }
}

