/**
 * Script to diagnose and fix installation for a specific company
 * Usage: node scripts/fix-installation.mjs biz_jjFeUmtshsC1pr
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixInstallation() {
  const companyId = process.argv[2]
  
  if (!companyId) {
    console.error('❌ Usage: node scripts/fix-installation.mjs <companyId>')
    console.log('\nExample:')
    console.log('  node scripts/fix-installation.mjs biz_jjFeUmtshsC1pr')
    process.exit(1)
  }
  
  console.log(`🔧 Diagnosing installation for companyId: ${companyId}\n`)
  
  try {
    // Check if installation exists
    const installation = await prisma.whopInstallation.findUnique({
      where: { companyId },
    })
    
    console.log('📋 Current Installation Status:')
    console.log(installation ? JSON.stringify(installation, null, 2) : '❌ No installation found')
    console.log('')
    
    // Check for conflicting experienceIds
    if (installation?.experienceId) {
      const conflict = await prisma.whopInstallation.findFirst({
        where: {
          experienceId: installation.experienceId,
          companyId: { not: companyId },
        },
      })
      
      if (conflict) {
        console.log('⚠️  CONFLICT DETECTED:')
        console.log(`   ExperienceId ${installation.experienceId} is used by another company: ${conflict.companyId}`)
        console.log('')
        console.log('🔧 Fixing conflict by clearing experienceId...')
        
        await prisma.whopInstallation.update({
          where: { companyId },
          data: { experienceId: null },
        })
        
        console.log('✅ ExperienceId cleared - installation should work now')
      } else {
        console.log('✅ No experienceId conflicts found')
      }
    }
    
    // Check for CompanyPrefs
    const prefs = await prisma.companyPrefs.findUnique({
      where: { companyId },
    })
    
    if (!prefs) {
      console.log('⚠️  No CompanyPrefs found - creating...')
      await prisma.companyPrefs.create({
        data: {
          companyId,
          goalAmount: null,
          wantsDailyMail: false,
          wantsDiscord: false,
          completedAt: null,
          proWelcomeShownAt: null,
        },
      })
      console.log('✅ CompanyPrefs created')
    } else {
      console.log('✅ CompanyPrefs exists')
    }
    
    // Check for data
    const dataCount = await prisma.metricsDaily.count({
      where: { companyId },
    })
    
    console.log(`📊 Metrics data count: ${dataCount}`)
    
    // Final status
    console.log('\n✅ Diagnosis complete!')
    console.log('\n📝 Next steps:')
    console.log('1. Try installing the app again on this company')
    console.log('2. Check Vercel logs for any errors')
    console.log('3. If it still fails, check OAuth callback logs')
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

fixInstallation().catch(console.error)

