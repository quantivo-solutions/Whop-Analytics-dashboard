'use client'

import { Button } from './ui/button'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface UpgradeButtonIframeProps {
  upgradeUrl?: string // Keep for backward compatibility
  plan: string
  experienceId?: string
}

export function UpgradeButtonIframe({ plan, experienceId }: UpgradeButtonIframeProps) {
  if (plan !== 'free') return null

  const [isLoading, setIsLoading] = useState(false)

  const handleUpgrade = async () => {
    setIsLoading(true)
    
    try {
      // Get the plan ID from environment variable
      const planId = process.env.NEXT_PUBLIC_WHOP_PRO_PLAN_ID
      
      if (!planId) {
        toast.error('Upgrade is not configured. Please contact support.')
        console.error('NEXT_PUBLIC_WHOP_PRO_PLAN_ID not set!')
        return
      }

      // Check if we're in a Whop iframe (has access to Whop SDK)
      if (typeof window !== 'undefined' && (window as any).WhopApp) {
        // Use Whop's native in-app purchase modal
        const whopApp = (window as any).WhopApp
        
        // If experienceId is provided, create checkout session with metadata
        // Otherwise, use simple plan purchase
        let purchaseParams: any = { planId }
        
        if (experienceId) {
          // Create checkout session with experience metadata
          const checkoutSession = await fetch('/api/whop/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId, experienceId }),
          }).then(res => res.json())
          
          purchaseParams = checkoutSession
        }
        
        const result = await whopApp.inAppPurchase(purchaseParams)
        
        if (result.status === 'ok') {
          toast.success('Successfully upgraded to Pro! 🎉')
          // Reload page to show updated plan
          setTimeout(() => window.location.reload(), 1000)
        } else {
          toast.error(result.error || 'Purchase failed')
        }
      } else {
        // Fallback: If not in iframe, open Whop purchase page in new tab
        // This shouldn't happen in normal usage but provides graceful fallback
        const fallbackUrl = `https://whop.com/purchase/${planId}`
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer')
        toast.info('Opening upgrade page...')
      }
    } catch (error) {
      console.error('Upgrade error:', error)
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

