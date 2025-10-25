#!/usr/bin/env node

/**
 * Setup real Whop installation in production database
 * This creates a WhopInstallation record with your real API key
 * so the backfill can fetch actual data from Whop
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n🔧 Setting up real Whop installation in production...\n')

  // Your real API key should be passed as environment variable
  const apiKey = process.env.WHOP_APP_SERVER_KEY

  if (!apiKey) {
    console.error('❌ Error: WHOP_APP_SERVER_KEY environment variable not set')
    console.error('\n💡 Usage:')
    console.error('   WHOP_APP_SERVER_KEY=your_key_here node scripts/setup-whop-real.mjs\n')
    process.exit(1)
  }

  console.log(`✅ Found API key (length: ${apiKey.length})`)

  // Create or update installation with your real company ID
  const companyId = 'real_whop_company'

  try {
    const installation = await prisma.whopInstallation.upsert({
      where: { companyId },
      update: {
        accessToken: apiKey,
        plan: 'production',
        updatedAt: new Date(),
      },
      create: {
        companyId,
        accessToken: apiKey,
        experienceId: 'real_whop_experience',
        plan: 'production',
      },
    })

    console.log('\n✅ WhopInstallation created/updated successfully!')
    console.log(`   Company ID: ${installation.companyId}`)
    console.log(`   Plan: ${installation.plan}`)
    console.log(`   Created: ${installation.createdAt}`)

    console.log('\n📊 Next steps:')
    console.log('   1. Trigger backfill manually:')
    console.log(`      curl -X POST "https://your-app.vercel.app/api/ingest/whop/backfill?secret=YOUR_CRON_SECRET&days=7&companyId=${companyId}"`)
    console.log('\n   2. Check your dashboard at:')
    console.log('      https://your-app.vercel.app/dashboard')
    console.log('\n   3. Monitor the backfill logs in Vercel')

  } catch (error) {
    console.error('\n❌ Error creating installation:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

