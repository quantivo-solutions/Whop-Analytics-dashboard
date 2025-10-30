import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const quantivoExperienceId = 'exp_75NS2OapWFc535'
    const quantivoCompanyId = 'biz_CGpV4KE2L63BYD'
    
    // Check if it already exists
    const existing = await prisma.whopInstallation.findFirst({
      where: { experienceId: quantivoExperienceId }
    })

    if (existing) {
      console.log('⚠️  Installation already exists:', existing)
      console.log('Updating it...')
      
      await prisma.whopInstallation.update({
        where: { id: existing.id },
        data: {
          companyId: quantivoCompanyId,
          userId: 'user_CjCXi3vpQWbhj', // Same user as hafiz
          plan: 'pro', // Pro membership
          accessToken: '', // Will be updated on login
          updatedAt: new Date()
        }
      })
      
      console.log('✅ Updated!')
    } else {
      console.log('Creating new installation for Quantivo Solutions...')
      
      // Get the access token from hafiz installation
      const hafizInstallation = await prisma.whopInstallation.findFirst({
        where: { userId: 'user_CjCXi3vpQWbhj' },
        orderBy: { createdAt: 'desc' }
      })

      await prisma.whopInstallation.create({
        data: {
          companyId: quantivoCompanyId,
          userId: 'user_CjCXi3vpQWbhj', // Same user
          experienceId: quantivoExperienceId,
          plan: 'pro',
          accessToken: hafizInstallation?.accessToken || '',
        }
      })
      
      console.log('✅ Created!')
    }

    // Verify
    const result = await prisma.whopInstallation.findFirst({
      where: { experienceId: quantivoExperienceId }
    })

    console.log('\n📊 Quantivo Installation:')
    console.log(result)
    console.log('\n✅ Now visit https://whop.com/joined/quantivo-solutions/exp_75NS2OapWFc535/app/')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
