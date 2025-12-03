import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { performBackfill } from "@/lib/backfill";
import { fetchDailySummary } from "@/lib/whop";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * POST /api/ingest/whop/backfill?secret=CRON_SECRET&days=30&companyId=xyz
 *
 * Daily cron job: Backfill historical Whop metrics for all companies
 * Processes yesterday's data and fills any gaps
 * Protected endpoint - allows Vercel cron (via user-agent) or CRON_SECRET
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  try {
    // Check authentication
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const userAgent = request.headers.get("user-agent") || "unknown";
    const isCronJob =
      userAgent.includes("vercel-cron") || userAgent.includes("cron");

    console.log(
      `[Cron] 📅 Daily backfill cron triggered (requestId: ${requestId}, isCronJob: ${isCronJob}, userAgent: ${userAgent})`,
    );

    // Allow Vercel cron requests without secret (they're authenticated by Vercel)
    // For manual requests, still require secret
    if (!isCronJob && (!secret || secret !== env.CRON_SECRET)) {
      console.warn(
        `[Cron] ⚠️ Unauthorized backfill request - invalid or missing secret (requestId: ${requestId})`,
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isCronJob) {
      console.log(
        `[Cron] ✅ Vercel cron request authenticated via user-agent (requestId: ${requestId})`,
      );
    } else if (secret && secret === env.CRON_SECRET) {
      console.log(
        `[Cron] ✅ Manual request authenticated via secret (requestId: ${requestId})`,
      );
    }

    // Get all installations with valid tokens
    const allInstallations = await prisma.whopInstallation.findMany({
      where: {
        accessToken: { not: "" }, // Only installations with valid tokens
      },
    });

    if (allInstallations.length === 0) {
      console.warn("[Cron] No Whop installations found. Skipping backfill.");
      return NextResponse.json(
        { ok: false, message: "No Whop installations found" },
        { status: 404 },
      );
    }

    // Determine yesterday's date in UTC (YYYY-MM-DD)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayUTC = yesterday.toISOString().split("T")[0];

    // Get days parameter (default: 1 day for daily cron, or 30 for manual backfill)
    const daysParam = searchParams.get("days");
    const daysToBackfill = daysParam
      ? parseInt(daysParam, 10)
      : isCronJob
        ? 1
        : 30;

    if (isNaN(daysToBackfill) || daysToBackfill <= 0 || daysToBackfill > 365) {
      return NextResponse.json(
        {
          error:
            'Invalid "days" parameter. Must be a number between 1 and 365.',
        },
        { status: 400 },
      );
    }

    // Optional: Process specific company if provided
    const companyIdParam = searchParams.get("companyId");
    const installationsToProcess = companyIdParam
      ? allInstallations.filter((inst) => inst.companyId === companyIdParam)
      : allInstallations;

    if (companyIdParam && installationsToProcess.length === 0) {
      console.warn(
        `[Cron] No Whop installation found for companyId: ${companyIdParam}`,
      );
      return NextResponse.json(
        {
          ok: false,
          message: `No Whop installation found for companyId: ${companyIdParam}`,
        },
        { status: 404 },
      );
    }

    const results = [];

    // Process each installation separately
    for (const installation of installationsToProcess) {
      const companyId = installation.companyId;
      const accessToken = installation.accessToken;

      if (!companyId || !accessToken) {
        console.error(
          `[Cron] INTEGRITY ERROR: Installation missing companyId or accessToken, skipping`,
        );
        continue;
      }

      // For daily cron: Check for gaps and backfill missing days
      if (isCronJob) {
        // Check for gaps: Find the latest date in the database for this company
        const latestMetric = await prisma.metricsDaily.findFirst({
          where: { companyId },
          orderBy: { date: "desc" },
        });

        const latestDate = latestMetric ? new Date(latestMetric.date) : null;
        const latestDateStr = latestDate
          ? latestDate.toISOString().split("T")[0]
          : null;

        // Calculate how many days are missing
        let daysToFill = 0;
        if (latestDateStr) {
          const latestDateObj = new Date(latestDateStr + "T00:00:00.000Z");
          const yesterdayObj = new Date(yesterdayUTC + "T00:00:00.000Z");
          const daysDiff = Math.floor(
            (yesterdayObj.getTime() - latestDateObj.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          if (daysDiff > 1) {
            // There's a gap - backfill missing days (up to 30 days)
            daysToFill = Math.min(daysDiff - 1, 30);
            console.log(
              `[Cron] ⚠️  Gap detected for company ${companyId}: Latest date is ${latestDateStr}, yesterday is ${yesterdayUTC} (${daysDiff} days gap)`,
            );
            console.log(
              `[Cron] 🔄 Auto-backfilling ${daysToFill} missing days...`,
            );

            // Backfill missing days: from latestDate+1 to yesterday-1
            let gapDaysWritten = 0;
            const latestDateObj = new Date(latestDateStr + "T00:00:00.000Z");
            const yesterdayObj = new Date(yesterdayUTC + "T00:00:00.000Z");

            for (let d = new Date(latestDateObj); d < yesterdayObj; d.setDate(d.getDate() + 1)) {
              const gapDateStr = d.toISOString().split("T")[0];
              try {
                console.log(`[Cron]   Backfilling gap day ${gapDateStr}...`);
                const summary = await fetchDailySummary(
                  gapDateStr,
                  accessToken,
                  companyId,
                );

                await prisma.metricsDaily.upsert({
                  where: {
                    companyId_date: {
                      companyId: companyId,
                      date: new Date(gapDateStr),
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
                    date: new Date(gapDateStr),
                    grossRevenue: summary.grossRevenue,
                    activeMembers: summary.activeMembers,
                    newMembers: summary.newMembers,
                    cancellations: summary.cancellations,
                    trialsStarted: summary.trialsStarted,
                    trialsPaid: summary.trialsPaid,
                  },
                });

                gapDaysWritten++;
                // Rate-limit to avoid throttling
                await new Promise((resolve) => setTimeout(resolve, 200));
              } catch (error) {
                console.error(
                  `[Cron]   ❌ Error backfilling gap day ${gapDateStr}:`,
                  error,
                );
                // Continue with other days even if one fails
              }
            }

            console.log(
              `[Cron] ✅ Auto-backfill complete for company ${companyId}: ${gapDaysWritten}/${daysToFill} gap days filled`,
            );
          }
        } else {
          // No data exists - backfill last 7 days
          console.log(
            `[Cron] ⚠️  No data found for company ${companyId}. Auto-backfilling last 7 days...`,
          );
          const backfillResult = await performBackfill(
            companyId,
            accessToken,
            7,
          );
          console.log(
            `[Cron] ✅ Initial backfill complete for company ${companyId}: ${backfillResult.daysWritten}/${backfillResult.totalDays} days`,
          );
        }
      }

      // Process yesterday's data (or specified days for manual backfill)
      if (isCronJob) {
        // For cron: Process only yesterday's data
        console.log(
          `[Cron] 🚀 Processing yesterday's data (${yesterdayUTC}) for company ${companyId}...`,
        );
        try {
          const summary = await fetchDailySummary(
            yesterdayUTC,
            accessToken,
            companyId,
          );

          await prisma.metricsDaily.upsert({
            where: {
              companyId_date: {
                companyId: companyId,
                date: new Date(yesterdayUTC),
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
              date: new Date(yesterdayUTC),
              grossRevenue: summary.grossRevenue,
              activeMembers: summary.activeMembers,
              newMembers: summary.newMembers,
              cancellations: summary.cancellations,
              trialsStarted: summary.trialsStarted,
              trialsPaid: summary.trialsPaid,
            },
          });

          console.log(
            `[Cron] ✅ Successfully processed ${yesterdayUTC} for company ${companyId}`,
          );

          results.push({
            companyId,
            daysWritten: 1,
            totalDays: 1,
            success: true,
          });
        } catch (error) {
          console.error(
            `[Cron] ❌ Error processing ${yesterdayUTC} for company ${companyId}:`,
            error,
          );
          results.push({
            companyId,
            daysWritten: 0,
            totalDays: 1,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } else {
        // For manual backfill: Use performBackfill for specified days
        console.log(
          `[Cron] 🚀 Processing ${daysToBackfill} day(s) for company ${companyId}...`,
        );
        const result = await performBackfill(
          companyId,
          accessToken,
          daysToBackfill,
        );

        results.push({
          companyId,
          daysWritten: result.daysWritten,
          totalDays: result.totalDays,
          success: true,
        });
      }

      results.push({
        companyId,
        daysWritten: result.daysWritten,
        totalDays: result.totalDays,
        success: true,
      });
    }

    const duration = Date.now() - startTime;
    console.log(
      `[Cron] ✅ Daily backfill complete (requestId: ${requestId}, duration: ${duration}ms, processed: ${results.length} companies)`,
    );

    return NextResponse.json({
      ok: true,
      processed: results.length,
      results,
      requestId,
      duration: `${duration}ms`,
    });
  } catch (error) {
    console.error(
      `[Cron] ❌ Error during Whop backfill (requestId: ${requestId}):`,
      error,
    );
    return NextResponse.json(
      {
        error: "Failed to backfill Whop data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/ingest/whop/backfill?secret=CRON_SECRET
 *
 * Check backfill status and provide instructions
 */
export async function GET(request: Request) {
  try {
    // Check secret authentication
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const userAgent = request.headers.get("user-agent") || "unknown";
    const isCronJob =
      userAgent.includes("vercel-cron") || userAgent.includes("cron");

    // Allow Vercel cron requests without secret
    if (!isCronJob && (!secret || secret !== env.CRON_SECRET)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get metrics count per company
    const allMetrics = await prisma.metricsDaily.groupBy({
      by: ["companyId"],
      _count: true,
    });

    const oldestMetric = await prisma.metricsDaily.findFirst({
      orderBy: { date: "asc" },
    });
    const newestMetric = await prisma.metricsDaily.findFirst({
      orderBy: { date: "desc" },
    });

    return NextResponse.json({
      ok: true,
      message: "Whop backfill endpoint ready",
      usage:
        "POST /api/ingest/whop/backfill?secret=CRON_SECRET&days=30&companyId=xyz",
      currentData: {
        companies: allMetrics.length,
        totalRecords: allMetrics.reduce((sum, m) => sum + m._count, 0),
        oldestDate: oldestMetric?.date.toISOString().split("T")[0] || null,
        newestDate: newestMetric?.date.toISOString().split("T")[0] || null,
        byCompany: allMetrics.map((m) => ({
          companyId: m.companyId,
          recordCount: m._count,
        })),
      },
    });
  } catch (error) {
    console.error("[Cron] Error checking backfill status:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 },
    );
  }
}
