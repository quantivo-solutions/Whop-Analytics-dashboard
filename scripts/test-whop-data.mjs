import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get Hafiz Usama's installation
  const hafizInstallation = await prisma.whopInstallation.findFirst({
    where: { userId: 'user_CjCXi3vpQWbhj' },
    orderBy: { createdAt: 'desc' }
  })
  
  if (!hafizInstallation) {
    console.log('❌ No installation found for Hafiz Usama')
    return
  }
  
  console.log('📊 Hafiz Usama Installation:')
  console.log(`   Company ID: ${hafizInstallation.companyId}`)
  console.log(`   Experience ID: ${hafizInstallation.experienceId}`)
  console.log(`   Access Token: ${hafizInstallation.accessToken ? 'Present' : 'Missing'}`)
  console.log(`   Plan: ${hafizInstallation.plan}`)
  
  // Try to fetch data from Whop API
  console.log('\n🌐 Fetching data from Whop API...\n')
  
  try {
    const response = await fetch('https://api.whop.com/api/v5/memberships?per=10', {
      headers: {
        'Authorization': `Bearer ${hafizInstallation.accessToken}`
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log(`❌ API Error (${response.status}):`, errorText)
      return
    }
    
    const data = await response.json()
    console.log('✅ Memberships Response:')
    console.log(JSON.stringify(data, null, 2))
    
    if (data.data && data.data.length === 0) {
      console.log('\n⚠️  HAFIZ USAMA HAS NO MEMBERSHIPS (NO CUSTOMERS)')
      console.log('This is expected for a test account with no business setup.')
      console.log('\nTo see real data in the dashboard, Hafiz Usama needs:')
      console.log('  1. Products created in their Whop')
      console.log('  2. Actual customer purchases/memberships')
      console.log('  3. Revenue data from Whop')
    }
    
  } catch (error) {
    console.error('❌ Fetch error:', error.message)
  }
  
  await prisma.$disconnect()
}

main()
