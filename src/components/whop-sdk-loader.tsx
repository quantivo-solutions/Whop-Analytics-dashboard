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
    const inIframe = window.self !== window.top
    setIsInIframe(inIframe)
    console.log('[Whop SDK Loader] In iframe?', inIframe)
    
    // Check if SDK is already loaded
    if ((window as any).WhopApp || (window as any).Whop) {
      console.log('[Whop SDK Loader] SDK already available:', {
        WhopApp: typeof (window as any).WhopApp,
        Whop: typeof (window as any).Whop
      })
    }
  }, [])

  // Only load SDK if we're in an iframe (Whop context)
  if (!isInIframe) {
    console.log('[Whop SDK Loader] Not in iframe, skipping SDK load')
    return null
  }

  return (
    <Script
      src="https://assets.whop.com/sdk/whop-app-sdk.js"
      strategy="afterInteractive"
      onLoad={() => {
        console.log('[Whop SDK] Script loaded successfully')
        console.log('[Whop SDK] window.WhopApp:', typeof (window as any).WhopApp)
        console.log('[Whop SDK] window.Whop:', typeof (window as any).Whop)
        
        // Log available methods
        const whopApp = (window as any).WhopApp || (window as any).Whop
        if (whopApp) {
          console.log('[Whop SDK] Available methods:', Object.keys(whopApp))
        }
      }}
      onError={(e) => {
        console.error('[Whop SDK] Failed to load script:', e)
      }}
    />
  )
}

