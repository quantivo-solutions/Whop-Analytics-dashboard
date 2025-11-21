/**
 * Create a test Whop installation
 * This simulates the webhook installation event
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Creating test Whop installation...')
  
  // Read from environment
  const apiKey = process.env.WHOP_API_KEY || process.env.WHOP_APP_SERVER_KEY || process.env.WHOP_SK
  
  if (!apiKey) {
    console.error('❌ No API key found in environment!')
    console.error('Please set one of: WHOP_API_KEY, WHOP_APP_SERVER_KEY, or WHOP_SK')
    process.exit(1)
  }
  
  console.log(`✅ Found API key (length: ${apiKey.length})`)
  
  // Create a test installation (userId is now required)
  const installation = await prisma.whopInstallation.upsert({
    where: {
      companyId_userId: {
        companyId: 'test-company-id',
        userId: 'test-user-id',
      },
    },
    update: {
      accessToken: apiKey,
      experienceId: 'test-experience-id',
      plan: 'test',
      updatedAt: new Date(),
    },
    create: {
      companyId: 'test-company-id',
      userId: 'test-user-id', // REQUIRED
      experienceId: 'test-experience-id',
      accessToken: apiKey,
      plan: 'test',
    },
  })
  
  console.log('✅ Test installation created successfully!')
  console.log('Installation details:')
  console.log(`  - Company ID: ${installation.companyId}`)
  console.log(`  - Experience ID: ${installation.experienceId}`)
  console.log(`  - Plan: ${installation.plan}`)
  console.log(`  - Installed at: ${installation.createdAt}`)
  console.log('')
  console.log('🎉 Your app is now "installed" and ready to fetch Whop data!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

