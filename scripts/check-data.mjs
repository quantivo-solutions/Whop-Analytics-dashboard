import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n📊 CHECKING ALL DATA:\n')
  
  // 1. All installations
  const installations = await prisma.whopInstallation.findMany({
    orderBy: { createdAt: 'desc' }
  })
  
  console.log('🏢 INSTALLATIONS:', installations.length)
  installations.forEach((inst, i) => {
    console.log(`${i + 1}. Company: ${inst.companyId}`)
    console.log(`   User: ${inst.userId || 'none'}`)
    console.log(`   Experience: ${inst.experienceId || 'none'}`)
    console.log(`   Plan: ${inst.plan}`)
    console.log(`   Has Token: ${inst.accessToken ? 'Yes' : 'No'}`)
    console.log('')
  })
  
  // 2. All metrics
  const metrics = await prisma.metricsDaily.findMany({
    orderBy: { date: 'desc' },
    take: 10
  })
  
  console.log('\n📈 METRICS DATA:', metrics.length, 'records')
  metrics.forEach((m, i) => {
    console.log(`${i + 1}. ${m.date.toISOString().split('T')[0]} - Company: ${m.companyId}`)
    console.log(`   Revenue: $${m.grossRevenue}, Members: ${m.activeMembers}`)
  })
  
  if (metrics.length === 0) {
    console.log('\n⚠️  NO METRICS DATA FOUND!')
    console.log('This means the backfill has not run yet.')
  }
  
  await prisma.$disconnect()
}

main()
