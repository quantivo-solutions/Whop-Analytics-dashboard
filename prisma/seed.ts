import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Clear existing data
  await prisma.metricsDaily.deleteMany()
  console.log('🗑️  Cleared existing metrics data')

  // Generate 30 days of fake data
  const today = new Date()
  const metricsData = []

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    // Generate realistic fake data with some variation
    const baseGrossRevenue = 1200 + Math.random() * 600 // 1200-1800
    const baseActiveMembers = 80 + Math.floor(Math.random() * 20) // 80-100
    const baseNewMembers = 8 + Math.floor(Math.random() * 8) // 8-16
    const baseCancellations = 2 + Math.floor(Math.random() * 4) // 2-6
    const baseTrialsStarted = 12 + Math.floor(Math.random() * 8) // 12-20
    const baseTrialsPaid = 3 + Math.floor(Math.random() * 5) // 3-8

    metricsData.push({
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

  console.log(`✅ Seeded ${metricsData.length} days of metrics data`)
  
  // Show sample data
  const sampleData = await prisma.metricsDaily.findMany({
    take: 5,
    orderBy: { date: 'desc' }
  })
  
  console.log('📊 Sample data:')
  sampleData.forEach((metric: any) => {
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
