import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Find the Quantivo installation with wrong company ID
    const wrongInstallation = await prisma.whopInstallation.findFirst({
      where: {
        experienceId: 'exp_75NS2OapWFc535'
      }
    })

    if (!wrongInstallation) {
      console.error('❌ No installation found for exp_75NS2OapWFc535')
      process.exit(1)
    }

    console.log('Current installation:', wrongInstallation)
    console.log('')
    console.log('⚠️  Current companyId:', wrongInstallation.companyId, '(should be biz_CGpV4KE2L63BYD)')
    console.log('')

    // Update to correct company ID from webhook
    const correctCompanyId = 'biz_CGpV4KE2L63BYD'

    await prisma.whopInstallation.update({
      where: { id: wrongInstallation.id },
      data: {
        companyId: correctCompanyId,
        updatedAt: new Date()
      }
    })

    console.log('✅ Updated companyId to:', correctCompanyId)
    console.log('')

    // Verify
    const updated = await prisma.whopInstallation.findFirst({
      where: { experienceId: 'exp_75NS2OapWFc535' }
    })

    console.log('Updated installation:', updated)

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
