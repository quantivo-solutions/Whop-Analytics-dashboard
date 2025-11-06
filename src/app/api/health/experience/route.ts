/**
 * Health endpoint for experience validation
 * GET /api/health/experience?id=XYZ
 * Returns 200 and echoes id
 */

export const runtime = "nodejs"

import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  console.log("[Whoplytics] /health/experience", { id })

  return NextResponse.json({ 
    ok: true, 
    id,
    ts: new Date().toISOString(),
    timestamp: new Date().toISOString(),
  })
}

