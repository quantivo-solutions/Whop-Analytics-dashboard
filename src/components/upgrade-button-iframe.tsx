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
        setIsLoading(false)
        return
      }

      console.log('[Upgrade] Plan ID:', planId)
      console.log('[Upgrade] Checking for WhopApp SDK...')
      console.log('[Upgrade] window.WhopApp available?', typeof (window as any).WhopApp)
      console.log('[Upgrade] window.Whop available?', typeof (window as any).Whop)
      
      // Wait a bit for SDK to load if needed
      let whopApp = (window as any).WhopApp || (window as any).Whop
      
      if (!whopApp) {
        // Wait up to 2 seconds for SDK to load
        console.log('[Upgrade] SDK not found, waiting...')
        for (let i = 0; i < 20; i++) {
          await new Promise(resolve => setTimeout(resolve, 100))
          whopApp = (window as any).WhopApp || (window as any).Whop
          if (whopApp) {
            console.log('[Upgrade] SDK found after waiting!')
            break
          }
        }
      }

      // Check if we have the Whop SDK
      if (whopApp && typeof whopApp.inAppPurchase === 'function') {
        console.log('[Upgrade] Using Whop SDK for in-app purchase')
        
        // Simple plan purchase (no checkout session needed for basic flow)
        const purchaseParams = { planId }
        
        console.log('[Upgrade] Calling inAppPurchase with:', purchaseParams)
        const result = await whopApp.inAppPurchase(purchaseParams)
        console.log('[Upgrade] Purchase result:', result)
        
        if (result.status === 'ok') {
          toast.success('Successfully upgraded to Pro! 🎉')
          // Reload page to show updated plan
          setTimeout(() => window.location.reload(), 1000)
        } else {
          toast.error(result.error || 'Purchase failed')
        }
      } else {
        // SDK not available - show helpful error
        console.error('[Upgrade] Whop SDK not available!')
        console.error('[Upgrade] window.WhopApp:', (window as any).WhopApp)
        console.error('[Upgrade] window.Whop:', (window as any).Whop)
        console.error('[Upgrade] Are we in an iframe?', window.self !== window.top)
        
        toast.error('Whop SDK not loaded. Please refresh the page and try again.')
      }
    } catch (error) {
      console.error('[Upgrade] Error:', error)
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

