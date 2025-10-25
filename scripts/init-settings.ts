import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Initializing workspace settings...')

  // Check if settings exist
  let settings = await prisma.workspaceSettings.findFirst()

  if (!settings) {
    // Create default settings
    settings = await prisma.workspaceSettings.create({
      data: {
        reportEmail: process.env.REPORT_EMAIL || 'quantivosolutions@gmail.com',
        weeklyEmail: true,
        dailyEmail: false,
      },
    })
    console.log('✅ Created default settings:', settings)
  } else {
    console.log('ℹ️  Settings already exist:', settings)
  }

  console.log('🔌 Done!')
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
