/**
 * Backfill userId for existing WhopInstallation records
 * 
 * This script attempts to backfill userId for installations that have NULL userId.
 * Since we can't determine the actual userId from existing data, we'll need to:
 * 1. Set a placeholder userId for now (or fetch from Whop API if possible)
 * 2. Or mark them for manual review
 * 
 * Run with: node scripts/backfill-userid.mjs
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting userId backfill...\n')

  // Find all installations without userId
  const installationsWithoutUserId = await prisma.whopInstallation.findMany({
    where: {
      userId: null,
    },
  })

  console.log(`📋 Found ${installationsWithoutUserId.length} installations without userId`)

  if (installationsWithoutUserId.length === 0) {
    console.log('✅ All installations already have userId!')
    return
  }

  // For each installation, try to determine userId
  // Since we can't fetch from Whop API easily, we'll use a placeholder pattern
  // In production, you should fetch userId from Whop API using the accessToken
  let updated = 0
  let skipped = 0

  for (const installation of installationsWithoutUserId) {
    try {
      // Option 1: Use companyId as temporary userId (not ideal, but allows migration)
      // Option 2: Fetch from Whop API using accessToken (better, but requires API call)
      // Option 3: Set a placeholder that indicates manual review needed
      
      // For now, we'll use a placeholder pattern: "migration_user_<companyId>"
      // This allows the migration to proceed, but these should be updated with real userIds
      const placeholderUserId = `migration_user_${installation.companyId}`
      
      // Check if this placeholder already exists for another installation
      const existing = await prisma.whopInstallation.findFirst({
        where: {
          userId: placeholderUserId,
          companyId: { not: installation.companyId },
        },
      })

      if (existing) {
        console.warn(`⚠️  Placeholder userId ${placeholderUserId} already exists, skipping ${installation.companyId}`)
        skipped++
        continue
      }

      // Update installation with placeholder userId
      await prisma.whopInstallation.update({
        where: { id: installation.id },
        data: { userId: placeholderUserId },
      })

      console.log(`✅ Updated installation ${installation.companyId} with placeholder userId: ${placeholderUserId}`)
      updated++
    } catch (error) {
      console.error(`❌ Error updating installation ${installation.companyId}:`, error)
      skipped++
    }
  }

  console.log(`\n✅ Backfill complete!`)
  console.log(`   Updated: ${updated} installations`)
  console.log(`   Skipped: ${skipped} installations`)
  console.log(`\n⚠️  NOTE: Placeholder userIds were used. These should be updated with real userIds from Whop API.`)
  console.log(`   Pattern: migration_user_<companyId>`)
}

main()
  .catch((e) => {
    console.error('❌ Backfill failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

