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
    if (env.WHOP_WEBHOOK_SECRET) {
      if (!signature) {
        console.error('Missing webhook signature')
        return NextResponse.json(
          { error: 'Missing signature' },
          { status: 401 }
        )
      }
      
      if (!verifyWebhookSignature(rawBody, signature)) {
        console.error('Invalid webhook signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 403 }
        )
      }
    } else {
      console.warn('⚠️  WHOP_WEBHOOK_SECRET not set, skipping signature verification')
      // TODO: Add webhook signature verification once WHOP_WEBHOOK_SECRET is configured
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

  await prisma.whopInstallation.update({
    where: { companyId: company_id },
    data: {
      plan: plan || null,
      updatedAt: new Date(),
    },
  })

  console.log(`Plan updated companyId=${company_id}, plan=${plan || 'none'}`)
}

/**
 * Trigger a 7-day backfill for a newly installed company
 * Calls our own backfill endpoint internally
 */
async function triggerBackfill(companyId: string) {
  try {
    console.log(`📊 Starting 7-day backfill for companyId=${companyId}`)
    
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000'
    
    const url = `${baseUrl}/api/ingest/whop/backfill?companyId=${companyId}&days=7&secret=${env.CRON_SECRET}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Backfill request failed: ${response.status} ${error}`)
    }
    
    const result = await response.json()
    console.log(`✅ Backfill complete for companyId=${companyId}: ${result.daysWritten || 0} days`)
  } catch (error) {
    console.error(`❌ Backfill error for companyId=${companyId}:`, error)
    throw error
  }
}

