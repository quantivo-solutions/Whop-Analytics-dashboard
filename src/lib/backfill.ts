import { prisma } from './prisma'
import { fetchDailySummary } from './whop'

/**
 * Backfill historical Whop metrics for a specific company
 * 
 * @param companyId - The company ID to backfill data for
 * @param accessToken - The Whop access token for API calls
 * @param days - Number of days to backfill (default: 7)
 * @returns Object with daysWritten and totalDays
 */
export async function performBackfill(
  companyId: string,
  accessToken: string,
  days: number = 7
): Promise<{ daysWritten: number; totalDays: number }> {
  console.log(`🚀 Starting Whop data backfill for company ${companyId} for the last ${days} days...`)

  let daysWritten = 0
  const today = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD

    try {
      console.log(`  Processing ${dateStr}...`)
      const summary = await fetchDailySummary(dateStr, accessToken)

      await prisma.metricsDaily.upsert({
        where: {
          companyId_date: {
            companyId: companyId,
            date: new Date(dateStr),
          },
        },
        update: {
          grossRevenue: summary.grossRevenue,
          activeMembers: summary.activeMembers,
          newMembers: summary.newMembers,
          cancellations: summary.cancellations,
          trialsStarted: summary.trialsStarted,
          trialsPaid: summary.trialsPaid,
        },
        create: {
          companyId: companyId,
          date: new Date(dateStr),
          grossRevenue: summary.grossRevenue,
          activeMembers: summary.activeMembers,
          newMembers: summary.newMembers,
          cancellations: summary.cancellations,
          trialsStarted: summary.trialsStarted,
          trialsPaid: summary.trialsPaid,
        },
      })

      daysWritten++
      console.log(`  ✅ ${dateStr}: $${summary.grossRevenue.toFixed(2)}, ${summary.activeMembers} active, ${summary.newMembers} new`)

      // Small delay to avoid rate limiting (100ms between requests)
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      console.error(`  ❌ Error processing ${dateStr}:`, error)
      // Continue processing remaining days even if one fails
    }
  }

  console.log(`🎉 Backfill complete for company ${companyId}. Wrote ${daysWritten} out of ${days} days.`)
  
  return {
    daysWritten,
    totalDays: days,
  }
}

