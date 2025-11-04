#!/usr/bin/env node
/**
 * Check and verify Quantivo Solutions installation
 * 
 * Usage: node scripts/check-quantivo-installation.mjs
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking Quantivo Solutions installation...\n')
  
  const quantivoCompanyId = 'biz_CGpV4KE2L63BYD'
  const quantivoExperienceId = 'exp_75NS2OapWFc535'
  
  // Check by companyId
  const byCompanyId = await prisma.whopInstallation.findUnique({
    where: { companyId: quantivoCompanyId }
  })
  
  // Check by experienceId
  const byExperienceId = await prisma.whopInstallation.findUnique({
    where: { experienceId: quantivoExperienceId }
  })
  
  // Check all installations
  const allInstallations = await prisma.whopInstallation.findMany({
    orderBy: { updatedAt: 'desc' }
  })
  
  console.log('📊 Installation Status:')
  console.log('─'.repeat(60))
  
  if (byCompanyId) {
    console.log(`✅ Found by companyId (${quantivoCompanyId}):`)
    console.log(`   Installation ID: ${byCompanyId.id}`)
    console.log(`   Company ID: ${byCompanyId.companyId}`)
    console.log(`   Experience ID: ${byCompanyId.experienceId || 'none'}`)
    console.log(`   User ID: ${byCompanyId.userId || 'none'}`)
    console.log(`   Plan: ${byCompanyId.plan}`)
    console.log(`   Has Access Token: ${byCompanyId.accessToken ? '✅ Yes' : '❌ No'}`)
    console.log(`   Created: ${byCompanyId.createdAt.toISOString()}`)
    console.log(`   Updated: ${byCompanyId.updatedAt.toISOString()}`)
  } else {
    console.log(`❌ No installation found for companyId: ${quantivoCompanyId}`)
  }
  
  console.log('')
  
  if (byExperienceId) {
    console.log(`✅ Found by experienceId (${quantivoExperienceId}):`)
    console.log(`   Installation ID: ${byExperienceId.id}`)
    console.log(`   Company ID: ${byExperienceId.companyId}`)
    console.log(`   Experience ID: ${byExperienceId.experienceId}`)
    console.log(`   User ID: ${byExperienceId.userId || 'none'}`)
    console.log(`   Plan: ${byExperienceId.plan}`)
  } else {
    console.log(`❌ No installation found for experienceId: ${quantivoExperienceId}`)
  }
  
  console.log('')
  console.log('📋 All Installations:')
  console.log('─'.repeat(60))
  console.log(`Total installations: ${allInstallations.length}`)
  allInstallations.forEach((inst, index) => {
    console.log(`\n${index + 1}. Installation:`)
    console.log(`   Company ID: ${inst.companyId}`)
    console.log(`   Experience ID: ${inst.experienceId || 'none'}`)
    console.log(`   User ID: ${inst.userId || 'none'}`)
    console.log(`   Plan: ${inst.plan}`)
    console.log(`   Updated: ${inst.updatedAt.toISOString()}`)
  })
  
  // Check metrics data
  console.log('\n📊 Metrics Data:')
  console.log('─'.repeat(60))
  const metricsForQuantivo = await prisma.metricsDaily.findMany({
    where: { companyId: quantivoCompanyId },
    orderBy: { date: 'desc' },
    take: 5
  })
  
  if (metricsForQuantivo.length > 0) {
    console.log(`✅ Found ${metricsForQuantivo.length} recent metrics records for Quantivo:`)
    metricsForQuantivo.forEach(metric => {
      console.log(`   ${metric.date.toISOString().split('T')[0]}: $${metric.grossRevenue}, ${metric.activeMembers} active, ${metric.newMembers} new`)
    })
  } else {
    console.log(`❌ No metrics data found for companyId: ${quantivoCompanyId}`)
  }
  
  // Check CompanyPrefs
  console.log('\n⚙️  Company Preferences:')
  console.log('─'.repeat(60))
  const prefs = await prisma.companyPrefs.findUnique({
    where: { companyId: quantivoCompanyId }
  })
  
  if (prefs) {
    console.log(`✅ CompanyPrefs found:`)
    console.log(`   Goal Amount: ${prefs.goalAmount || 'not set'}`)
    console.log(`   Completed At: ${prefs.completedAt ? prefs.completedAt.toISOString() : 'null (onboarding not complete)'}`)
    console.log(`   Pro Welcome Shown At: ${prefs.proWelcomeShownAt ? prefs.proWelcomeShownAt.toISOString() : 'null'}`)
  } else {
    console.log(`❌ No CompanyPrefs found for companyId: ${quantivoCompanyId}`)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('💡 Dashboard URL should be:')
  console.log(`   https://whop-analytics-dashboard-omega.vercel.app/dashboard/${quantivoCompanyId}`)
  console.log('\n💡 Experience View URL should be:')
  if (quantivoExperienceId) {
    console.log(`   https://whop-analytics-dashboard-omega.vercel.app/experiences/${quantivoExperienceId}`)
  } else {
    console.log(`   (No experienceId set)`)
  }
  console.log('='.repeat(60))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

