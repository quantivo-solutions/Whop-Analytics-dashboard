#!/usr/bin/env node

/**
 * Backfill Script for All Existing Installations
 * 
 * This script backfills historical data for all existing Whop installations.
 * Run this once after deploying the tenant-correct backfill fixes.
 * 
 * Usage:
 *   node scripts/backfill-all-installations.mjs
 * 
 * Requires:
 *   - CRON_SECRET environment variable
 *   - NEXT_PUBLIC_APP_URL or VERCEL_URL environment variable
 *   - Database connection (via Prisma)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CRON_SECRET = process.env.CRON_SECRET
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 
                (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                'https://whop-analytics-dashboard-omega.vercel.app'

if (!CRON_SECRET) {
  console.error('❌ Error: CRON_SECRET environment variable is required')
  process.exit(1)
}

async function backfillAllInstallations() {
  console.log('🚀 Starting backfill for all existing installations...')
  console.log(`📡 App URL: ${APP_URL}`)
  
  try {
    // Get all installations with access tokens
    const installations = await prisma.whopInstallation.findMany({
      where: {
        accessToken: { not: '' },
      },
      select: {
        companyId: true,
        userId: true,
        experienceName: true,
      },
    })

    console.log(`📊 Found ${installations.length} installations to backfill`)

    if (installations.length === 0) {
      console.log('✅ No installations found. Nothing to backfill.')
      return
    }

    const results = []

    for (const installation of installations) {
      const { companyId } = installation
      console.log(`\n🔄 Processing installation: ${companyId}...`)

      try {
        // Use the existing backfill endpoint (bootstrap route may not be deployed yet)
        const backfillUrl = new URL('/api/ingest/whop/backfill', APP_URL)
        backfillUrl.searchParams.set('secret', CRON_SECRET)
        backfillUrl.searchParams.set('companyId', companyId)
        backfillUrl.searchParams.set('days', '90') // Backfill last 90 days

        console.log(`  📡 Calling backfill endpoint...`)
        const response = await fetch(backfillUrl.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const result = await response.json()
        console.log(`  ✅ Success: ${result.message}`)
        
        results.push({
          companyId,
          success: true,
          daysWritten: result.daysWritten || result.daysWritten || 0,
          totalDays: result.totalDays || result.totalDays || 0,
        })

        // Rate limit: wait 1 second between installations to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`  ❌ Error backfilling ${companyId}:`, error.message)
        results.push({
          companyId,
          success: false,
          error: error.message,
        })
      }
    }

    // Summary
    console.log('\n📊 Backfill Summary:')
    console.log('='.repeat(60))
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    console.log(`✅ Successful: ${successful}`)
    console.log(`❌ Failed: ${failed}`)
    
    if (successful > 0) {
      const totalDaysWritten = results
        .filter(r => r.success)
        .reduce((sum, r) => sum + (r.daysWritten || 0), 0)
      console.log(`📈 Total days written: ${totalDaysWritten}`)
    }

    if (failed > 0) {
      console.log('\n❌ Failed installations:')
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.companyId}: ${r.error}`)
        })
    }

    console.log('='.repeat(60))
  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
backfillAllInstallations()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })

