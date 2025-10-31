import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/debug/tables
// Shows all tables in the database (protected by CRON_SECRET)
export async function GET(req: Request) {
  // SECURITY: Require CRON_SECRET for access (not just show=true)
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  try {
    // Query PostgreSQL schema
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `

    // Check each table
    const tableInfo = []

    for (const table of tables) {
      if (table.tablename === '_prisma_migrations') continue

      let count = 0
      try {
        if (table.tablename === 'MetricsDaily') {
          count = await prisma.metricsDaily.count()
        } else if (table.tablename === 'WorkspaceSettings') {
          count = await prisma.workspaceSettings.count()
        } else if (table.tablename === 'WhopInstallation') {
          count = await prisma.whopInstallation.count()
        }
      } catch (e) {
        count = -1
      }

      tableInfo.push({
        name: table.tablename,
        rowCount: count,
      })
    }

    // Get Neon database info
    const dbUrl = process.env.DATABASE_URL || ''
    const dbHost = dbUrl.match(/ep-[a-z0-9-]+/)?.[0] || 'unknown'

    return NextResponse.json({
      ok: true,
      database: {
        host: dbHost,
        fullUrl: dbUrl.replace(/:[^:]+@/, ':***@'), // Hide password
      },
      tables: tableInfo,
      summary: {
        totalTables: tableInfo.length,
        whopInstallationExists: tableInfo.some((t) => t.name === 'WhopInstallation'),
      },
    })
  } catch (error) {
    console.error('Error fetching tables:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tables', details: String(error) },
      { status: 500 }
    )
  }
}

