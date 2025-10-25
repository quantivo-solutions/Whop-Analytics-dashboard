import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create demo WhopInstallation
  const demoInstallation = await prisma.whopInstallation.upsert({
    where: { companyId: 'demo_company' },
    update: {
      experienceId: 'demo_experience',
      accessToken: process.env.WHOP_API_KEY || process.env.WHOP_APP_SERVER_KEY || 'demo_token',
      plan: 'demo',
    },
    create: {
      companyId: 'demo_company',
      experienceId: 'demo_experience',
      accessToken: process.env.WHOP_API_KEY || process.env.WHOP_APP_SERVER_KEY || 'demo_token',
      plan: 'demo',
    },
  })

  console.log('✅ Created demo WhopInstallation:', demoInstallation.companyId)

  // Clear existing metrics for demo company
  await prisma.metricsDaily.deleteMany({
    where: { companyId: 'demo_company' },
  })
  console.log('🗑️  Cleared existing metrics for demo company')

  // Generate 30 days of fake data for demo company
  const today = new Date()
  const metricsData = []

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0) // Set to start of day
    
    // Generate realistic fake data with some variation
    const baseGrossRevenue = 1200 + Math.random() * 600 // 1200-1800
    const baseActiveMembers = 80 + Math.floor(Math.random() * 20) // 80-100
    const baseNewMembers = 8 + Math.floor(Math.random() * 8) // 8-16
    const baseCancellations = 2 + Math.floor(Math.random() * 4) // 2-6
    const baseTrialsStarted = 12 + Math.floor(Math.random() * 8) // 12-20
    const baseTrialsPaid = 3 + Math.floor(Math.random() * 5) // 3-8

    metricsData.push({
      companyId: 'demo_company',
      date: date,
      grossRevenue: Math.round(baseGrossRevenue * 100) / 100,
      activeMembers: baseActiveMembers,
      newMembers: baseNewMembers,
      cancellations: baseCancellations,
      trialsStarted: baseTrialsStarted,
      trialsPaid: baseTrialsPaid,
    })
  }

  // Insert all data
  await prisma.metricsDaily.createMany({
    data: metricsData,
  })

  console.log(`✅ Seeded ${metricsData.length} days of metrics data for demo company`)
  
  // Show sample data
  const sampleData = await prisma.metricsDaily.findMany({
    where: { companyId: 'demo_company' },
    take: 5,
    orderBy: { date: 'desc' },
  })
  
  console.log('📊 Sample data:')
  sampleData.forEach((metric) => {
    console.log(`${metric.date.toISOString().split('T')[0]}: Revenue: $${metric.grossRevenue}, Active: ${metric.activeMembers}, New: ${metric.newMembers}, Cancellations: ${metric.cancellations}`)
  })
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:')
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    console.log('🔌 Disconnected from database')
  })
