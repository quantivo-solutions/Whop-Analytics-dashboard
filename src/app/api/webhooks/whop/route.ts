import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { WHOP_WEBHOOK_SECRET } from '@/lib/env'
import crypto from 'crypto'

export const runtime = 'nodejs'

/**
 * Whop Webhook Handler
 * 
 * Handles app installation, uninstallation, and updates from Whop.
 * Verifies webhook signatures for security.
 * 
 * Events:
 * - app.installed: Store new installation
 * - app.uninstalled: Remove installation
 * - app.updated: Update installation details
 */
export async function POST(request: Request) {
  try {
    // Get webhook signature from headers
    const signature = request.headers.get('x-whop-signature')
    const timestamp = request.headers.get('x-whop-timestamp')
    
    if (!signature || !timestamp) {
      console.error('Missing webhook signature or timestamp')
      return NextResponse.json(
        { error: 'Missing signature headers' },
        { status: 401 }
      )
    }

    // Read raw body
    const rawBody = await request.text()
    
    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature, timestamp)) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse body after verification
    const body = JSON.parse(rawBody)
    const { event, data } = body

    console.log('📥 Whop webhook received:', event)

    switch (event) {
      case 'app.installed':
        await handleAppInstalled(data)
        break
      
      case 'app.uninstalled':
        await handleAppUninstalled(data)
        break
      
      case 'app.updated':
        await handleAppUpdated(data)
        break
      
      default:
        console.log('ℹ️  Unhandled webhook event:', event)
    }

    return NextResponse.json({ ok: true, event })
  } catch (error) {
    console.error('❌ Error processing Whop webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Verify webhook signature using HMAC SHA-256
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  if (!WHOP_WEBHOOK_SECRET) {
    console.warn('⚠️  WHOP_WEBHOOK_SECRET not set, skipping signature verification')
    return true // Allow in development
  }

  try {
    const signedPayload = `${timestamp}.${payload}`
    const expectedSignature = crypto
      .createHmac('sha256', WHOP_WEBHOOK_SECRET)
      .update(signedPayload)
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
 */
async function handleAppInstalled(data: any) {
  const { company_id, experience_id, access_token, plan } = data

  if (!company_id || !experience_id || !access_token) {
    throw new Error('Missing required installation data')
  }

  console.log('✅ Installing app for company:', company_id)

  await prisma.whopInstallation.upsert({
    where: { companyId: company_id },
    update: {
      experienceId: experience_id,
      accessToken: access_token,
      plan: plan || null,
      updatedAt: new Date(),
    },
    create: {
      companyId: company_id,
      experienceId: experience_id,
      accessToken: access_token,
      plan: plan || null,
    },
  })

  console.log('✅ App installed successfully for company:', company_id)
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

  console.log('🗑️  Uninstalling app for company:', company_id)

  await prisma.whopInstallation.delete({
    where: { companyId: company_id },
  })

  console.log('✅ App uninstalled successfully for company:', company_id)
}

/**
 * Handle app.updated event
 * Update installation details (e.g., plan changes)
 */
async function handleAppUpdated(data: any) {
  const { company_id, experience_id, access_token, plan } = data

  if (!company_id) {
    throw new Error('Missing company_id')
  }

  console.log('🔄 Updating app for company:', company_id)

  await prisma.whopInstallation.update({
    where: { companyId: company_id },
    data: {
      experienceId: experience_id || undefined,
      accessToken: access_token || undefined,
      plan: plan || null,
      updatedAt: new Date(),
    },
  })

  console.log('✅ App updated successfully for company:', company_id)
}

