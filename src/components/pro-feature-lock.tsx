/**
 * Pro feature lock component
 * Shows locked state for Pro-only features
 */

'use client'

import { useState } from 'react'
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
  const iframeSdk = useIframeSdk()

  const handleUpgrade = async () => {
    setIsUpgrading(true)
    
    try {
      const planId = process.env.NEXT_PUBLIC_WHOP_PRO_PLAN_ID
      
      if (!planId) {
        toast.error('Upgrade is not configured. Please contact support.')
        console.error('[Upgrade] NEXT_PUBLIC_WHOP_PRO_PLAN_ID not set!')
        setIsUpgrading(false)
        return
      }

      console.log('[ProFeatureLock] Starting upgrade flow...')
      
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
          disabled={isUpgrading}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {isUpgrading ? 'Processing...' : 'Upgrade to Pro'}
        </Button>
      </CardContent>
    </Card>
  )
}

