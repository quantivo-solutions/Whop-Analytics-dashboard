/**
 * Script to update an existing installation with experienceId
 * Usage: node scripts/update-installation-experience.mjs biz_RRUhpqBUJ4cu4f
 */

import { PrismaClient } from '@prisma/client'
import { env } from '../src/lib/env.js'

const prisma = new PrismaClient()

async function updateInstallation() {
  const companyId = process.argv[2]
  
  if (!companyId) {
    console.error('❌ Usage: node scripts/update-installation-experience.mjs <companyId>')
    console.log('\nExample:')
    console.log('  node scripts/update-installation-experience.mjs biz_RRUhpqBUJ4cu4f')
    process.exit(1)
  }
  
  console.log(`🔧 Updating installation for companyId: ${companyId}\n`)
  
  try {
    // Check if installation exists
    const installation = await prisma.whopInstallation.findUnique({
      where: { companyId },
    })
    
    if (!installation) {
      console.error(`❌ No installation found for companyId: ${companyId}`)
      process.exit(1)
    }
    
    console.log('📋 Current Installation:')
    console.log(`  Company ID: ${installation.companyId}`)
    console.log(`  Experience ID: ${installation.experienceId || 'none'}`)
    console.log(`  User ID: ${installation.userId || 'none'}`)
    console.log('')
    
    // If already has experienceId, we're done
    if (installation.experienceId) {
      console.log('✅ Installation already has experienceId:', installation.experienceId)
      process.exit(0)
    }
    
    // Fetch experiences from Whop API
    console.log('🔍 Fetching experiences from Whop API...')
    const experiencesResponse = await fetch(`https://api.whop.com/api/v5/companies/${companyId}/experiences`, {
      headers: {
        'Authorization': `Bearer ${env.WHOP_APP_SERVER_KEY}`,
      },
    })
    
    if (!experiencesResponse.ok) {
      console.error(`❌ Failed to fetch experiences (status: ${experiencesResponse.status})`)
      const errorText = await experiencesResponse.text()
      console.error('Error:', errorText)
      process.exit(1)
    }
    
    const experiencesData = await experiencesResponse.json()
    const experiences = experiencesData.data || []
    
    if (experiences.length === 0) {
      console.log('⚠️  No experiences found for this company')
      console.log('This company may not have any experiences yet.')
      process.exit(0)
    }
    
    // Use the first experience
    const experienceId = experiences[0].id
    console.log(`✅ Found experienceId: ${experienceId}`)
    
    // Check if this experienceId is already taken
    const existingByExp = await prisma.whopInstallation.findUnique({
      where: { experienceId },
    })
    
    if (existingByExp && existingByExp.companyId !== companyId) {
      console.warn(`⚠️  ExperienceId ${experienceId} already belongs to company ${existingByExp.companyId}`)
      console.warn('Cannot assign to this installation. You may need to handle this manually.')
      process.exit(1)
    }
    
    // Update installation
    const updated = await prisma.whopInstallation.update({
      where: { companyId },
      data: { experienceId },
    })
    
    console.log('✅ Installation updated successfully!')
    console.log(`  Company ID: ${updated.companyId}`)
    console.log(`  Experience ID: ${updated.experienceId}`)
    console.log(`\n🎉 Experience view should now work at: /experiences/${updated.experienceId}`)
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

updateInstallation().catch(console.error)

