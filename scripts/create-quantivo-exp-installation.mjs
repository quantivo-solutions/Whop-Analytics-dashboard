import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const quantivoExperienceId = 'exp_75NS2OapWFc535'
    const quantivoCompanyId = 'biz_CGpV4KE2L63BYD'
    const quantivoUserId = 'user_CjCXi3vpQWbhj' // Your user ID
    
    console.log('🔧 Creating/Updating Quantivo Solutions installation...\n')
    
    // Get access token from an existing installation (or use server key as fallback)
    const existingInstallation = await prisma.whopInstallation.findFirst({
      where: { userId: quantivoUserId },
      orderBy: { updatedAt: 'desc' }
    })
    
    const accessToken = existingInstallation?.accessToken || process.env.WHOP_APP_SERVER_KEY || ''
    
    if (!accessToken) {
      console.error('❌ No access token available. Please set WHOP_APP_SERVER_KEY or ensure you have an existing installation.')
      process.exit(1)
    }
    
    // Check if installation exists
    const existing = await prisma.whopInstallation.findFirst({
      where: { 
        OR: [
          { companyId: quantivoCompanyId },
          { experienceId: quantivoExperienceId }
        ]
      }
    })

    if (existing) {
      console.log('⚠️  Installation already exists, updating it...')
      console.log(`   Current: companyId=${existing.companyId}, experienceId=${existing.experienceId}`)
      
      await prisma.whopInstallation.update({
        where: { id: existing.id },
        data: {
          companyId: quantivoCompanyId,
          experienceId: quantivoExperienceId,
          userId: quantivoUserId,
          plan: 'free', // Start with free, will be updated by webhook if Pro
          accessToken: accessToken,
          updatedAt: new Date()
        }
      })
      
      console.log('✅ Updated!')
    } else {
      console.log('Creating new installation for Quantivo Solutions...')
      
      await prisma.whopInstallation.create({
        data: {
          companyId: quantivoCompanyId,
          userId: quantivoUserId,
          experienceId: quantivoExperienceId,
          plan: 'free', // Start with free
          accessToken: accessToken,
        }
      })
      
      console.log('✅ Created!')
    }

    // Ensure CompanyPrefs exists
    const prefs = await prisma.companyPrefs.upsert({
      where: { companyId: quantivoCompanyId },
      update: {},
      create: {
        companyId: quantivoCompanyId,
        goalAmount: null,
        completedAt: null,
        proWelcomeShownAt: null,
      }
    })
    console.log(`✅ CompanyPrefs ensured (goal: ${prefs.goalAmount || 'not set'})`)

    // Verify
    const result = await prisma.whopInstallation.findUnique({
      where: { companyId: quantivoCompanyId }
    })

    console.log('\n📊 Quantivo Installation:')
    console.log('─'.repeat(60))
    console.log(`Company ID: ${result.companyId}`)
    console.log(`Experience ID: ${result.experienceId}`)
    console.log(`User ID: ${result.userId}`)
    console.log(`Plan: ${result.plan}`)
    console.log(`Has Access Token: ${result.accessToken ? '✅ Yes' : '❌ No'}`)
    console.log(`Created: ${result.createdAt.toISOString()}`)
    console.log(`Updated: ${result.updatedAt.toISOString()}`)
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ Installation created/updated successfully!')
    console.log('\n💡 Dashboard URLs:')
    console.log(`   Dashboard View: https://whop-analytics-dashboard-omega.vercel.app/dashboard/${quantivoCompanyId}`)
    console.log(`   Experience View: https://whop-analytics-dashboard-omega.vercel.app/experiences/${quantivoExperienceId}`)
    console.log(`   Or via Whop: https://whop.com/joined/quantivo-solutions/${quantivoExperienceId}/app/`)
    console.log('='.repeat(60))
    console.log('\n⚠️  Note: You may need to trigger a backfill to fetch historical data:')
    console.log(`   curl -X POST "https://whop-analytics-dashboard-omega.vercel.app/api/ingest/whop/backfill?secret=${process.env.CRON_SECRET || 'YOUR_SECRET'}&companyId=${quantivoCompanyId}&days=7"`)

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
