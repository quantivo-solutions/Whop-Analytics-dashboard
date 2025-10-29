'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'

/**
 * Loads the Whop iFrame SDK for in-app purchases
 * Only loads when app is accessed via Whop iframe
 */
export function WhopSdkLoader() {
  const [isInIframe, setIsInIframe] = useState(false)

  useEffect(() => {
    // Check if we're in an iframe
    setIsInIframe(window.self !== window.top)
  }, [])

  // Only load SDK if we're in an iframe (Whop context)
  if (!isInIframe) {
    return null
  }

  return (
    <Script
      src="https://assets.whop.com/sdk/whop-app-sdk.js"
      strategy="afterInteractive"
      onLoad={() => {
        console.log('[Whop SDK] Loaded successfully')
      }}
      onError={(e) => {
        console.error('[Whop SDK] Failed to load:', e)
      }}
    />
  )
}

