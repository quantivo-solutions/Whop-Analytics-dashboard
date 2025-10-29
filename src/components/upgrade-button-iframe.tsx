'use client'

import { Button } from './ui/button'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'
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
      
      // Use Whop's iframeSdk.inAppPurchase() as per official docs
      const result = await iframeSdk.inAppPurchase({ 
        planId: planId 
      })
      
      console.log('[Upgrade] Purchase result:', result)
      
      if (result.status === 'ok') {
        toast.success('Successfully upgraded to Pro! 🎉')
        console.log('[Upgrade] Receipt ID:', result.data?.receipt_id)
        
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
      disabled={isLoading}
      className="gap-2"
    >
      <Sparkles className="h-4 w-4" />
      {isLoading ? 'Processing...' : 'Upgrade to Pro'}
    </Button>
  )
}

