import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const hafizCompanyId = 'user_CjCXi3vpQWbhj'
  
  console.log(`\n📊 Seeding test analytics data for Hafiz Usama (${hafizCompanyId})...\n`)
  
  // Generate last 30 days of realistic business data
  const today = new Date()
  const dataPoints = []
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    // Simulate realistic business growth
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    
    // Base metrics with some randomness
    const baseRevenue = 50 + Math.random() * 150
    const revenue = isWeekend ? baseRevenue * 0.7 : baseRevenue
    
    const newMembers = Math.floor(Math.random() * (isWeekend ? 3 : 8))
    const cancellations = Math.floor(Math.random() * 2)
    const activeMembers = 20 + i + Math.floor(Math.random() * 10)
    const trialsPaid = Math.floor(newMembers * 0.6)
    
    dataPoints.push({
      companyId: hafizCompanyId,
      date: new Date(dateStr),
      grossRevenue: revenue,
      activeMembers,
      newMembers,
      cancellations,
      trialsStarted: newMembers,
      trialsPaid,
    })
  }
  
  // Insert all data
  console.log(`Inserting ${dataPoints.length} days of metrics...`)
  
  for (const dp of dataPoints) {
    await prisma.metricsDaily.upsert({
      where: {
        companyId_date: {
          companyId: dp.companyId,
          date: dp.date
        }
      },
      update: dp,
      create: dp
    })
  }
  
  console.log(`✅ Created ${dataPoints.length} days of test data!`)
  
  // Show summary
  const totalRevenue = dataPoints.reduce((sum, d) => sum + d.grossRevenue, 0)
  const totalNewMembers = dataPoints.reduce((sum, d) => sum + d.newMembers, 0)
  const avgActive = dataPoints.reduce((sum, d) => sum + d.activeMembers, 0) / dataPoints.length
  
  console.log(`\n📈 Summary:`)
  console.log(`   Total Revenue (30 days): $${totalRevenue.toFixed(2)}`)
  console.log(`   New Members: ${totalNewMembers}`)
  console.log(`   Avg Active Members: ${Math.round(avgActive)}`)
  console.log(`   Latest Active: ${dataPoints[dataPoints.length - 1].activeMembers}`)
  
  console.log(`\n✅ Now refresh the Hafiz Usama dashboard to see the data!`)
  
  await prisma.$disconnect()
}

main()
