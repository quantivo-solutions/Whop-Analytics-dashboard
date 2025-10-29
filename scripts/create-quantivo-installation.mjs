import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // First, find the hafiz.usama installation to get the userId
    const hafizInstallation = await prisma.whopInstallation.findFirst({
      where: {
        OR: [
          { experienceId: 'exp_coEuWHJwcDqvur' }, // hafiz usama exp ID
          { experienceId: { contains: 'exp_' } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!hafizInstallation) {
      console.error('❌ No hafiz.usama installation found!')
      process.exit(1)
    }

    console.log('✅ Found hafiz.usama installation:', {
      companyId: hafizInstallation.companyId,
      userId: hafizInstallation.userId,
      experienceId: hafizInstallation.experienceId,
      plan: hafizInstallation.plan
    })

    // Check if Quantivo installation already exists
    const quantivoExperienceId = 'exp_75NS2OapWFc535'
    const existingQuantivo = await prisma.whopInstallation.findFirst({
      where: { experienceId: quantivoExperienceId }
    })

    if (existingQuantivo) {
      console.log('⚠️  Quantivo installation already exists:', existingQuantivo)
      console.log('Updating it with correct userId and plan...')
      
      await prisma.whopInstallation.update({
        where: { id: existingQuantivo.id },
        data: {
          userId: hafizInstallation.userId,
          plan: hafizInstallation.plan, // Same plan as hafiz
          accessToken: hafizInstallation.accessToken, // Share access token
          updatedAt: new Date()
        }
      })
      
      console.log('✅ Updated Quantivo installation')
    } else {
      console.log('Creating new Quantivo installation...')
      
      // Create installation for Quantivo Solutions with SAME userId
      await prisma.whopInstallation.create({
        data: {
          companyId: 'biz_quantivo_solutions', // Placeholder, will be updated via webhook
          userId: hafizInstallation.userId, // SAME user as hafiz
          experienceId: quantivoExperienceId,
          accessToken: hafizInstallation.accessToken, // Share access token
          plan: hafizInstallation.plan, // Same plan as hafiz (pro)
        }
      })
      
      console.log('✅ Created Quantivo installation')
    }

    // Verify
    const quantivoInstallation = await prisma.whopInstallation.findFirst({
      where: { experienceId: quantivoExperienceId }
    })

    console.log('\n📊 Quantivo Installation:', quantivoInstallation)
    console.log('\n✅ Done! Now visit the Quantivo Whop - it should load!')

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
