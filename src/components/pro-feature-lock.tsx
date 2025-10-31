/**
 * Pro feature lock component
 * Shows locked state for Pro-only features
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock, Sparkles } from 'lucide-react'
import { useIframeSdk } from '@whop/react'
import { toast } from 'sonner'

interface ProFeatureLockProps {
  title: string
  description: string
  upgradeUrl?: string // Optional, kept for backward compatibility
}

export function ProFeatureLock({ title, description }: ProFeatureLockProps) {
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [isSdkReady, setIsSdkReady] = useState(false)
  const iframeSdk = useIframeSdk()

  // Check if SDK is ready
  useEffect(() => {
    const checkSdkReady = () => {
      if (iframeSdk && typeof iframeSdk.inAppPurchase === 'function') {
        setIsSdkReady(true)
        console.log('[ProFeatureLock] SDK is ready')
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
    setIsUpgrading(true)
    
    try {
      const planId = process.env.NEXT_PUBLIC_WHOP_PRO_PLAN_ID
      
      if (!planId) {
        toast.error('Upgrade is not configured. Please contact support.')
        console.error('[ProFeatureLock] NEXT_PUBLIC_WHOP_PRO_PLAN_ID not set!')
        setIsUpgrading(false)
        return
      }

      console.log('[ProFeatureLock] Starting upgrade flow...')
      console.log('[ProFeatureLock] iframeSdk available:', !!iframeSdk)
      console.log('[ProFeatureLock] inAppPurchase method available:', typeof iframeSdk?.inAppPurchase === 'function')
      
      // Wait for SDK to be ready (with timeout)
      const sdkReady = await waitForSdk()
      if (!sdkReady) {
        toast.error('SDK is not ready. Please wait a moment and try again.')
        console.error('[ProFeatureLock] SDK not ready after waiting')
        setIsUpgrading(false)
        return
      }

      console.log('[ProFeatureLock] SDK ready, calling inAppPurchase...')
      
      const result = await iframeSdk.inAppPurchase({ planId: planId })
      
      if (result.status === 'ok') {
        toast.success('Successfully upgraded to Pro! 🎉')
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        console.error('[ProFeatureLock] Purchase failed:', result.error)
        toast.error(result.error || 'Purchase failed. Please try again.')
      }
    } catch (error) {
      console.error('[ProFeatureLock] Error during purchase:', error)
      toast.error('Failed to start upgrade process. Please try again.')
    } finally {
      setIsUpgrading(false)
    }
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          {description}
        </p>
        <Button 
          onClick={handleUpgrade} 
          disabled={isUpgrading || !isSdkReady}
          className="gap-2"
          title={!isSdkReady ? 'Initializing...' : undefined}
        >
          <Sparkles className="h-4 w-4" />
          {isUpgrading ? 'Processing...' : 'Upgrade to Pro'}
        </Button>
      </CardContent>
    </Card>
  )
}

