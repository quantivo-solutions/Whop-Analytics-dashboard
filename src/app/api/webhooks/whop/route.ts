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
    const { event, data } = body

    console.log(`📥 Whop webhook: ${event}`)

    switch (event) {
      case 'app.installed':
        await handleAppInstalled(data)
        break
      
      case 'app.uninstalled':
        await handleAppUninstalled(data)
        break
      
      case 'app.plan.updated':
        await handlePlanUpdated(data)
        break
      
      // Handle product membership events (for direct purchases)
      case 'membership.went_valid':
      case 'membership.activated':
        await handleMembershipActivated(data)
        break
      
      case 'membership.went_invalid':
      case 'membership.cancelled':
        await handleMembershipCancelled(data)
        break
      
      default:
        console.log(`ℹ️  Unhandled webhook event: ${event}`)
    }

    return NextResponse.json({ ok: true, event })
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

  // Store installation
  await prisma.whopInstallation.upsert({
    where: { companyId: company_id },
    update: {
      experienceId: experience_id || null,
      accessToken: access_token,
      plan: plan || null,
      updatedAt: new Date(),
    },
    create: {
      companyId: company_id,
      experienceId: experience_id || null,
      accessToken: access_token,
      plan: plan || null,
    },
  })

  console.log(`Installed companyId=${company_id}, plan=${plan || 'none'}, experienceId=${experience_id || 'none'}`)

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
  const { company_id } = data

  if (!company_id) {
    throw new Error('Missing company_id')
  }

  await prisma.whopInstallation.delete({
    where: { companyId: company_id },
  })

  console.log(`Uninstalled companyId=${company_id}`)
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
  const { user, product, company_id, status, access_pass, id: membershipId, experience } = data

  console.log('[WHOP] membership.activated webhook received:', {
    user_id: user?.id,
    company_id,
    product: product?.name,
    access_pass: access_pass?.id,
    membership_id: membershipId,
    experience_id: experience?.id,
  })
  
  // Log FULL webhook data for debugging
  console.log('[WHOP] Full webhook data:', JSON.stringify(data, null, 2))

  // For company apps with Access Passes, we need to update the installation
  // where the app is actually installed (found via experienceId)
  
  // Determine plan from access pass or product name
  const accessPassName = access_pass?.name || product?.name || ''
  let plan = 'free'
  
  if (accessPassName.includes('Pro')) {
    plan = 'pro'
  } else if (accessPassName.includes('Business')) {
    plan = 'business'
  }

  console.log(`[WHOP] Access Pass activated: "${accessPassName}" → plan=${plan}`)

  // Try to find installation by experienceId (for company apps)
  let installation = null
  if (experience?.id) {
    installation = await prisma.whopInstallation.findFirst({
      where: { experienceId: experience.id },
    })
    
    if (installation) {
      console.log(`[WHOP] Found installation via experienceId: ${experience.id} → companyId: ${installation.companyId}`)
    }
  }
  
  // If no installation found via experience, try by company_id
  if (!installation && company_id) {
    installation = await prisma.whopInstallation.findUnique({
      where: { companyId: company_id },
    })
    
    if (installation) {
      console.log(`[WHOP] Found installation via company_id: ${company_id}`)
    }
  }
  
  // If still no installation, try by user.id as fallback
  if (!installation && user?.id) {
    installation = await prisma.whopInstallation.findUnique({
      where: { companyId: user.id },
    })
    
    if (installation) {
      console.log(`[WHOP] Found installation via user.id: ${user.id}`)
    }
  }

  if (installation) {
    // Update existing installation with new plan
    await prisma.whopInstallation.update({
      where: { companyId: installation.companyId },
      data: {
        plan,
        updatedAt: new Date(),
      },
    })
    console.log(`[WHOP] ✅ Updated installation ${installation.companyId} to ${plan} plan`)
  } else {
    // No installation found - since we don't have app.installed webhook,
    // we need to create it here using the best company_id we can determine
    console.warn(`[WHOP] ⚠️  No installation found, creating from membership data...`)
    
    // Priority for determining company_id:
    // 1. company_id from webhook (if it's NOT the user's personal company)
    // 2. User's id as fallback
    let installationCompanyId = company_id || user?.id
    
    if (installationCompanyId) {
      await prisma.whopInstallation.create({
        data: {
          companyId: installationCompanyId,
          experienceId: experience?.id || null,
          accessToken: '', // Will be populated on OAuth login
          plan,
        },
      })
      console.log(`[WHOP] ✅ Created installation for ${installationCompanyId} with ${plan} plan from membership webhook`)
    } else {
      console.error(`[WHOP] ❌ Cannot create installation - no company_id or user.id in webhook data!`)
    }
  }
}

/**
 * Handle membership.went_invalid event
 * This fires when a user cancels or subscription expires
 */
async function handleMembershipCancelled(data: any) {
  const { user, company_id } = data

  if (!user?.id && !company_id) {
    console.error('Missing user or company_id in membership cancellation webhook')
    return
  }

  const companyId = company_id || user.id

  console.log(`[WHOP] membership cancelled: company=${companyId} → reverting to free`)

  // Check if user has any other active Pro/Business memberships
  // For now, just set to free - could enhance to check all memberships
  await prisma.whopInstallation.update({
    where: { companyId },
    data: {
      plan: 'free',
      updatedAt: new Date(),
    },
  })
}

