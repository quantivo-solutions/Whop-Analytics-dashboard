/**
 * Manually create an installation
 * Use this when app.installed webhook fails
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createInstallation() {
  const experienceId = process.argv[2]
  const companyId = process.argv[3]
  
  if (!experienceId || !companyId) {
    console.error('❌ Usage: node scripts/create-installation.mjs <experienceId> <companyId>')
    console.log('\nExample:')
    console.log('  node scripts/create-installation.mjs exp_NjtgWW0o6TqJj1 biz_xxx')
    process.exit(1)
  }
  
  console.log('🔧 Creating installation manually...\n')
  console.log(`Experience ID: ${experienceId}`)
  console.log(`Company ID: ${companyId}`)
  console.log('')
  
  try {
    // Check if installation already exists
    const existing = await prisma.whopInstallation.findUnique({
      where: { companyId }
    })
    
    if (existing) {
      console.log('⚠️  Installation already exists for this company!')
      console.log('Updating instead...\n')
      
      const updated = await prisma.whopInstallation.update({
        where: { companyId },
        data: {
          experienceId,
          updatedAt: new Date()
        }
      })
      
      console.log('✅ Installation updated:')
      console.log(`  Company ID: ${updated.companyId}`)
      console.log(`  Experience ID: ${updated.experienceId}`)
      console.log(`  Plan: ${updated.plan}`)
      
    } else {
      const installation = await prisma.whopInstallation.create({
        data: {
          companyId,
          experienceId,
          accessToken: '', // Will be populated on OAuth login
          plan: 'free'
        }
      })
      
      console.log('✅ Installation created successfully!')
      console.log(`  Company ID: ${installation.companyId}`)
      console.log(`  Experience ID: ${installation.experienceId}`)
      console.log(`  Plan: ${installation.plan}`)
    }
    
    console.log('\n🎉 Done! You can now log in from the Whop iframe.')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createInstallation()
