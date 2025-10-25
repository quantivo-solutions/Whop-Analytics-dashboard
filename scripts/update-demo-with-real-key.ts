/**
 * Update demo_company WhopInstallation with real API key
 * Run this to connect your production Whop data to the dashboard
 */

import { prisma } from '../src/lib/prisma'
import { env } from '../src/lib/env'

async function main() {
  console.log('\n🔧 Updating demo_company with real Whop API key...\n')

  const apiKey = env.WHOP_APP_SERVER_KEY

  if (!apiKey) {
    console.error('❌ Error: WHOP_APP_SERVER_KEY not found in environment')
    console.error('   Make sure it\'s set in your .env or Vercel environment\n')
    process.exit(1)
  }

  console.log(`✅ Found API key (length: ${apiKey.length})`)

  try {
    const installation = await prisma.whopInstallation.update({
      where: { companyId: 'demo_company' },
      data: {
        accessToken: apiKey,
        plan: 'production',
        updatedAt: new Date(),
      },
    })

    console.log('\n✅ Successfully updated demo_company installation!')
    console.log(`   Company ID: ${installation.companyId}`)
    console.log(`   Plan: ${installation.plan}`)
    console.log(`   Updated: ${installation.updatedAt}`)

    console.log('\n📊 Next: Trigger a backfill to fetch real data:')
    console.log('   Run this command:')
    console.log('   npm run test:backfill\n')

  } catch (error) {
    console.error('\n❌ Error updating installation:',error)
    
    // If demo_company doesn't exist, create it
    console.log('\n💡 demo_company not found. Creating it...')
    
    try {
      const newInstallation = await prisma.whopInstallation.create({
        data: {
          companyId: 'demo_company',
          accessToken: apiKey,
          experienceId: 'demo_experience',
          plan: 'production',
        },
      })
      
      console.log('\n✅ Created new installation for demo_company!')
      console.log(`   Company ID: ${newInstallation.companyId}`)
    } catch (createError) {
      console.error('\n❌ Failed to create installation:', createError)
      process.exit(1)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main()

