import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const experienceId = process.argv[2] || 'exp_FmjB20shlJTNCa'
    const experienceName = process.argv[3] || 'Hafiz Usama'
    
    console.log(`🔧 Updating experience name for: ${experienceId}`)
    console.log(`   Setting name to: ${experienceName}\n`)
    
    // Find installation by experienceId
    const installation = await prisma.whopInstallation.findUnique({
      where: { experienceId }
    })
    
    if (!installation) {
      console.error(`❌ No installation found for experienceId: ${experienceId}`)
      process.exit(1)
    }
    
    console.log(`Found installation:`)
    console.log(`   Company ID: ${installation.companyId}`)
    console.log(`   Current experience name: ${installation.experienceName || '(not set)'}`)
    
    // Update experience name
    await prisma.whopInstallation.update({
      where: { experienceId },
      data: { experienceName }
    })
    
    console.log(`\n✅ Updated experience name to: ${experienceName}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

