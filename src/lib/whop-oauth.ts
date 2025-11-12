// create helper for Whop OAuth URL generation
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'

interface OAuthOptions {
  origin?: string
  experienceId?: string | null
  companyIdCandidate?: string | null
  headers?: Headers | Record<string, string | null>
}

function getHeader(headers: OAuthOptions['headers'], key: string): string | null {
  if (!headers) return null
  if (headers instanceof Headers) {
    return headers.get(key)
  }
  const value = headers[key]
  return value ?? null
}

export async function generateWhopOAuthUrl(opts: OAuthOptions) {
  const experienceId = opts.experienceId ?? null
  const headers = opts.headers

  const referrer = getHeader(headers, 'referer') || ''
  const qpCompanyId = null
  const headerCompanyId =
    getHeader(headers, 'x-whop-company-id') ||
    getHeader(headers, 'x-whop-companyid') ||
    getHeader(headers, 'x-whop-company') ||
    getHeader(headers, 'x-whop-business-id') ||
    getHeader(headers, 'x-whop-biz-id') ||
    null
  const refererMatchBiz = referrer.match(/\/dashboard\/(biz_[A-Za-z0-9]+)/)

  let resolvedCompanyId =
    (opts.companyIdCandidate && opts.companyIdCandidate.startsWith('biz_') ? opts.companyIdCandidate : null) ||
    (headerCompanyId && headerCompanyId.startsWith('biz_') ? headerCompanyId : null) ||
    (refererMatchBiz ? refererMatchBiz[1] : null) ||
    (qpCompanyId && qpCompanyId.startsWith('biz_') ? qpCompanyId : null)

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

  const origin = opts.origin || env.NEXT_PUBLIC_APP_URL
  const redirectUri = `${origin}/api/auth/callback`

  const stateData = {
    csrf: crypto.randomBytes(16).toString('hex'),
    experienceId,
    companyId: resolvedCompanyId || headerCompanyId || null,
    timestamp: Date.now(),
  }

  const state = Buffer.from(JSON.stringify(stateData))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  const authUrl = new URL('https://whop.com/oauth')
  authUrl.searchParams.set('client_id', env.NEXT_PUBLIC_WHOP_APP_ID || '')
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'read_user read_memberships')
  authUrl.searchParams.set('state', state)

  return {
    url: authUrl.toString(),
    state,
  }
}
