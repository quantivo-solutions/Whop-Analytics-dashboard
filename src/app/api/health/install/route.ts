/**
 * Health endpoint for Whop install validation
 * GET /api/health/install
 * Returns 200 JSON quickly, logs headers and user-agent
 */

export const runtime = "nodejs"

import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const userAgent = request.headers.get("user-agent") || "unknown"
  const referer = request.headers.get("referer") || "none"
  const whopToken = request.headers.get("x-whop-user-token") ? "present" : "none"
  
  console.log("[Whoplytics] /health/install", { 
    ua: userAgent.substring(0, 100),
    referer: referer.substring(0, 100),
    whopToken,
    timestamp: new Date().toISOString(),
  })

  return NextResponse.json({ 
    ok: true, 
    ts: new Date().toISOString(),
    timestamp: new Date().toISOString(),
  })
}

