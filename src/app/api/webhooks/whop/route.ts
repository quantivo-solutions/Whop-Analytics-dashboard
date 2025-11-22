import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import crypto from 'crypto'

export const runtime = 'nodejs'

/**
 * GET endpoint for webhook health check
 * This helps verify that the webhook URL is accessible
 */
export async function GET() {
  const timestamp = new Date().toISOString()
  console.log(`[WHOP Webhook] GET request received at ${timestamp}`)
  
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook endpoint is accessible',
    timestamp,
    method: 'GET',
    endpoint: '/api/webhooks/whop',
  })
}

/**
 * Whop Webhook Handler
 * 
 * Handles app installation, uninstallation, and updates from Whop.
 * Verifies webhook signatures for security.
 * 
 * Events:
 * - app.installed: Store new installation + trigger backfill
 * - app.uninstalled: Remove installation
 * - app.plan.updated: Update plan details
 */
export async function POST(request: Request) {
  let action: string | undefined = undefined // Declare outside try block for error handler
  
  // CRITICAL: Log immediately when POST is received
  const requestStartTime = Date.now()
  console.log(`[WHOP Webhook] ⚡ POST request received at ${new Date().toISOString()}`)
  console.log(`[WHOP Webhook] Request URL: ${request.url}`)
  console.log(`[WHOP Webhook] Request headers:`, Object.fromEntries(request.headers.entries()))
  
  // Log webhook receipt for ALL requests (helps debug cancellation issues)
  console.log(`[WHOP Webhook] 📥 Webhook received - checking for cancellation events...`)
  
  try {
    // Read raw body first for signature verification
    const rawBody = await request.text()
    // Deployment ping: update timestamp to force build when needed
    console.log('[WHOP Webhook] Build ping at', new Date().toISOString())
    
    // Get webhook signature from headers
    const signature = request.headers.get('whop-signature')
    
    // Debug: Log raw body details
    console.log('[Webhook Debug] Raw body length:', rawBody.length)
    console.log('[Webhook Debug] Raw body (first 200 chars):', rawBody.substring(0, 200))
    console.log('[Webhook Debug] Raw body (last 50 chars):', rawBody.substring(Math.max(0, rawBody.length - 50)))
    console.log('[Webhook Debug] Raw body (full):', rawBody)
    
    // Verify webhook signature if secret is configured
    if (env.WHOP_WEBHOOK_SECRET && env.WHOP_WEBHOOK_SECRET !== '') {
      if (!signature) {
        console.warn('⚠️  Missing webhook signature (WHOP_WEBHOOK_SECRET is set but no signature provided)')
        // Don't reject - allow webhook to proceed for development
      } else {
        // Debug: Log signature details
        console.log('[Webhook Debug] Received signature header:', signature.substring(0, 32) + '...')
        console.log('[Webhook Debug] Secret length:', env.WHOP_WEBHOOK_SECRET.length)
        console.log('[Webhook Debug] Secret preview:', env.WHOP_WEBHOOK_SECRET.substring(0, 8) + '...')
        
        // Compute expected signature locally for debugging
        const testExpected = crypto
          .createHmac('sha256', env.WHOP_WEBHOOK_SECRET)
          .update(rawBody)
          .digest('hex')
        console.log('[Webhook Debug] Computed expected signature:', testExpected.substring(0, 32) + '...')
        
        if (!verifyWebhookSignature(rawBody, signature)) {
          console.error('❌ Invalid webhook signature')
          return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 403 }
          )
        } else {
          console.log('✅ Webhook signature verified')
        }
      }
    } else {
      console.warn('⚠️  WHOP_WEBHOOK_SECRET not set, skipping signature verification (NOT RECOMMENDED FOR PRODUCTION)')
    }

    // Parse body after verification
    const body = JSON.parse(rawBody)
    
    // TASK 4 - Webhook handler: Derive companyId from payload and add safe-guard logs
    // INTEGRITY: Extract companyId early and validate
    // Try multiple paths: data.company.id (new format), data.company_id (old format), and top-level variants
    const companyId = body.data?.company?.id || body.data?.company_id || body.company_id || body.data?.companyId || body.companyId || body.company?.id
    const dayKey = body.data?.date || new Date().toISOString().split('T')[0]
    
    // Whop uses different fields for event type:
    // - "action" for some webhooks (e.g., "app_membership.went_valid")
    // - "type" for others (e.g., "membership.activated")
    // - "event" as fallback
    action = body.action || body.type || body.event
    const data = body.data || body // If data is null, use body itself

    // TASK 4 - Safe-guard log prefix
    console.log('[Whoplytics] webhook', { type: action, companyId: companyId || 'missing', dayKey })
    
    // INTEGRITY: Reject if companyId is missing for critical events
    if (!companyId && (action === 'app.installed' || action === 'membership.activated' || action === 'membership.cancelled')) {
      console.error('[Whoplytics] INTEGRITY ERROR: Missing companyId in webhook payload for action:', action)
      return NextResponse.json(
        { error: 'Missing companyId in webhook payload', action },
        { status: 400 }
      )
    }

    console.log(`📥 Whop webhook action: ${action}`)
    console.log(`📦 Webhook data keys:`, Object.keys(data || {}))
    console.log(`📦 Full webhook body:`, JSON.stringify(body, null, 2))

    // Map Whop's action names to our handlers
    switch (action) {
      case 'app.installed':
      case 'app_installed':
        await handleAppInstalled(data)
        break
      
      case 'app.uninstalled':
      case 'app_uninstalled':
        await handleAppUninstalled(data)
        break
      
      case 'app.plan.updated':
      case 'app_plan_updated':
        await handlePlanUpdated(data)
        break
      
      // Handle membership events - Whop uses "app_membership.went_valid"
      case 'app_membership.went_valid':
      case 'membership.went_valid':
      case 'membership.activated':
      case 'membership_activated':
        await handleMembershipActivated(data)
        break
      
      case 'app_membership.went_invalid':
      case 'membership.went_invalid':
      case 'membership.cancelled':
      case 'membership_cancelled':
      case 'membership.deactivated':
      case 'membership_deactivated':
        await handleMembershipCancelled(data)
        break
      
      // Handle payment/subscription cancellation events
      case 'payment.refunded':
      case 'payment_refunded':
      case 'subscription.cancelled':
      case 'subscription_cancelled':
      case 'subscription.expired':
      case 'subscription_expired':
        console.log(`[WHOP] ⚠️  Payment/subscription cancellation event detected: ${action}`)
        await handleMembershipCancelled(data)
        break
      
      default:
        console.log(`ℹ️  Unhandled webhook action: ${action}`)
        console.log(`ℹ️  Full webhook body for unhandled action:`, JSON.stringify(body, null, 2))
        
        // Check if this might be a membership event with different naming
        if (action && (action.includes('membership') || action.includes('purchase') || action.includes('payment'))) {
          // Check if it's a cancellation event
          if (action.includes('cancel') || action.includes('invalid') || action.includes('expired') || action.includes('refund')) {
            console.log(`[WHOP] ⚠️  Potential membership cancellation event with unrecognized action: ${action}`)
            console.log(`[WHOP] ⚠️  Attempting to handle as membership.cancelled...`)
            try {
              await handleMembershipCancelled(data)
              console.log(`[WHOP] ✅ Successfully handled unrecognized cancellation event`)
            } catch (err) {
              console.error(`[WHOP] ❌ Failed to handle unrecognized cancellation event:`, err)
            }
          } else {
            // Otherwise treat as activation
            console.log(`[WHOP] ⚠️  Potential membership event with unrecognized action: ${action}`)
            console.log(`[WHOP] ⚠️  Attempting to handle as membership.activated...`)
            try {
              await handleMembershipActivated(data)
              console.log(`[WHOP] ✅ Successfully handled unrecognized membership event`)
            } catch (err) {
              console.error(`[WHOP] ❌ Failed to handle unrecognized membership event:`, err)
            }
          }
        }
    }

    return NextResponse.json({ ok: true, action })
  } catch (error) {
    console.error('❌ Webhook error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    // Log full error details for debugging
    console.error('[WHOP] Error details:', {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : undefined,
      action: action || 'unknown',
    })
    
    // Log database errors specifically
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('[WHOP] Database error code:', (error as any).code)
      console.error('[WHOP] Database error meta:', (error as any).meta)
    }
    
    return NextResponse.json(
      { 
        error: 'Webhook processing failed', 
        details: errorMessage,
        action: action || 'unknown'
      },
      { status: 500 }
    )
  }
}

/**
 * Verify webhook signature using HMAC SHA-256
 */
function verifyWebhookSignature(payload: string, signature: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', env.WHOP_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex')
    
    // Debug logging for signature verification issues
    if (signature !== expectedSignature) {
      console.log('[Webhook Signature Debug]')
      console.log('  Received signature:', signature.substring(0, 32) + '...')
      console.log('  Expected signature:', expectedSignature.substring(0, 32) + '...')
      console.log('  Payload length:', payload.length)
      console.log('  Payload preview:', payload.substring(0, 100))
    }
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('Error verifying signature:', error)
    return false
  }
}

/**
 * Handle app.installed event
 * Store the installation details including access token
 * Then trigger a 7-day backfill asynchronously
 */
async function handleAppInstalled(data: any) {
  // Extract all possible fields from webhook payload
  const company_id = data.company_id || data.company?.id
  let experience_id = data.experience_id || data.experience?.id
  const access_token = data.access_token || data.accessToken
  const plan = data.plan
  const user = data.user
  const user_id = user?.id || data.user_id || data.userId
  
  console.log('[WHOP] app.installed webhook received:', {
    company_id,
    experience_id: experience_id || 'none',
    user_id: user_id || 'none',
    has_access_token: !!access_token,
    plan: plan || 'none'
  })
  
  // Log full payload for debugging
  console.log('[WHOP] Full app.installed payload:', JSON.stringify(data, null, 2))

  if (!company_id || !access_token) {
    throw new Error('Missing required installation data: company_id or access_token')
  }

  // Check if installation already exists (use findFirst since companyId is not unique alone)
  const existing = await prisma.whopInstallation.findFirst({
    where: { companyId: company_id },
    orderBy: { updatedAt: 'desc' },
  })
  
  const isNewInstallation = !existing

  // CRITICAL: Always set plan to 'free' on app.installed webhook
  // Even if webhook sends a plan or existing installation has pro, we reset to 'free'
  // The plan will be updated by membership.activated webhook if user actually has Pro
  // This ensures cancelled memberships don't persist across reinstalls

  // Store installation with userId if available
  try {
    // If experienceId is provided and already exists for a different company, handle it
    if (experience_id) {
        const existingByExp = await prisma.whopInstallation.findUnique({
          where: { experienceId: experience_id },
        }).catch(() => null)
      
      if (existingByExp && existingByExp.companyId !== company_id) {
        // ExperienceId already belongs to a different company
        // This shouldn't happen in normal Whop flow, but handle gracefully
        console.warn(`[WHOP] ⚠️ ExperienceId ${experience_id} already belongs to company ${existingByExp.companyId}, cannot assign to ${company_id}`)
        // Don't set experienceId for this installation to avoid constraint violation
        experience_id = null
      }
    }
    
    // CRITICAL: userId is now REQUIRED for installations
    if (!user_id) {
      console.error('[WHOP] ❌ Missing userId in app.installed webhook - cannot create installation')
      throw new Error('Missing userId - required for user-level plan tracking')
    }

    await prisma.whopInstallation.upsert({
      where: { 
        companyId_userId: {
          companyId: company_id,
          userId: user_id,
        }
      },
      update: {
        experienceId: experience_id || existing?.experienceId || null, // Only update if provided and unique
        accessToken: access_token,
        plan: 'free', // DEPRECATED: Kept for migration period. User-level plan is in UserPlan table.
        updatedAt: new Date(),
      },
      create: {
        companyId: company_id,
        userId: user_id, // REQUIRED: User-level plan tracking
        experienceId: experience_id || null,
        accessToken: access_token,
        plan: 'free', // DEPRECATED: Kept for migration period
      },
    })

    console.log(`[WHOP] ✅ Installed companyId=${company_id}, plan=free (isNew: ${isNewInstallation}), experienceId=${experience_id || 'none'}, userId=${user_id || 'none'}`)
    
    // Fetch and store company name
    try {
      const { updateInstallationCompanyName } = await import('@/lib/company')
      await updateInstallationCompanyName(company_id)
    } catch (nameError) {
      console.warn(`[WHOP] Failed to fetch company name:`, nameError)
      // Non-critical, continue
    }
  } catch (error: any) {
    // Handle unique constraint violations (e.g., duplicate experienceId)
    console.error(`[WHOP] ❌ Error during installation upsert:`, {
      code: error?.code,
      message: error?.message,
      meta: error?.meta,
      company_id,
      experience_id: experience_id || 'none',
    })
    
    if (error.code === 'P2002') {
      console.error(`[WHOP] ❌ Database constraint violation:`, error.meta)
      // If it's a duplicate experienceId, try updating without experienceId
      if (error.meta?.target?.includes('experienceId')) {
        console.log('[WHOP] ⚠️ Duplicate experienceId detected, retrying without experienceId...')
        try {
          // Use composite key if we have userId, otherwise use updateMany
          if (user_id) {
            await prisma.whopInstallation.upsert({
              where: {
                companyId_userId: {
                  companyId: company_id,
                  userId: user_id,
                },
              },
              update: {
                accessToken: access_token,
                plan: 'free',
                userId: user_id,
                updatedAt: new Date(),
                // Don't update experienceId if it causes a conflict
              },
              create: {
                companyId: company_id,
                userId: user_id,
                experienceId: null, // Skip experienceId to avoid conflict
                accessToken: access_token,
                plan: 'free',
              },
            })
          } else {
            // Fallback: updateMany if no userId (shouldn't happen, but handle gracefully)
            await prisma.whopInstallation.updateMany({
              where: { companyId: company_id },
              data: {
                accessToken: access_token,
                plan: 'free',
                updatedAt: new Date(),
              },
            })
          }
          console.log(`[WHOP] ✅ Installed companyId=${company_id} without experienceId (duplicate conflict resolved)`)
          return // Success, exit early
        } catch (retryError: any) {
          console.error(`[WHOP] ❌ Retry failed:`, {
            code: retryError?.code,
            message: retryError?.message,
            meta: retryError?.meta,
          })
          throw retryError
        }
      } else if (error.meta?.target?.includes('companyId')) {
        // This shouldn't happen with upsert, but handle it
        console.error(`[WHOP] ❌ Duplicate companyId detected (unexpected with upsert):`, company_id)
        throw new Error(`Installation already exists for companyId: ${company_id}`)
      } else {
        console.error(`[WHOP] ❌ Unknown constraint violation:`, error.meta)
        throw error
      }
    } else {
      // Re-throw non-constraint errors
      console.error(`[WHOP] ❌ Non-constraint database error:`, error)
      throw error
    }
  }
  
  // CRITICAL: For ALL installations (new and reinstalls), ensure CompanyPrefs exists with completedAt=null
  // This ensures onboarding shows on fresh installs AND reinstalls after cancellation
  try {
    const { getCompanyPrefs, setCompanyPrefs } = await import('@/lib/company')
    const prefs = await getCompanyPrefs(company_id) // This will create default prefs if they don't exist
    
    // Always reset completedAt to null on install/reinstall (triggers onboarding)
    if (prefs.completedAt !== null) {
      await setCompanyPrefs(company_id, { completedAt: null })
      console.log(`[WHOP] ✅ Reset CompanyPrefs.completedAt to null for ${isNewInstallation ? 'new' : 'reinstalled'} installation: ${company_id}`)
    }
    
    console.log(`[WHOP] ✅ Ensured CompanyPrefs exists for ${isNewInstallation ? 'new' : 'reinstalled'} installation: ${company_id}`)
  } catch (prefsError) {
    console.error(`[WHOP] Error ensuring CompanyPrefs:`, prefsError)
    // Continue - getCompanyPrefs will try again when user accesses the app
  }

  // Trigger backfill asynchronously (don't await to avoid blocking webhook response)
  triggerBackfill(company_id).catch((error) => {
    console.error(`❌ Backfill failed for ${company_id}:`, error)
  })
}

/**
 * Handle app.uninstalled event
 * Remove the installation from database
 */
async function handleAppUninstalled(data: any) {
  const { company_id, user, user_id } = data

  if (!company_id) {
    throw new Error('Missing company_id')
  }

  // Delete the installation for this company+user combination
  const resolvedUserId = user?.id || user_id
  if (resolvedUserId) {
    await prisma.whopInstallation.deleteMany({
      where: { 
        companyId: company_id,
        userId: resolvedUserId,
      },
    })
    console.log(`[WHOP] Uninstalled companyId=${company_id} for userId=${resolvedUserId}`)
    
    // Check if user has any remaining installations
    const remainingInstallations = await prisma.whopInstallation.findMany({ 
      where: { userId: resolvedUserId } 
    })
    
    // If no installations remain, user-level plan can stay (they might reinstall)
    // But if they want to remove it, they can cancel the membership separately
    if (remainingInstallations.length === 0) {
      console.log(`[WHOP] User ${resolvedUserId} has no remaining installations after uninstall`)
    }
  } else {
    // Fallback: delete by companyId only (for old installations without userId)
    await prisma.whopInstallation.deleteMany({
      where: { companyId: company_id },
    })
    console.log(`[WHOP] Uninstalled companyId=${company_id} (no userId provided)`)
  }

  // Reset onboarding for the uninstalled company so a reinstall shows the wizard
  try {
    const { setCompanyPrefs } = await import('@/lib/company')
    await setCompanyPrefs(company_id, { completedAt: null })
    console.log(`[WHOP] ✅ Reset onboarding for uninstalled company: ${company_id}`)
  } catch (prefsErr) {
    console.error('[WHOP] Error resetting onboarding on uninstall:', prefsErr)
  }
}

/**
 * Handle app.plan.updated event
 * DEPRECATED: This webhook is deprecated in favor of user-level plans.
 * Plans are now managed via UserPlan table, not installation.plan.
 * This handler is kept for backward compatibility but does nothing.
 */
async function handlePlanUpdated(data: any) {
  const { company_id, plan, user_id } = data

  console.log(`[WHOP] ⚠️ app.plan.updated webhook received but is deprecated.`)
  console.log(`[WHOP] Plans are now user-level. Use membership.activated/membership.went_invalid instead.`)
  console.log(`[WHOP] Received: company_id=${company_id}, user_id=${user_id || 'none'}, plan=${plan || 'none'}`)
  
  // If user_id is provided, we could update UserPlan table, but this webhook is deprecated
  // The membership webhooks handle plan updates correctly
}

/**
 * Trigger a 7-day backfill for a newly installed company
 * Calls the backfill function directly to avoid Vercel auth issues
 */
async function triggerBackfill(companyId: string) {
  try {
    console.log(`📊 Starting 7-day backfill for companyId=${companyId}`)
    
    // Get the installation to fetch the access token (use findFirst since companyId is not unique alone)
    const installation = await prisma.whopInstallation.findFirst({
      where: { companyId },
      orderBy: { updatedAt: 'desc' },
    })
    
    if (!installation) {
      throw new Error(`No installation found for companyId=${companyId}`)
    }
    
    // Import the backfill function dynamically to avoid circular dependencies
    const { performBackfill } = await import('@/lib/backfill')
    
    // Perform backfill directly (no HTTP request needed)
    const result = await performBackfill(companyId, installation.accessToken, 7)
    
    console.log(`✅ Backfill complete for companyId=${companyId}: ${result.daysWritten} days`)
  } catch (error) {
    console.error(`❌ Backfill error for companyId=${companyId}:`, error)
    throw error
  }
}

/**
 * Handle membership.activated event
 * This fires when a user gets access to a product via Access Pass (Pro/Business)
 * 
 * IMPORTANT: For company apps, Access Passes are for upgrading existing installations,
 * NOT for creating new ones. The app.installed webhook creates installations.
 * 
 * Access Pass membership gives a user access to features in an already-installed app.
 */
async function handleMembershipActivated(data: any) {
  // Extract from both old and new webhook formats
  const user = data.user
  const product = data.product
  const company = data.company
  const company_id = company?.id || data.company_id
  const status = data.status
  const access_pass = data.access_pass
  const membershipId = data.id
  const experience = data.experience

  console.log('[WHOP] membership.activated webhook received:', {
    user_id: user?.id,
    company_id,
    company_title: company?.title,
    product_title: product?.title,
    access_pass: access_pass?.id,
    membership_id: membershipId,
    experience_id: experience?.id,
  })
  
  // Log FULL webhook data for debugging
  console.log('[WHOP] Full webhook data:', JSON.stringify(data, null, 2))

  // For company apps with Access Passes, we need to update the installation
  // where the app is actually installed (found via experienceId)
  
  // Determine plan from access pass or product name
  const productTitle = product?.title || access_pass?.name || ''
  let plan = 'free'
  
  if (productTitle.includes('Pro')) {
    plan = 'pro'
  } else if (productTitle.includes('Business')) {
    plan = 'business'
  }

  console.log(`[WHOP] Product: "${productTitle}" → plan=${plan}`)

  // CRITICAL: For Access Pass memberships, the company_id is the PURCHASING company,
  // NOT necessarily where the app is installed!
  // 
  // Strategy to find the correct installation:
  // 1. Try by experienceId (if provided - for company apps accessed via iframe)
  // 2. Try ALL installations and find one with matching user ID (user is consistent)
  // 3. Fall back to company_id from webhook (might create duplicate if wrong company)
  
  let installation = null
  
  // Priority 1: experienceId (most reliable for company apps)
  if (experience?.id) {
    installation = await prisma.whopInstallation.findFirst({
      where: { experienceId: experience.id },
    })
    
    if (installation) {
      console.log(`[WHOP] ✅ Found installation via experienceId: ${experience.id} → companyId: ${installation.companyId}`)
    }
  }
  
  // Priority 2: Find by user ID (user purchases across companies)
  if (!installation && user?.id) {
    console.log(`[WHOP] No experience ID, searching for installation with userId: ${user.id}`)
    
    // Find installation by userId
    installation = await prisma.whopInstallation.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }, // Get most recent if multiple
    })
    
    if (installation) {
      console.log(`[WHOP] ✅ Found installation via userId: ${user.id} → companyId: ${installation.companyId}`)
    } else {
      console.warn(`[WHOP] ⚠️  No installation found for userId: ${user.id}`)
    }
  }
  
  // Priority 3: Fall back to company_id from webhook (might be wrong company!)
  if (!installation && company_id) {
    installation = await prisma.whopInstallation.findFirst({
      where: { companyId: company_id },
      orderBy: { updatedAt: 'desc' },
    })
    
    if (installation) {
      console.log(`[WHOP] Found installation via webhook company_id: ${company_id}`)
    }
  }

  if (installation && user?.id) {
    // USER-LEVEL PLAN: Update UserPlan table (applies to ALL companies for this user)
    const { setUserPlan } = await import('@/lib/plan')
    await setUserPlan(user.id, plan as 'free' | 'pro' | 'business')
    console.log(`[WHOP] ✅ Updated USER-LEVEL plan for user ${user.id} to ${plan} (applies to all companies)`)
    
    // Get all installations for this user to reset proWelcomeShownAt
    const allUserInstallations = await prisma.whopInstallation.findMany({
      where: { userId: user.id },
    })
    
    // If upgrading to Pro/Business, reset proWelcomeShownAt for ALL installations
    // so the welcome modal shows in each company dashboard
    if (plan === 'pro' || plan === 'business') {
      try {
        const { setCompanyPrefs } = await import('@/lib/company')
        for (const inst of allUserInstallations) {
          await setCompanyPrefs(inst.companyId, { proWelcomeShownAt: null })
        }
        console.log(`[WHOP] ✅ Reset proWelcomeShownAt for ${allUserInstallations.length} installation(s) to trigger Pro welcome modal`)
      } catch (prefsError) {
        console.error(`[WHOP] Error resetting proWelcomeShownAt:`, prefsError)
        // Don't fail the webhook if this fails
      }
    }
  } else {
    // No installation found - DON'T create from membership webhook
    // 
    // IMPORTANT: When purchasing Access Passes, Whop may create Experiences 
    // for the seller's company (e.g., "Quantivo Solutions"), which is NOT where
    // the app is installed. We should NOT create installations for these.
    //
    // Installations should ONLY be created via:
    // 1. app.installed webhook (when user installs the app)
    // 2. OAuth callback (when user logs in)
    // 3. Auto-creation in Experience/Dashboard View (when user accesses app)
    //
    // This prevents creating installations for seller company Experiences that appear
    // as empty Whops in the sidebar.
    console.warn(`[WHOP] ⚠️  No installation found for membership.activated webhook`)
    console.warn(`[WHOP] ⚠️  NOT creating installation - waiting for app.installed webhook or user login`)
    console.warn(`[WHOP] ⚠️  User should access the app via Experience View to trigger installation creation`)
    
    // Log details for debugging
    if (experience?.id) {
      console.log(`[WHOP] Experience ID in webhook: ${experience.id} (may be seller's company, not buyer's)`)
    }
    if (company_id) {
      console.log(`[WHOP] Company ID in webhook: ${company_id}`)
    }
    if (user?.id) {
      console.log(`[WHOP] User ID: ${user.id}`)
    }
    
    // Plan will be synced when user accesses the app via Experience View or logs in
  }
}

/**
 * Handle membership.went_invalid / membership.deactivated event
 * This fires when a user cancels or subscription expires
 */
async function handleMembershipCancelled(data: any) {
  try {
    // Extract userId from multiple possible locations in webhook payload
    const user = data.user || data.data?.user
    const membership = data.membership || data.data?.membership
    const company = data.company || data.data?.company
    const company_id = company?.id || data.company_id || data.data?.company_id
    const experience = data.experience || data.data?.experience
    const product = data.product || data.data?.product

    // Try multiple paths for userId (Whop webhooks vary in structure)
    const userId = 
      user?.id || 
      user?.user_id ||
      membership?.user_id ||
      membership?.userId ||
      membership?.user?.id ||
      data.user_id ||
      data.userId ||
      data.data?.user_id ||
      data.data?.userId ||
      null

    console.log('[WHOP] ===== MEMBERSHIP CANCELLATION WEBHOOK =====')
    console.log('[WHOP] membership.deactivated webhook received:', {
      user_id: userId,
      company_id,
      company_title: company?.title,
      product_title: product?.title,
      experience_id: experience?.id,
      webhook_keys: Object.keys(data),
      has_data_wrapper: !!data.data,
    })
    
    // Log full webhook payload for debugging
    console.log('[WHOP] Full membership cancellation webhook payload:', JSON.stringify(data, null, 2))
    
    // Also log nested structures that might contain userId
    if (data.membership || data.data?.membership) {
      console.log('[WHOP] Membership object:', JSON.stringify(data.membership || data.data?.membership, null, 2))
    }
    if (data.user || data.data?.user) {
      console.log('[WHOP] User object:', JSON.stringify(data.user || data.data?.user, null, 2))
    }

  // CRITICAL: Update UserPlan even if installation isn't found
  // The userId is the key - we can update the plan directly
  if (userId) {
    try {
      // USER-LEVEL PLAN: Update UserPlan table to 'free' (applies to ALL companies for this user)
      const { setUserPlan } = await import('@/lib/plan')
      await setUserPlan(userId, 'free')
      console.log(`[WHOP] ✅ Downgraded USER-LEVEL plan for user ${userId} to free (applies to all companies)`)
      
      // Get all installations for this user to reset onboarding
      const userInstallations = await prisma.whopInstallation.findMany({
        where: { userId },
      })
      
      console.log(`[WHOP] Found ${userInstallations.length} installation(s) for user ${userId}`)
      
      // Reset onboarding for all installations (user cancelled, may want to re-onboard)
      if (userInstallations.length > 0) {
        try {
          const { setCompanyPrefs } = await import('@/lib/company')
          for (const inst of userInstallations) {
            await setCompanyPrefs(inst.companyId, { completedAt: null })
          }
          console.log(`[WHOP] ✅ Reset onboarding for ${userInstallations.length} installation(s) after cancellation`)
        } catch (prefsError) {
          console.error(`[WHOP] Error resetting onboarding on cancellation:`, prefsError)
        }
      }
    } catch (planError) {
      console.error(`[WHOP] ❌ Error updating user plan to free:`, planError)
      throw planError
    }
  } else {
    // Try to find userId from installation lookup as fallback
    console.log('[WHOP] ⚠️ No userId found in webhook payload, attempting to find via installation lookup...')
    
    let installation = null
    
    // Priority 1: experienceId
    if (experience?.id) {
      installation = await prisma.whopInstallation.findFirst({
        where: { experienceId: experience.id },
      })
      
      if (installation) {
        console.log(`[WHOP] ✅ Found installation via experienceId: ${experience.id}, userId: ${installation.userId}`)
      }
    }
    
    // Priority 2: company_id from webhook
    if (!installation && company_id) {
      installation = await prisma.whopInstallation.findFirst({
        where: { companyId: company_id },
        orderBy: { updatedAt: 'desc' },
      })
      
      if (installation) {
        console.log(`[WHOP] Found installation via webhook company_id: ${company_id}, userId: ${installation.userId}`)
      }
    }
    
    // Priority 3: Try to find by membership.user_id if available
    if (!installation && membership?.user_id) {
      installation = await prisma.whopInstallation.findFirst({
        where: { userId: membership.user_id },
        orderBy: { updatedAt: 'desc' },
      })
      
      if (installation) {
        console.log(`[WHOP] Found installation via membership.user_id: ${membership.user_id}`)
      }
    }
    
    // If we found installation with userId, update plan
    if (installation?.userId) {
      try {
        const { setUserPlan } = await import('@/lib/plan')
        await setUserPlan(installation.userId, 'free')
        console.log(`[WHOP] ✅ Downgraded USER-LEVEL plan for user ${installation.userId} to free (found via installation lookup)`)
        
        // Also update installation.updatedAt to trigger any UI updates
        try {
          await prisma.whopInstallation.update({
            where: {
              companyId_userId: {
                companyId: installation.companyId,
                userId: installation.userId,
              },
            },
            data: {
              updatedAt: new Date(),
            },
          })
          console.log(`[WHOP] ✅ Updated installation timestamp for ${installation.companyId}`)
        } catch (updateError) {
          console.error(`[WHOP] Error updating installation timestamp:`, updateError)
          // Don't fail if this fails
        }
      } catch (planError) {
        console.error(`[WHOP] ❌ Error updating user plan via installation lookup:`, planError)
        throw planError
      }
    } else {
      console.error(`[WHOP] ❌ Cannot downgrade plan: No userId found in webhook payload and no installation found`)
      console.error(`[WHOP] ❌ Webhook data keys:`, Object.keys(data))
      console.error(`[WHOP] ❌ Full webhook data:`, JSON.stringify(data, null, 2))
      
      // Try one more time with a broader search - check all possible userId fields
      const allPossibleUserIds = [
        data.user?.id,
        data.user?.user_id,
        data.membership?.user_id,
        data.membership?.userId,
        data.user_id,
        data.userId,
        data.member?.user_id,
        data.member?.userId,
        data.customer?.id,
        data.customer?.user_id,
      ].filter(Boolean)
      
      console.log(`[WHOP] All possible userIds found:`, allPossibleUserIds)
      
      if (allPossibleUserIds.length > 0) {
        const firstUserId = allPossibleUserIds[0]
        console.log(`[WHOP] Attempting to downgrade with userId: ${firstUserId}`)
        try {
          const { setUserPlan } = await import('@/lib/plan')
          await setUserPlan(firstUserId, 'free')
          console.log(`[WHOP] ✅ Downgraded USER-LEVEL plan for user ${firstUserId} to free (found via broad search)`)
        } catch (planError) {
          console.error(`[WHOP] ❌ Error updating user plan with broad search:`, planError)
        }
      } else {
        // Don't throw error - log it but allow webhook to succeed
        // The plan will be synced when user accesses the dashboard
        console.warn(`[WHOP] ⚠️ Plan downgrade skipped - will sync on next dashboard access`)
      }
    }
  }
}

