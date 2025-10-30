import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const installations = await prisma.whopInstallation.findMany({
      orderBy: { createdAt: 'desc' }
    })

    console.log('📊 All installations:\n')
    
    installations.forEach((inst, i) => {
      console.log(`${i + 1}. ${inst.companyId}`)
      console.log(`   Experience: ${inst.experienceId || 'none'}`)
      console.log(`   Plan: ${inst.plan}`)
      console.log(`   UserId: ${inst.userId || 'none'}`)
      console.log(`   Created: ${inst.createdAt}`)
      console.log('')
    })

    console.log('Total installations:', installations.length)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
