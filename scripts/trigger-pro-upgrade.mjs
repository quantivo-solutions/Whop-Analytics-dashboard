/**
 * Manual Pro Upgrade Script
 * 
 * This script manually updates a user's plan to "pro" in the database.
 * Use this when webhooks aren't firing or for testing purposes.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function upgradeToPro() {
  console.log('🔧 Manual Pro Upgrade Script\n')
  
  // Get the company ID from command line or use default
  const companyId = process.argv[2]
  
  if (!companyId) {
    console.error('❌ Error: Please provide a companyId')
    console.log('\nUsage:')
    console.log('  node scripts/trigger-pro-upgrade.mjs <companyId>')
    console.log('\nExample:')
    console.log('  node scripts/trigger-pro-upgrade.mjs biz_CGpV4KE2L63BYD')
    console.log('\nOr to see all installations:')
    console.log('  node scripts/trigger-pro-upgrade.mjs list')
    process.exit(1)
  }
  
  if (companyId === 'list') {
    console.log('📋 Listing all installations:\n')
    const installations = await prisma.whopInstallation.findMany()
    
    if (installations.length === 0) {
      console.log('No installations found.')
    } else {
      installations.forEach(install => {
        console.log(`Company ID: ${install.companyId}`)
        console.log(`Plan: ${install.plan || 'free'}`)
        console.log(`Experience ID: ${install.experienceId || 'none'}`)
        console.log(`Updated: ${install.updatedAt}`)
        console.log('---')
      })
    }
    await prisma.$disconnect()
    return
  }
  
  try {
    // Check if installation exists
    const installation = await prisma.whopInstallation.findUnique({
      where: { companyId }
    })
    
    if (!installation) {
      console.error(`❌ Error: No installation found for companyId: ${companyId}`)
      console.log('\nRun this command to see all installations:')
      console.log('  node scripts/trigger-pro-upgrade.mjs list')
      process.exit(1)
    }
    
    console.log(`Found installation:`)
    console.log(`  Company ID: ${installation.companyId}`)
    console.log(`  Current Plan: ${installation.plan || 'free'}`)
    console.log(`  Experience ID: ${installation.experienceId || 'none'}`)
    console.log('')
    
    // Update to pro
    const updated = await prisma.whopInstallation.update({
      where: { companyId },
      data: {
        plan: 'pro',
        updatedAt: new Date()
      }
    })
    
    console.log('✅ Successfully upgraded to Pro!')
    console.log(`  New Plan: ${updated.plan}`)
    console.log(`  Updated At: ${updated.updatedAt}`)
    console.log('\n🎉 Refresh your dashboard to see the Pro badge!')
    
  } catch (error) {
    console.error('❌ Error updating installation:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

upgradeToPro()
