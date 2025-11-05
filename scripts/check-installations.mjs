#!/usr/bin/env node
/**
 * Diagnostic script to check if webhooks are being received and what errors occur
 * This helps diagnose why new installations aren't working
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkInstallations() {
  console.log('🔍 Checking existing installations...\n')
  
  const installations = await prisma.whopInstallation.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  
  console.log(`Found ${installations.length} installations (showing latest 10):\n`)
  
  installations.forEach((inst, i) => {
    console.log(`${i + 1}. companyId: ${inst.companyId}`)
    console.log(`   userId: ${inst.userId || 'none'}`)
    console.log(`   experienceId: ${inst.experienceId || 'none'}`)
    console.log(`   plan: ${inst.plan || 'free'}`)
    console.log(`   createdAt: ${inst.createdAt}`)
    console.log(`   updatedAt: ${inst.updatedAt}`)
    console.log('')
  })
  
  // Check for potential constraint issues
  console.log('🔍 Checking for potential constraint violations...\n')
  
  // Check for duplicate experienceIds
  const expIds = installations.filter(i => i.experienceId).map(i => i.experienceId)
  const duplicates = expIds.filter((id, index) => expIds.indexOf(id) !== index)
  
  if (duplicates.length > 0) {
    console.log(`⚠️  Found duplicate experienceIds: ${duplicates.join(', ')}`)
  } else {
    console.log('✅ No duplicate experienceIds found')
  }
  
  // Check for null experienceIds
  const nullExpIds = installations.filter(i => !i.experienceId)
  if (nullExpIds.length > 0) {
    console.log(`\n⚠️  Found ${nullExpIds.length} installations with null experienceId:`)
    nullExpIds.forEach(inst => {
      console.log(`   - companyId: ${inst.companyId}, userId: ${inst.userId || 'none'}`)
    })
  }
  
  await prisma.$disconnect()
}

checkInstallations().catch(console.error)
