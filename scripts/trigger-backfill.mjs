#!/usr/bin/env node

/**
 * Manually trigger backfill for a specific company
 * 
 * Usage:
 *   node scripts/trigger-backfill.mjs <companyId> [days]
 * 
 * Example:
 *   node scripts/trigger-backfill.mjs biz_CGpV4KE2L63BYD 90
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

const CRON_SECRET = process.env.CRON_SECRET
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 
                (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                'https://whop-analytics-dashboard-omega.vercel.app'

// Force production URL for backfill scripts
const BACKFILL_URL = APP_URL.includes('localhost') 
  ? 'https://whop-analytics-dashboard-omega.vercel.app'
  : APP_URL

const companyId = process.argv[2]
const days = process.argv[3] || '90'

if (!CRON_SECRET) {
  console.error('❌ Error: CRON_SECRET environment variable is required')
  process.exit(1)
}

if (!companyId) {
  console.error('❌ Error: Company ID is required')
  console.error('Usage: node scripts/trigger-backfill.mjs <companyId> [days]')
  process.exit(1)
}

async function triggerBackfill() {
  console.log(`🚀 Triggering backfill for company: ${companyId}`)
  console.log(`📡 App URL: ${BACKFILL_URL}`)
  console.log(`📅 Days: ${days}`)
  
  try {
    const backfillUrl = new URL('/api/ingest/whop/backfill', BACKFILL_URL)
    backfillUrl.searchParams.set('secret', CRON_SECRET)
    backfillUrl.searchParams.set('companyId', companyId)
    backfillUrl.searchParams.set('days', days)
    
    console.log(`\n📡 Calling backfill endpoint...`)
    const response = await fetch(backfillUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }
    
    const result = await response.json()
    console.log(`\n✅ Success!`)
    console.log(`   Message: ${result.message}`)
    console.log(`   Days written: ${result.daysWritten || result.daysWritten || 0}`)
    console.log(`   Total days: ${result.totalDays || result.totalDays || 0}`)
  } catch (error) {
    console.error(`\n❌ Error:`, error.message)
    process.exit(1)
  }
}

triggerBackfill()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })

