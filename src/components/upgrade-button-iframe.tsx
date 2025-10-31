'use client'

import { Button } from './ui/button'
import { Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useIframeSdk } from '@whop/react'

interface UpgradeButtonIframeProps {
  upgradeUrl?: string // Keep for backward compatibility
  plan: string
  experienceId?: string
}

export function UpgradeButtonIframe({ plan, experienceId }: UpgradeButtonIframeProps) {
  if (plan !== 'free') return null

  const iframeSdk = useIframeSdk()
  const [isLoading, setIsLoading] = useState(false)
  const [isSdkReady, setIsSdkReady] = useState(false)

  // Check if SDK is ready
  useEffect(() => {
    const checkSdkReady = () => {
      if (iframeSdk && typeof iframeSdk.inAppPurchase === 'function') {
        setIsSdkReady(true)
        console.log('[Upgrade] SDK is ready')
      } else {
        setIsSdkReady(false)
        // Retry after a short delay if not ready
        setTimeout(checkSdkReady, 100)
      }
    }

    checkSdkReady()
  }, [iframeSdk])

  const waitForSdk = async (maxWait = 3000): Promise<boolean> => {
    const startTime = Date.now()
    while (Date.now() - startTime < maxWait) {
      if (iframeSdk && typeof iframeSdk.inAppPurchase === 'function') {
        return true
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return false
  }

  const handleUpgrade = async () => {
    setIsLoading(true)
    
    try {
      // Get the plan ID from environment variable
      const planId = process.env.NEXT_PUBLIC_WHOP_PRO_PLAN_ID
      
      if (!planId) {
        toast.error('Upgrade is not configured. Please contact support.')
        console.error('[Upgrade] NEXT_PUBLIC_WHOP_PRO_PLAN_ID not set!')
        setIsLoading(false)
        return
      }

      console.log('[Upgrade] Starting upgrade flow...')
      console.log('[Upgrade] Plan ID:', planId)
      console.log('[Upgrade] Experience ID:', experienceId || 'none')
      console.log('[Upgrade] iframeSdk available:', !!iframeSdk)
      console.log('[Upgrade] inAppPurchase method available:', typeof iframeSdk?.inAppPurchase === 'function')
      
      // Wait for SDK to be ready (with timeout)
      const sdkReady = await waitForSdk()
      if (!sdkReady) {
        toast.error('SDK is not ready. Please wait a moment and try again.')
        console.error('[Upgrade] SDK not ready after waiting')
        setIsLoading(false)
        return
      }

      console.log('[Upgrade] SDK ready, calling inAppPurchase...')
      
      // Use Whop's iframeSdk.inAppPurchase() as per official docs
      const result = await iframeSdk.inAppPurchase({ 
        planId: planId 
      })
      
      console.log('[Upgrade] Purchase result:', result)
      
      if (result.status === 'ok') {
        toast.success('Successfully upgraded to Pro! 🎉')
        console.log('[Upgrade] Receipt ID:', result.data?.receiptId)
        
        // Reload page to show updated plan
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        console.error('[Upgrade] Purchase failed:', result.error)
        toast.error(result.error || 'Purchase failed. Please try again.')
      }
    } catch (error) {
      console.error('[Upgrade] Error during purchase:', error)
      toast.error('Failed to start upgrade process. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      variant="default" 
      size="sm"
      onClick={handleUpgrade}
      disabled={isLoading || !isSdkReady}
      className="gap-2"
      title={!isSdkReady ? 'Initializing...' : undefined}
    >
      <Sparkles className="h-4 w-4" />
      {isLoading ? 'Processing...' : 'Upgrade to Pro'}
    </Button>
  )
}

