'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Check } from 'lucide-react'
import { useIframeSdk } from '@whop/react'
import { toast } from 'sonner'

interface UpsellModalProps {
  open: boolean
  onClose: () => void
  planFeatures?: string[]
}

const DEFAULT_FEATURES = [
  'Daily revenue email reports',
  'Churn risk detection',
  'Trial conversion deep-dive',
  'Discord alerts',
  'CSV export & 90-day history',
]

export function UpsellModal({ open, onClose, planFeatures = DEFAULT_FEATURES }: UpsellModalProps) {
  const iframeSdk = useIframeSdk()
  const [isLoading, setIsLoading] = useState(false)
  const [isSdkReady, setIsSdkReady] = useState(false)

  // Check if SDK is ready
  useEffect(() => {
    const checkSdkReady = () => {
      if (iframeSdk && typeof iframeSdk.inAppPurchase === 'function') {
        setIsSdkReady(true)
        console.log('[UpsellModal] SDK is ready')
      } else {
        setIsSdkReady(false)
        // Retry after a short delay if not ready
        setTimeout(checkSdkReady, 100)
      }
    }

    if (open) {
      checkSdkReady()
    }
  }, [iframeSdk, open])

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
    console.log('[UpsellModal] ===== UPGRADE CLICKED =====')
    setIsLoading(true)
    
    try {
      // Get the plan ID from environment variable
      const planId = process.env.NEXT_PUBLIC_WHOP_PRO_PLAN_ID
      
      console.log('[UpsellModal] Plan ID from env:', planId)
      console.log('[UpsellModal] iframeSdk object:', iframeSdk)
      console.log('[UpsellModal] iframeSdk methods:', Object.keys(iframeSdk || {}))
      
      if (!planId) {
        toast.error('Upgrade is not configured. Please contact support.')
        console.error('[UpsellModal] NEXT_PUBLIC_WHOP_PRO_PLAN_ID not set!')
        setIsLoading(false)
        return
      }

      console.log('[UpsellModal] Starting upgrade flow...')
      console.log('[UpsellModal] Plan ID:', planId)
      console.log('[UpsellModal] iframeSdk available:', !!iframeSdk)
      console.log('[UpsellModal] inAppPurchase method available:', typeof iframeSdk?.inAppPurchase === 'function')
      
      // Wait for SDK to be ready (with timeout)
      const sdkReady = await waitForSdk()
      if (!sdkReady) {
        toast.error('SDK is not ready. Please wait a moment and try again.')
        console.error('[UpsellModal] SDK not ready after waiting')
        setIsLoading(false)
        return
      }

      console.log('[UpsellModal] SDK ready, calling inAppPurchase...')
      console.log('[UpsellModal] Calling with planId:', planId)
      
      // Use Whop's iframeSdk.inAppPurchase() as per official docs
      const result = await iframeSdk.inAppPurchase({ 
        planId: planId 
      })
      
      console.log('[UpsellModal] ===== PURCHASE RESULT =====')
      console.log('[UpsellModal] Full result:', JSON.stringify(result, null, 2))
      console.log('[UpsellModal] Result status:', result.status)
      
      if (result.status === 'ok') {
        console.log('[UpsellModal] Result data:', result.data)
        toast.success('Successfully upgraded to Pro! 🎉')
        console.log('[UpsellModal] Receipt ID:', result.data.receiptId)
        
        // Try to sync plan immediately (webhook might be delayed)
        try {
          console.log('[UpsellModal] Attempting to sync plan...')
          const syncResponse = await fetch('/api/plan/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
          
          if (syncResponse.ok) {
            const syncData = await syncResponse.json()
            console.log('[UpsellModal] Plan sync response:', syncData)
          } else {
            console.warn('[UpsellModal] Plan sync failed:', await syncResponse.text())
          }
        } catch (syncError) {
          console.warn('[UpsellModal] Plan sync error (non-critical):', syncError)
          // Don't fail the purchase if sync fails - webhook will handle it
        }
        
        // Close modal and reload page to show updated plan
        onClose()
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        console.error('[UpsellModal] Purchase failed:', result.error)
        console.error('[UpsellModal] Error details:', result)
        toast.error(result.error || 'Purchase failed. Please try again.')
      }
    } catch (error) {
      console.error('[UpsellModal] ===== ERROR DURING PURCHASE =====')
      console.error('[UpsellModal] Error:', error)
      console.error('[UpsellModal] Error message:', error instanceof Error ? error.message : String(error))
      console.error('[UpsellModal] Error stack:', error instanceof Error ? error.stack : 'No stack')
      toast.error('Failed to start upgrade process. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID
  const upgradeUrl = appId ? `https://whop.com/apps/${appId}` : '#'

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-background/95 backdrop-blur-sm border-2">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-sky-500 bg-clip-text text-transparent">
            Upgrade to Whoplytics Pro
          </DialogTitle>
          <DialogDescription>
            Unlock advanced analytics and automated insights to grow your business faster.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-3">
            {planFeatures.map((feature, index) => (
              <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="mt-0.5 rounded-full bg-primary/10 p-1.5 ring-1 ring-primary/20">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-medium">{feature}</p>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="w-full sm:w-auto border-2 hover:bg-muted/50 transition-colors"
          >
            Continue Free
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={isLoading || !isSdkReady}
            className="gap-2 w-full sm:w-auto bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-500 hover:to-sky-600 hover:shadow-[0_0_30px_rgba(56,189,248,0.35)] text-white font-medium shadow-lg shadow-cyan-500/20 transition-all duration-300"
          >
            {isLoading ? 'Processing...' : 'Start 7-Day Free Trial'}
          </Button>
          {/* Fallback: Direct redirect button if SDK fails */}
          {!isSdkReady && (
            <Button
              onClick={() => {
                const planId = process.env.NEXT_PUBLIC_WHOP_PRO_PLAN_ID
                if (planId) {
                  console.log('[UpsellModal] Fallback: Redirecting to purchase page:', planId)
                  if (window.parent && window.parent !== window) {
                    window.parent.location.href = `https://whop.com/purchase/${planId}`
                  } else {
                    window.location.href = `https://whop.com/purchase/${planId}`
                  }
                } else {
                  toast.error('Upgrade is not configured.')
                }
              }}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Upgrade via Whop
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
