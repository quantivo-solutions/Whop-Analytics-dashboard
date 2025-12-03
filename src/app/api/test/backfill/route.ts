import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * POST /api/test/backfill?secret=CRON_SECRET&days=7&companyId=xyz
 *
 * Test endpoint to manually trigger the backfill for debugging
 * Protected endpoint - requires CRON_SECRET
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    if (!secret || secret !== env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const days = searchParams.get("days") || "7";
    const companyId = searchParams.get("companyId");

    // Build the backfill URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const backfillUrl = new URL("/api/ingest/whop/backfill", baseUrl);
    backfillUrl.searchParams.set("days", days);
    if (companyId) {
      backfillUrl.searchParams.set("companyId", companyId);
    }

    console.log(`[Test] Triggering backfill: ${backfillUrl.toString()}`);

    // Call the backfill endpoint
    const response = await fetch(backfillUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: "Backfill failed", details: result },
        { status: response.status },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Backfill triggered successfully",
      backfillResult: result,
    });
  } catch (error) {
    console.error("[Test] Error triggering backfill:", error);
    return NextResponse.json(
      {
        error: "Failed to trigger backfill",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/test/backfill?secret=CRON_SECRET
 *
 * Get instructions for using the test endpoint
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    if (!secret || secret !== env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      message: "Backfill test endpoint",
      usage: {
        trigger:
          "POST /api/test/backfill?secret=CRON_SECRET&days=7&companyId=xyz",
        parameters: {
          secret: "Required - CRON_SECRET",
          days: "Optional - Number of days to backfill (default: 7)",
          companyId:
            "Optional - Specific company ID to backfill (default: all companies)",
        },
        example:
          "POST /api/test/backfill?secret=YOUR_SECRET&days=30&companyId=biz_xxx",
      },
    });
  } catch (error) {
    console.error("[Test] Error:", error);
    return NextResponse.json(
      { error: "Failed to get instructions" },
      { status: 500 },
    );
  }
}
