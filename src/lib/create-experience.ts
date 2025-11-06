/**
 * Create a Whop experience for a company
 * This is called when a new company installs the app
 */

import { env } from '@/lib/env'
import { whopSdk } from '@/lib/whop-sdk'

export async function createExperienceForCompany(companyId: string, accessToken?: string): Promise<string | null> {
  try {
    console.log(`[Create Experience] Creating experience for company: ${companyId}`)
    
    const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID
    if (!appId) {
      console.error('[Create Experience] ❌ NEXT_PUBLIC_WHOP_APP_ID not set')
      return null
    }
    
    // Try using Whop SDK if available
    try {
      // Check if experiences.create method exists
      if (whopSdk && typeof (whopSdk as any).experiences?.create === 'function') {
        const experience = await (whopSdk as any).experiences.create({
          app_id: appId,
          company_id: companyId,
        })
        
        if (experience?.id) {
          console.log(`[Create Experience] ✅ Created experience via SDK: ${experience.id}`)
          return experience.id
        }
      }
    } catch (sdkError) {
      console.warn('[Create Experience] ⚠️ SDK method failed, trying direct API:', sdkError)
    }
    
    // Fallback: Use direct API call
    const apiKey = accessToken || env.WHOP_APP_SERVER_KEY
    if (!apiKey) {
      console.error('[Create Experience] ❌ No API key available')
      return null
    }
    
    const response = await fetch('https://api.whop.com/api/v5/experiences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: appId,
        company_id: companyId,
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Create Experience] ❌ Failed to create experience (${response.status}):`, errorText)
      
      // Don't fail if experience already exists (409 conflict)
      if (response.status === 409) {
        console.log('[Create Experience] ⚠️ Experience may already exist (409 conflict)')
        // Try to fetch existing experiences instead
        return await fetchExistingExperienceId(companyId, apiKey)
      }
      
      return null
    }
    
    const experienceData = await response.json()
    const experienceId = experienceData.id || experienceData.data?.id
    
    if (experienceId) {
      console.log(`[Create Experience] ✅ Created experience via API: ${experienceId}`)
      return experienceId
    } else {
      console.error('[Create Experience] ❌ Response missing experience ID:', experienceData)
      return null
    }
  } catch (error) {
    console.error('[Create Experience] ❌ Error creating experience:', error)
    return null
  }
}

/**
 * Fetch existing experience ID for a company
 */
async function fetchExistingExperienceId(companyId: string, apiKey: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.whop.com/api/v5/companies/${companyId}/experiences`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })
    
    if (response.ok) {
      const data = await response.json()
      const experiences = data.data || data || []
      
      if (experiences.length > 0) {
        const experienceId = experiences[0].id
        console.log(`[Create Experience] ✅ Found existing experience: ${experienceId}`)
        return experienceId
      }
    }
    
    return null
  } catch (error) {
    console.error('[Create Experience] ❌ Error fetching existing experiences:', error)
    return null
  }
}

