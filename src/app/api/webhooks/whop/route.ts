import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import crypto from 'crypto'

export const runtime = 'nodejs'

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
  try {
    // Read raw body first for signature verification
    const rawBody = await request.text()
    
    // Get webhook signature from headers
    const signature = request.headers.get('whop-signature')
    
    // Verify webhook signature if secret is configured
    if (env.WHOP_WEBHOOK_SECRET && env.WHOP_WEBHOOK_SECRET !== '') {
      if (!signature) {
        console.warn('⚠️  Missing webhook signature (WHOP_WEBHOOK_SECRET is set but no signature provided)')
        // Don't reject - allow webhook to proceed for development
      } else if (!verifyWebhookSignature(rawBody, signature)) {
        console.error('❌ Invalid webhook signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 403 }
        )
      } else {
        console.log('✅ Webhook signature verified')
      }
    } else {
      console.warn('⚠️  WHOP_WEBHOOK_SECRET not set, skipping signature verification (NOT RECOMMENDED FOR PRODUCTION)')
    }

    // Parse body after verification
    const body = JSON.parse(rawBody)
    
    // Log the FULL raw body to see structure
    console.log('📦 Raw webhook body:', JSON.stringify(body, null, 2))
    
    // Whop uses different fields for event type:
    // - "action" for some webhooks (e.g., "app_membership.went_valid")
    // - "type" for others (e.g., "membership.activated")
    // - "event" as fallback
    const action = body.action || body.type || body.event
    const data = body.data || body // If data is null, use body itself

    console.log(`📥 Whop webhook action: ${action}`)
    console.log(`📦 Webhook data keys:`, Object.keys(data || {}))

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
      
      default:
        console.log(`ℹ️  Unhandled webhook action: ${action}`)
    }

    return NextResponse.json({ ok: true, action })
  } catch (error) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error instanceof Error ? error.message : String(error) },
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
  const { company_id, experience_id, access_token, plan } = data

  if (!company_id || !access_token) {
    throw new Error('Missing required installation data: company_id or access_token')
  }

  // Check if installation already exists
  const existing = await prisma.whopInstallation.findUnique({
    where: { companyId: company_id },
  })
  
  const isNewInstallation = !existing

  // CRITICAL: Always set plan to 'free' on app.installed webhook
  // Even if webhook sends a plan or existing installation has pro, we reset to 'free'
  // The plan will be updated by membership.activated webhook if user actually has Pro
  // This ensures cancelled memberships don't persist across reinstalls

  // Store installation
  await prisma.whopInstallation.upsert({
    where: { companyId: company_id },
    update: {
      experienceId: experience_id || null,
      accessToken: access_token,
      plan: 'free', // ALWAYS reset to free on install/reinstall
      updatedAt: new Date(),
    },
    create: {
      companyId: company_id,
      experienceId: experience_id || null,
      accessToken: access_token,
      plan: 'free', // Always start with free for new installs
    },
  })

  console.log(`Installed companyId=${company_id}, plan=free (isNew: ${isNewInstallation}), experienceId=${experience_id || 'none'}`)
  
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

  // Delete the installation for this company
  await prisma.whopInstallation.delete({
    where: { companyId: company_id },
  })
  console.log(`Uninstalled companyId=${company_id}`)

  // Also set any other installations for this user to free (in case multiple existed)
  const resolvedUserId = user?.id || user_id
  if (resolvedUserId) {
    const others = await prisma.whopInstallation.findMany({ where: { userId: resolvedUserId } })
    if (others.length > 0) {
      await prisma.whopInstallation.updateMany({
        where: { userId: resolvedUserId },
        data: { plan: 'free', updatedAt: new Date() },
      })
      console.log(`[WHOP] ✅ Downgraded ${others.length} other installation(s) for user ${resolvedUserId} to free after uninstall`)
    }
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
 * Update plan details for the installation
 */
async function handlePlanUpdated(data: any) {
  const { company_id, plan } = data

  if (!company_id) {
    throw new Error('Missing company_id')
  }

  // Normalize plan name to lowercase (free|pro|business)
  let normalizedPlan = null
  if (plan) {
    const planLower = plan.toLowerCase()
    if (planLower === 'pro' || planLower === 'professional') {
      normalizedPlan = 'pro'
    } else if (planLower === 'business' || planLower === 'enterprise') {
      normalizedPlan = 'business'
    } else if (planLower === 'free') {
      normalizedPlan = 'free'
    } else {
      normalizedPlan = planLower
    }
  }

  await prisma.whopInstallation.update({
    where: { companyId: company_id },
    data: {
      plan: normalizedPlan,
      updatedAt: new Date(),
    },
  })

  console.log(`[WHOP] plan update company=${company_id} plan=${normalizedPlan || 'free'}`)
}

/**
 * Trigger a 7-day backfill for a newly installed company
 * Calls the backfill function directly to avoid Vercel auth issues
 */
async function triggerBackfill(companyId: string) {
  try {
    console.log(`📊 Starting 7-day backfill for companyId=${companyId}`)
    
    // Get the installation to fetch the access token
    const installation = await prisma.whopInstallation.findUnique({
      where: { companyId },
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
    installation = await prisma.whopInstallation.findUnique({
      where: { companyId: company_id },
    })
    
    if (installation) {
      console.log(`[WHOP] Found installation via webhook company_id: ${company_id}`)
    }
  }

  if (installation) {
    // Update existing installation with new plan
    // Also check if there are other installations for this user that should be updated
    // If the user has multiple installations, update all that might be related
    const allUserInstallations = await prisma.whopInstallation.findMany({
      where: { userId: user?.id },
    })
    
    // Update the found installation
    await prisma.whopInstallation.update({
      where: { companyId: installation.companyId },
      data: {
        plan,
        updatedAt: new Date(),
      },
    })
    console.log(`[WHOP] ✅ Updated installation ${installation.companyId} to ${plan} plan`)
    
    // If there are multiple installations for this user, update the most recently active one
    // This handles cases where the user has both a personal company and a business company
    if (allUserInstallations.length > 1) {
      // Find the installation that was most recently updated (before this webhook)
      const otherInstallations = allUserInstallations.filter(inst => inst.companyId !== installation.companyId)
      if (otherInstallations.length > 0) {
        // Update the most recently created one (likely the main one)
        const mostRecentOther = otherInstallations.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0]
        
        console.log(`[WHOP] User has multiple installations. Also updating ${mostRecentOther.companyId} to ${plan} plan`)
        await prisma.whopInstallation.update({
          where: { companyId: mostRecentOther.companyId },
          data: {
            plan,
            updatedAt: new Date(),
          },
        })
        console.log(`[WHOP] ✅ Updated additional installation ${mostRecentOther.companyId} to ${plan} plan`)
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
  const user = data.user
  const company = data.company
  const company_id = company?.id || data.company_id
  const experience = data.experience
  const product = data.product

  console.log('[WHOP] membership.deactivated webhook received:', {
    user_id: user?.id,
    company_id,
    company_title: company?.title,
    product_title: product?.title,
    experience_id: experience?.id,
  })

  // Use same lookup strategy as handleMembershipActivated
  let installation = null
  
  // Priority 1: experienceId
  if (experience?.id) {
    installation = await prisma.whopInstallation.findFirst({
      where: { experienceId: experience.id },
    })
    
    if (installation) {
      console.log(`[WHOP] ✅ Found installation via experienceId: ${experience.id}`)
    }
  }
  
  // Priority 2: userId
  if (!installation && user?.id) {
    installation = await prisma.whopInstallation.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })
    
    if (installation) {
      console.log(`[WHOP] ✅ Found installation via userId: ${user.id}`)
    }
  }
  
  // Priority 3: company_id from webhook
  if (!installation && company_id) {
    installation = await prisma.whopInstallation.findUnique({
      where: { companyId: company_id },
    })
    
    if (installation) {
      console.log(`[WHOP] Found installation via webhook company_id: ${company_id}`)
    }
  }

  if (installation) {
    // Update the found installation to free
    await prisma.whopInstallation.update({
      where: { companyId: installation.companyId },
      data: {
        plan: 'free',
        updatedAt: new Date(),
      },
    })
    console.log(`[WHOP] ✅ Downgraded installation ${installation.companyId} to free plan`)
    
    // CRITICAL: Also update ALL other installations for this user to free
    // This ensures consistency across all installations
    if (user?.id) {
      const userInstallations = await prisma.whopInstallation.findMany({
        where: { userId: user.id },
      })
      
      if (userInstallations.length > 1) {
        // Update all other installations to free
        await prisma.whopInstallation.updateMany({
          where: {
            userId: user.id,
            companyId: { not: installation.companyId }, // Exclude the one we already updated
          },
          data: {
            plan: 'free',
            updatedAt: new Date(),
          },
        })
        console.log(`[WHOP] ✅ Downgraded ${userInstallations.length - 1} other installation(s) for user ${user.id} to free plan`)
      }
    }
    
    // Reset onboarding for this installation (user cancelled, may want to re-onboard)
    try {
      const { getCompanyPrefs, setCompanyPrefs } = await import('@/lib/company')
      await setCompanyPrefs(installation.companyId, { completedAt: null })
      console.log(`[WHOP] ✅ Reset onboarding for cancelled installation: ${installation.companyId}`)
    } catch (prefsError) {
      console.error(`[WHOP] Error resetting onboarding on cancellation:`, prefsError)
    }
  } else {
    console.error(`[WHOP] ❌ No installation found to downgrade for user ${user?.id}`)
  }
}

