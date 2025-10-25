#!/usr/bin/env tsx
/**
 * Script to send weekly analytics report
 * 
 * Usage:
 *   tsx scripts/send-weekly-report.ts email@example.com
 *   tsx scripts/send-weekly-report.ts email1@example.com email2@example.com
 * 
 * This can be scheduled to run every Sunday using cron:
 *   0 9 * * 0 cd /path/to/project && tsx scripts/send-weekly-report.ts your@email.com
 */

import { sendWeeklySummaryEmail } from '../src/lib/email'

async function main() {
  // Get email addresses from command line arguments
  const emails = process.argv.slice(2)

  if (emails.length === 0) {
    console.error('❌ Error: No email addresses provided')
    console.error('\nUsage:')
    console.error('  tsx scripts/send-weekly-report.ts email@example.com')
    console.error('  tsx scripts/send-weekly-report.ts email1@example.com email2@example.com')
    console.error('\nOr set REPORT_EMAIL environment variable:')
    console.error('  REPORT_EMAIL=email@example.com tsx scripts/send-weekly-report.ts')
    process.exit(1)
  }

  console.log(`📧 Sending weekly report to: ${emails.join(', ')}`)

  try {
    const result = await sendWeeklySummaryEmail(emails)
    console.log('✅ Weekly report sent successfully!')
    console.log('Result:', result)
    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to send weekly report:')
    console.error(error)
    process.exit(1)
  }
}

// Check if REPORT_EMAIL env var is set and use it if no CLI args
const emails = process.argv.slice(2)
if (emails.length === 0 && process.env.REPORT_EMAIL) {
  process.argv.push(process.env.REPORT_EMAIL)
}

main()

