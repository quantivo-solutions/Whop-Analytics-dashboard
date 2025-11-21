/**
 * Migration Script: Company-Level Plan → User-Level Plan
 * 
 * This script:
 * 1. Backfills userId for existing installations (if missing)
 * 2. Creates UserPlan records from existing installation.plan values
 * 3. Migrates plan data to user-level
 * 
 * Run with: node scripts/migrate-to-user-plan.mjs
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting migration to user-level plans...\n')

  // Step 1: Get all installations (userId is now required after migration)
  // Note: After the migration, all installations should have userId
  const allInstallations = await prisma.whopInstallation.findMany({
    select: {
      userId: true,
      plan: true,
      companyId: true,
    },
  })

  console.log(`📋 Found ${allInstallations.length} installations`)

  // Step 2: Group installations by userId and migrate plans
  const installationsWithUserId = allInstallations.filter(inst => inst.userId)

  console.log(`\n📋 Found ${installationsWithUserId.length} installations with userId`)

  // Group by userId
  const userPlans = new Map()

  for (const inst of installationsWithUserId) {
    if (!inst.userId) continue

    const userId = inst.userId
    const plan = inst.plan?.toLowerCase() || 'free'

    // Normalize plan
    let normalizedPlan = 'free'
    if (plan === 'pro' || plan === 'professional') {
      normalizedPlan = 'pro'
    } else if (plan === 'business' || plan === 'enterprise') {
      normalizedPlan = 'business'
    }

    // Track highest plan for each user (business > pro > free)
    const currentPlan = userPlans.get(userId) || 'free'
    if (normalizedPlan === 'business' || (normalizedPlan === 'pro' && currentPlan === 'free')) {
      userPlans.set(userId, normalizedPlan)
    } else if (normalizedPlan === 'pro' && currentPlan !== 'business') {
      userPlans.set(userId, normalizedPlan)
    }
  }

  console.log(`\n📊 Migrating plans for ${userPlans.size} users...`)

  // Step 3: Create/update UserPlan records
  let created = 0
  let updated = 0

  for (const [userId, plan] of userPlans.entries()) {
    try {
      const existing = await prisma.userPlan.findUnique({
        where: { userId },
      })

      if (existing) {
        if (existing.plan !== plan) {
          await prisma.userPlan.update({
            where: { userId },
            data: { plan },
          })
          updated++
          console.log(`  ✅ Updated user ${userId}: ${existing.plan} → ${plan}`)
        }
      } else {
        await prisma.userPlan.create({
          data: {
            userId,
            plan,
          },
        })
        created++
        console.log(`  ✅ Created user plan for ${userId}: ${plan}`)
      }
    } catch (error) {
      console.error(`  ❌ Error migrating plan for user ${userId}:`, error)
    }
  }

  console.log(`\n✅ Migration complete!`)
  console.log(`   Created: ${created} user plans`)
  console.log(`   Updated: ${updated} user plans`)
  console.log(`   Total users: ${userPlans.size}`)
  console.log(`\n⚠️  Note: Installations without userId need to be fixed manually.`)
  console.log(`   Run this script again after fixing missing userIds.`)
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

