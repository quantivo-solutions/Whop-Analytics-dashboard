/**
 * Whop OAuth Callback Handler
 * Uses Whop SDK to exchange authorization code for access token and creates session
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getCompaniesForUser } from '@/lib/whop-rest'
import { WHOP_CLIENT_ID, WHOP_CLIENT_SECRET } from '@/lib/whop-sdk'

export const runtime = 'nodejs'

async function logInstallationAttempt(params: {
  companyId?: string | null
  experienceId?: string | null
  userId?: string | null
  success: boolean
  errorMessage?: string | null
  metadata?: Record<string, any>
}) {
  try {
    await prisma.installationAttempt.create({
      data: {
        companyId: params.companyId ?? null,
        experienceId: params.experienceId ?? null,
        userId: params.userId ?? null,
        success: params.success,
        errorMessage: params.errorMessage ?? null,
        metadata: params.metadata ?? {},
      },
    })
  } catch (error) {
    console.warn('[OAuth Callback] Failed to record installation attempt:', error)
  }
}

export async function GET(request: Request) {
  // CRITICAL: Log immediately when request arrives
  const requestUrl = request.url
  console.log('[OAuth Callback] 🚀 Request received:', {
    url: requestUrl,
    method: request.method,
    timestamp: new Date().toISOString(),
  })
  
  let companyIdForAttempt: string | null = null
  let experienceIdForAttempt: string | null = null
  let userIdForAttempt: string | null = null

  try {
    const { searchParams } = new URL(requestUrl)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    console.log('[OAuth Callback] 📋 Query params:', {
      hasCode: !!code,
      hasState: !!state,
      hasError: !!error,
      error: error || 'none',
      codePreview: code ? code.substring(0, 10) + '...' : 'none',
      statePreview: state ? state.substring(0, 20) + '...' : 'none',
    })

    // Handle OAuth errors from Whop
    if (error) {
      console.error('[OAuth Callback] ❌ OAuth error from Whop:', error)
      return NextResponse.redirect(new URL(`/login?error=${error}`, request.url))
    }

    // CRITICAL: If no code/state, this might be Whop validating the callback URL during installation
    // Return a simple success response instead of redirecting to avoid breaking installation
    // IMPORTANT: We should be lenient here - if it's not a browser direct access (no referer/user-agent check),
    // treat it as a validation request from Whop
    if (!code || !state) {
      console.warn('[OAuth Callback] ⚠️ Missing required params:', {
        hasCode: !!code,
        hasState: !!state,
        fullUrl: requestUrl,
        userAgent: request.headers.get('user-agent') || 'unknown',
        referer: request.headers.get('referer') || 'none',
      })
      
      // Check if this is likely a browser direct access (has common browser user-agent)
      const userAgent = request.headers.get('user-agent') || ''
      const referer = request.headers.get('referer') || ''
      const isBrowserAccess = userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari') || userAgent.includes('Firefox')
      
      // If it's a browser direct access AND has a referer (not from Whop), redirect to login
      if (isBrowserAccess && referer && !referer.includes('whop.com')) {
        console.log('[OAuth Callback] 🔍 Browser direct access detected - redirecting to login')
        return NextResponse.redirect(new URL('/login?error=missing_params', request.url))
      }
      
      // Otherwise, treat as Whop validation or API request - return success
      console.log('[OAuth Callback] ✅ Treating as Whop validation/API request - returning success response')
      return NextResponse.json({
        status: 'ok',
        message: 'OAuth callback endpoint is ready',
        timestamp: new Date().toISOString(),
      }, { status: 200 })
    }

    // Log the incoming request for debugging
    console.log('[OAuth] Callback received with code:', code?.substring(0, 10) + '...')
    
    const redirectUri = `${new URL(request.url).origin}/api/auth/callback`
    
    console.log('[OAuth] Exchanging code for token, redirectUri:', redirectUri)

    // Manually exchange code for token using Whop OAuth API
    const tokenResponse = await fetch('https://api.whop.com/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        redirect_uri: redirectUri,
        client_id: WHOP_CLIENT_ID,
        client_secret: WHOP_CLIENT_SECRET,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('[OAuth] Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: errorText,
      })
      return NextResponse.redirect(new URL(`/login?error=code_exchange_failed`, request.url))
    }

    const tokenData = await tokenResponse.json()
    const access_token = tokenData.access_token
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
      username: userData.username,
      email: userData.email,
      profile_pic_url: userData.profile_pic_url || 'none',
      hasCompany: !!userData.company_id,
    })
    userIdForAttempt = userData.id || null
    
    // Extract username from user data
    const username = userData.username || userData.email || userData.name || userData.id
    
    // 🔧 CRITICAL FIX: Determine the correct company ID for company apps
    // For company apps, experienceId maps to an installation created by app.installed webhook
    // We should look up the installation by experienceId to get the correct company_id
    let companyId: string | null = null
    let experienceId: string | null = null
    let stateCompanyId: string | null = null
    let stateBizCompanyId: string | null = null
    
    // First, try to decode experienceId and companyId from state
    try {
      if (state) {
        // Decode base64url back to base64
        const base64 = state.replace(/-/g, '+').replace(/_/g, '/')
        // Add padding if necessary
        const paddedBase64 = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
        const stateData = JSON.parse(Buffer.from(paddedBase64, 'base64').toString())
        experienceId = stateData.experienceId || null
        stateCompanyId = stateData.companyId || stateData.company_id || null
        if (!stateCompanyId && typeof stateData.company === 'object') {
          stateCompanyId = stateData.company?.id || stateData.company?.company_id || null
        }
        if (typeof stateCompanyId === 'string') {
          const trimmed = stateCompanyId.trim()
          stateBizCompanyId = trimmed.startsWith('biz_') ? trimmed : null
          stateCompanyId = trimmed
        }
        console.log('[OAuth] Decoded state, experienceId:', experienceId || 'none', 'companyId:', stateCompanyId || 'none')
      }
    } catch (e) {
      console.warn('[OAuth] Failed to decode state:', e)
    }
    
    // If we have an experienceId, this is a company app accessed via iframe
    // We need to get the company_id for this experience
    if (experienceId) {
      console.log('[OAuth] Iframe login detected, determining company for experienceId:', experienceId)
      
      // Priority 1: Use companyId from state if Whop provided it in URL
      if (stateBizCompanyId) {
        companyId = stateBizCompanyId
        console.log('[OAuth] Using company ID from state (passed via URL):', companyId)
      }
      // Priority 2: Check if installation already exists
      else {
        const existingInstallation = await prisma.whopInstallation.findFirst({
          where: { experienceId }
        })
        
        if (existingInstallation) {
          // Found installation - use its company_id
          companyId = existingInstallation.companyId
          console.log('[OAuth] Found existing installation, companyId:', companyId)
        } else {
        // No installation found yet - need to get company_id from Whop
        // Try to fetch experience details from Whop API using user's access token
        console.log('[OAuth] No installation found, fetching company from Whop API...')
        
        try {
          // Try using the user's access token first (they have access to their experiences)
          let expResponse = await fetch(`https://api.whop.com/api/v5/experiences/${experienceId}`, {
            headers: {
              'Authorization': `Bearer ${access_token}`,
            },
          })
          
          // If that fails, try with app server key
          if (!expResponse.ok) {
            console.log('[OAuth] User token failed, trying app server key...')
            const { env } = await import('@/lib/env')
            expResponse = await fetch(`https://api.whop.com/api/v5/experiences/${experienceId}`, {
              headers: {
                'Authorization': `Bearer ${env.WHOP_APP_SERVER_KEY}`,
              },
            })
          }
          
          if (expResponse.ok) {
            const expData = await expResponse.json()
            console.log('[OAuth] Experience data received:', JSON.stringify(expData, null, 2))
            
            // Experience should have company object with id
            if (expData.company?.id) {
              companyId = expData.company.id
              console.log('[OAuth] Got company from experience.company.id:', companyId)
            } else if (expData.company_id) {
              companyId = expData.company_id
              console.log('[OAuth] Got company from experience.company_id:', companyId)
            } else {
              console.warn('[OAuth] Experience data missing company_id, checking other fields...')
              console.warn('[OAuth] Experience keys:', Object.keys(expData))
              // Fall back to user's company
              companyId = userData.company_id || userData.id
            }
          } else {
            const errorText = await expResponse.text()
            console.error('[OAuth] Failed to fetch experience from Whop API:', expResponse.status, errorText)
            // Fall back to user's company
            companyId = userData.company_id || userData.id
          }
        } catch (error) {
          console.error('[OAuth] Error fetching experience:', error)
          // Fall back to user's company
          companyId = userData.company_id || userData.id
        }
        }
      }
    } else {
      // Direct login (not from iframe), use user's company if we still don't have one
      if (!companyId) {
        companyId = userData.company_id || userData.id || null
        console.log('[OAuth] Direct login, using user company:', companyId)
      }
    }

    experienceIdForAttempt = experienceId || null

    const requiresBizCompany = Boolean(experienceId)

    if (!companyId?.startsWith('biz_')) {
      const headerCompanyId =
        request.headers.get('x-whop-company-id') ||
        request.headers.get('x-whop-companyid') ||
        request.headers.get('x-whop-company') ||
        request.headers.get('x-whop-business-id') ||
        null
      if (headerCompanyId?.startsWith('biz_')) {
        console.log('[OAuth] Using biz company from request headers:', headerCompanyId)
        companyId = headerCompanyId
      }
    }

    if (!companyId?.startsWith('biz_') && requiresBizCompany) {
      console.error('[OAuth] ❌ Could not determine biz_ companyId for installation', {
        initialCompanyId: stateCompanyId,
        fallbackCompanyId: companyId,
      })
      await logInstallationAttempt({
        companyId: companyId ?? stateCompanyId,
        experienceId,
        userId: userData.id,
        success: false,
        errorMessage: 'missing_biz_company',
        metadata: {
          source: 'oauth_callback',
          stateCompanyId,
          experienceId,
        },
      })
      return NextResponse.redirect(new URL(`/login?error=company_not_found`, request.url))
    }

    if (!companyId?.startsWith('biz_')) {
      console.error('[OAuth] ❌ Unable to resolve any companyId for installation')
      await logInstallationAttempt({
        companyId: null,
        userId: userData.id,
        experienceId: experienceId || null,
        success: false,
        errorMessage: 'company_missing',
        metadata: { source: 'oauth_callback' },
      })
      return NextResponse.redirect(new URL(`/login?error=company_not_found`, request.url))
    }

    companyId = companyId.trim()
    companyIdForAttempt = companyId

    // CRITICAL: Guarantee an experience exists/linked for company installs
    if (companyId) {
      try {
        const { createExperienceForCompany } = await import('@/lib/create-experience')
        // If we already have an experienceId, keep it; otherwise try to create/fetch one
        let ensuredExperienceId = experienceId
        if (!ensuredExperienceId) {
          console.log('[OAuth Callback] Ensuring experience exists for company:', companyId)
          ensuredExperienceId = await createExperienceForCompany(companyId, access_token)
        }

        // If we have an experience now, make sure it is linked uniquely to this installation
        if (ensuredExperienceId) {
          console.log('[OAuth Callback] Experience ensured:', ensuredExperienceId)
          experienceId = ensuredExperienceId
        }
      } catch (e) {
        console.warn('[OAuth Callback] ⚠️ Could not ensure experience (non-blocking):', e)
      }
    }
    
    // CRITICAL: Log companyId for debugging specific installations
    console.log(`[OAuth Callback] 🎯 Processing installation for companyId: ${companyId}`)
    
    // Special logging for known problematic company
    if (companyId === 'biz_RRUhpqBUJ4cu4f') {
      console.log('[OAuth Callback] 🔍 SPECIAL DEBUG: Processing known problematic company')
      console.log('[OAuth Callback] 🔍 User data:', {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        company_id: userData.company_id,
      })
      console.log('[OAuth Callback] 🔍 ExperienceId:', experienceId || 'none')
      console.log('[OAuth Callback] 🔍 State companyId:', stateCompanyId || 'none')
    }

    // 🔄 CRITICAL: Check Whop API for active memberships to sync plan
    console.log('[OAuth] Fetching active memberships for plan sync...')
    let userPlan = 'free' // Default
    
    try {
      const membershipsResponse = await fetch('https://api.whop.com/api/v5/me/memberships', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      })

      if (membershipsResponse.ok) {
        const membershipsData = await membershipsResponse.json()
        const memberships = membershipsData.data || []
        
        console.log('[OAuth] Found', memberships.length, 'memberships')
        
        // Check for Pro or Business membership
        for (const membership of memberships) {
          const productName = membership.product?.name || ''
          const status = membership.status
          
          // Only count valid/active memberships
          if (status === 'active' || status === 'trialing') {
            if (productName.includes('Pro')) {
              userPlan = 'pro'
              console.log('[OAuth] User has Pro membership')
              break
            } else if (productName.includes('Business')) {
              userPlan = 'business'
              console.log('[OAuth] User has Business membership')
              break
            }
          }
        }
      }
    } catch (membershipError) {
      console.warn('[OAuth] Failed to fetch memberships, defaulting to free:', membershipError)
      // Continue with free plan if API call fails
    }

    // Prepare to migrate legacy installations that may still be keyed by user_* company IDs
    const legacyCompanyIds = new Set<string>()
    if (stateCompanyId && stateCompanyId !== companyId) legacyCompanyIds.add(stateCompanyId)
    if (userData.company_id && userData.company_id !== companyId) legacyCompanyIds.add(userData.company_id)
    if (userData.id && userData.id !== companyId) legacyCompanyIds.add(userData.id)

    let installation = null as Awaited<ReturnType<typeof prisma.whopInstallation.findUnique>> | null

    if (experienceId) {
      const existingByExperience = await prisma.whopInstallation
        .findUnique({
          where: { experienceId },
        })
        .catch(() => null)

      if (existingByExperience) {
        if (existingByExperience.companyId !== companyId) {
          console.log(
            `[OAuth Callback] 🔄 Migrating installation ${existingByExperience.id} from ${existingByExperience.companyId} to ${companyId}`
          )
          installation = await prisma.whopInstallation.update({
            where: { id: existingByExperience.id },
            data: { companyId },
          })
        } else {
          installation = existingByExperience
        }
      }
    }

    if (!installation) {
      installation = await prisma.whopInstallation
        .findUnique({
          where: { companyId },
        })
        .catch(() => null)
    }

    if (!installation && legacyCompanyIds.size > 0) {
      for (const legacyId of legacyCompanyIds) {
        const legacyInstallation = await prisma.whopInstallation
          .findUnique({
            where: { companyId: legacyId },
          })
          .catch(() => null)

        if (legacyInstallation) {
          console.log(
            `[OAuth Callback] 🔄 Migrating legacy installation ${legacyInstallation.id} from ${legacyInstallation.companyId} to ${companyId}`
          )
          installation = await prisma.whopInstallation.update({
            where: { id: legacyInstallation.id },
            data: { companyId },
          })
          break
        }
      }
    }

    // CRITICAL: Log installation status for debugging
    console.log(`[OAuth Callback] 📊 Installation lookup for ${companyId}:`, {
      exists: !!installation,
      currentPlan: installation?.plan || 'none',
      currentExperienceId: installation?.experienceId || 'none',
      currentUserId: installation?.userId || 'none',
    })

    // CRITICAL: Also check if experienceId is already taken by another installation
    let existingByExperienceId = null
    if (experienceId) {
      existingByExperienceId = await prisma.whopInstallation.findUnique({
        where: { experienceId },
      })
      
      if (existingByExperienceId && existingByExperienceId.companyId !== companyId) {
        console.warn(`[OAuth Callback] ⚠️ ExperienceId ${experienceId} already belongs to company ${existingByExperienceId.companyId}, cannot assign to ${companyId}`)
        console.warn(`[OAuth Callback] This is likely a reinstall scenario. Setting experienceId to null for this installation.`)
        // Don't set experienceId for this installation to avoid constraint violation
        experienceId = null
      } else if (existingByExperienceId) {
        console.log(`[OAuth Callback] ✅ ExperienceId ${experienceId} already belongs to this company - this is fine`)
      }
    }

    // Upsert installation with synced plan, experienceId, userId, and user data
    let installationCreated = false
    try {
      if (!installation) {
        // Create new installation
        try {
          installation = await prisma.whopInstallation.create({
            data: {
              companyId,
              userId: userData.id, // Store user ID for webhook matching
              experienceId: experienceId || null, // May be null if conflict detected
              accessToken: access_token,
              plan: userPlan,
              username: userData.username || null,
              email: userData.email || null,
              profilePicUrl: userData.profile_pic_url || null,
            },
          })
          installationCreated = true
          console.log(`[OAuth Callback] ✅ CREATED new installation for ${companyId} (user: ${userData.id}, username: ${userData.username || 'none'}) with plan: ${userPlan}`)
          
          // CRITICAL: Verify installation was actually created
          const verifyInstallation = await prisma.whopInstallation.findUnique({
            where: { companyId },
          })
          if (!verifyInstallation) {
            throw new Error(`Installation creation verification failed - installation not found in database after create`)
          }
          console.log(`[OAuth Callback] ✅ VERIFIED installation exists in database: ${verifyInstallation.companyId}`)
        } catch (createError: any) {
          // Handle unique constraint violations
          if (createError.code === 'P2002') {
            console.error(`[OAuth] ❌ Unique constraint violation during create:`, createError.meta)
            
            // If companyId conflict, try to find existing installation
            if (createError.meta?.target?.includes('companyId')) {
              console.log(`[OAuth] Installation already exists for companyId ${companyId}, fetching...`)
              installation = await prisma.whopInstallation.findUnique({
                where: { companyId },
              })
            }
            // If experienceId conflict, retry without experienceId
            else if (createError.meta?.target?.includes('experienceId') && experienceId) {
              console.log(`[OAuth] Retrying create without experienceId due to conflict...`)
              installation = await prisma.whopInstallation.create({
                data: {
                  companyId,
                  userId: userData.id,
                  experienceId: null, // Don't set if conflict
                  accessToken: access_token,
                  plan: userPlan,
                  username: userData.username || null,
                  email: userData.email || null,
                  profilePicUrl: userData.profile_pic_url || null,
                },
              })
              console.log(`[OAuth] ✅ Created installation without experienceId due to conflict`)
            } else {
              throw createError // Re-throw if we can't handle it
            }
          } else {
            throw createError // Re-throw non-constraint errors
          }
        }
      } else {
        // Update existing installation
        try {
          await prisma.whopInstallation.update({
            where: { companyId },
            data: { 
              userId: userData.id, // Store/update user ID for webhook matching
              // If we have an experienceId now, set it; otherwise keep existing
              experienceId: experienceId || installation.experienceId,
              accessToken: access_token,
              plan: userPlan, // Sync plan from Whop
              username: userData.username || null,
              email: userData.email || null,
              profilePicUrl: userData.profile_pic_url || null,
            },
          })
          console.log(`[OAuth] ✅ Updated installation for ${companyId} (user: ${userData.id}, username: ${userData.username || 'none'}) with plan: ${userPlan}`)
        } catch (updateError: any) {
          // Handle unique constraint violations during update
          if (updateError.code === 'P2002' && updateError.meta?.target?.includes('experienceId')) {
            console.warn(`[OAuth] ⚠️ Cannot update experienceId due to conflict, keeping existing value`)
            // Update without changing experienceId
            await prisma.whopInstallation.update({
              where: { companyId },
              data: { 
                userId: userData.id,
                // Don't update experienceId if conflict
                accessToken: access_token,
                plan: userPlan,
                username: userData.username || null,
                email: userData.email || null,
                profilePicUrl: userData.profile_pic_url || null,
              },
            })
            console.log(`[OAuth] ✅ Updated installation without experienceId due to conflict`)
          } else {
            throw updateError // Re-throw if we can't handle it
          }
        }
      }
    } catch (dbError: any) {
      console.error(`[OAuth Callback] ❌ CRITICAL: Database error during installation upsert:`, {
        code: dbError.code,
        message: dbError.message,
        meta: dbError.meta,
        companyId,
        installationCreated,
        stack: dbError.stack,
      })
      
      // CRITICAL: If installation creation failed, DO NOT proceed - user cannot use the app
      if (!installationCreated && !installation) {
        console.error(`[OAuth Callback] ❌ BLOCKING: Installation was not created - aborting OAuth flow`)
        
        await logInstallationAttempt({
          companyId,
          userId: userData?.id || null,
          experienceId: experienceId || null,
          success: false,
          errorMessage: dbError.message,
          metadata: {
            source: 'oauth_callback',
            code: dbError?.code,
            meta: dbError?.meta,
          },
        })
        
        return NextResponse.redirect(new URL(`/login?error=installation_failed&details=${encodeURIComponent(dbError.message)}&companyId=${companyId}`, request.url))
      }
      
      // If update failed but installation exists, log warning but continue (installation exists, just not updated)
      if (installation) {
        console.warn(`[OAuth Callback] ⚠️ Installation exists but update failed - continuing with existing installation`)
      }
    }
    
    // CRITICAL: Final verification - installation MUST exist before proceeding
    if (!installation) {
      console.error(`[OAuth Callback] ❌ CRITICAL: Installation is null after upsert - aborting`)
      await logInstallationAttempt({
        companyId,
        userId: userData.id,
        experienceId: experienceId || null,
        success: false,
        errorMessage: 'installation_missing',
        metadata: { source: 'oauth_callback' },
      })
      return NextResponse.redirect(new URL(`/login?error=installation_missing&companyId=${companyId}`, request.url))
    }
    
    console.log(`[OAuth Callback] ✅ FINAL VERIFICATION: Installation confirmed for ${companyId}:`, {
      installationId: installation.id,
      companyId: installation.companyId,
      userId: installation.userId,
      experienceId: installation.experienceId || 'none',
      plan: installation.plan,
    })

    await logInstallationAttempt({
      companyId,
      userId: userData.id,
      experienceId: installation.experienceId || experienceId || null,
      success: true,
      metadata: {
        source: 'oauth_callback',
        isNew: installationCreated,
      },
    })

    // CRITICAL: Ensure CompanyPrefs exists for this installation (required for onboarding)
    try {
      const { getCompanyPrefs } = await import('@/lib/company')
      await getCompanyPrefs(companyId) // This will create default prefs if they don't exist
      console.log(`[OAuth Callback] ✅ Ensured CompanyPrefs exists for companyId: ${companyId}`)
    } catch (prefsError) {
      console.error(`[OAuth Callback] ⚠️ Failed to ensure CompanyPrefs:`, prefsError)
      // Don't fail the OAuth flow if prefs creation fails - it will be created on first access
    }

    // Create session cookie
    const cookieStore = await cookies()
    const sessionToken = Buffer.from(JSON.stringify({
      companyId,
      userId: userData.id,
      username,
      exp: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days (extended from 7)
    })).toString('base64')

    // Set cookie with proper settings for iframe support
    console.log('[OAuth] Setting session cookie for companyId:', companyId)
    console.log('[OAuth] Session token length:', sessionToken.length)
    console.log('[OAuth] Session token preview:', sessionToken.substring(0, 50))
    cookieStore.set('whop_session', sessionToken, {
      httpOnly: true,
      secure: true, // Required for sameSite=none
      sameSite: 'none', // Allow cookies in iframe (required for Whop apps)
      maxAge: 30 * 24 * 60 * 60, // 30 days (extended from 7)
      path: '/',
    })
    console.log('[OAuth] Session cookie set successfully')
    
    // Clear logout flags after successful login
    // We'll set this in a cookie that the client can read, or pass it through redirect
    // For now, we'll clear it client-side via the loading page

    // Redirect to loading page which will wait for DB sync, then redirect to dashboard
    let finalDestination = '/dashboard'
    console.log('[OAuth] Determining redirect destination, experienceId:', experienceId || 'none')
    
    if (experienceId) {
      finalDestination = `/experiences/${experienceId}`
      console.log('[OAuth] Will redirect to experience dashboard:', experienceId)
    } else {
      console.log('[OAuth] No experienceId, will redirect to main dashboard')
    }

    // Use loading page to ensure smooth transition after database operations complete
    // Pass session token through URL as fallback for iframe cookie issues
    const loadingUrl = `/auth/loading?redirectTo=${encodeURIComponent(finalDestination)}&token=${encodeURIComponent(sessionToken)}`
    console.log('[OAuth] Redirecting to loading page with URL:', loadingUrl)
    console.log('[OAuth] Final destination will be:', finalDestination)
    console.log('[OAuth] Session token passed through URL (fallback for iframe cookies)')
    
    return NextResponse.redirect(new URL(loadingUrl, request.url))
  } catch (error: any) {
    console.error('[OAuth] ❌ OAuth callback error:', {
      message: error?.message || String(error),
      stack: error?.stack,
      code: error?.code,
      meta: error?.meta,
    })
    
    await logInstallationAttempt({
      companyId: companyIdForAttempt,
      userId: userIdForAttempt,
      experienceId: experienceIdForAttempt,
      success: false,
      errorMessage: error?.message || 'unknown_error',
      metadata: {
        source: 'oauth_callback_catch',
        code: error?.code,
      },
    })
    
    // Provide more specific error messages
    let errorMessage = 'internal_error'
    if (error?.code === 'P2002') {
      errorMessage = 'database_constraint_violation'
    } else if (error?.message?.includes('token')) {
      errorMessage = 'token_exchange_failed'
    } else if (error?.message?.includes('user')) {
      errorMessage = 'user_fetch_failed'
    }
    
    return NextResponse.redirect(new URL(`/login?error=${errorMessage}&details=${encodeURIComponent(error?.message || 'Unknown error')}`, request.url))
  }
}

