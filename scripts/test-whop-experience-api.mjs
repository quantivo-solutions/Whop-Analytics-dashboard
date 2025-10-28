/**
 * Test script to see what data Whop provides for an experience
 */

import dotenv from 'dotenv'
dotenv.config()

const WHOP_APP_SERVER_KEY = process.env.WHOP_APP_SERVER_KEY
const experienceId = process.argv[2] || 'exp_75NS2OapWFc535'

if (!WHOP_APP_SERVER_KEY) {
  console.error('❌ WHOP_APP_SERVER_KEY not found in environment')
  process.exit(1)
}

console.log(`🔍 Fetching experience data for: ${experienceId}\n`)

try {
  // Try to get experience details from Whop API
  const response = await fetch(`https://api.whop.com/api/v5/experiences/${experienceId}`, {
    headers: {
      'Authorization': `Bearer ${WHOP_APP_SERVER_KEY}`,
      'Content-Type': 'application/json'
    }
  })
  
  console.log(`Status: ${response.status} ${response.statusText}`)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ Error response:', errorText)
    process.exit(1)
  }
  
  const data = await response.json()
  console.log('\n📦 Experience Data:')
  console.log(JSON.stringify(data, null, 2))
  
  if (data.company_id) {
    console.log(`\n✅ Company ID: ${data.company_id}`)
  }
  
} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}
