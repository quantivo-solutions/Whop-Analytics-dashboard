/**
 * OAuth Initialization Route
 * Generates Whop OAuth URL manually
 */

import { NextResponse } from 'next/server'
import { WHOP_CLIENT_ID } from '@/lib/whop-sdk'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

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
    const qpCompanyId = searchParams.get('companyId') || searchParams.get('company_id')
    const headerCompanyId =
      request.headers.get('x-whop-company-id') ||
      request.headers.get('x-whop-companyid') ||
      request.headers.get('x-whop-company') ||
      request.headers.get('x-whop-business-id') ||
      request.headers.get('x-whop-biz-id') ||
      null
    const refererMatchBiz = referrer.match(/\/dashboard\/(biz_[A-Za-z0-9]+)/)

    let resolvedCompanyId =
      (qpCompanyId && qpCompanyId.startsWith('biz_') ? qpCompanyId : null) ||
      (headerCompanyId && headerCompanyId.startsWith('biz_') ? headerCompanyId : null) ||
      (refererMatchBiz ? refererMatchBiz[1] : null)

    if (!resolvedCompanyId && experienceId) {
      try {
        const installation = await prisma.whopInstallation.findUnique({
          where: { experienceId },
          select: { companyId: true },
        })
        if (installation?.companyId?.startsWith('biz_')) {
          resolvedCompanyId = installation.companyId
        }
      } catch (error) {
        console.warn('[OAuth] Failed to resolve companyId from installation:', error)
      }
    }
    
    console.log('[OAuth] Generating authorization URL, origin:', origin, 'redirectUri:', redirectUri, 'experienceId:', experienceId || 'none', 'companyId:', resolvedCompanyId || qpCompanyId || 'none')

    // Generate a random state for CSRF protection and include context
    const stateData = {
      csrf: crypto.randomBytes(16).toString('hex'),
      experienceId: experienceId || null,
      companyId: resolvedCompanyId || qpCompanyId || headerCompanyId || null,
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

