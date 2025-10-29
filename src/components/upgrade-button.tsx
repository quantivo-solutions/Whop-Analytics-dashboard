/**
 * Upgrade button component
 * Opens Whop app page in new tab
 */

'use client'

import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

interface UpgradeButtonProps {
  upgradeUrl: string
  size?: 'default' | 'sm' | 'lg'
  variant?: 'default' | 'outline'
}

export function UpgradeButton({ upgradeUrl, size = 'default', variant = 'default' }: UpgradeButtonProps) {
  const handleClick = () => {
    // Check if upgrade URL is properly configured
    if (!upgradeUrl || upgradeUrl === '#upgrade-not-configured') {
      alert('Upgrade is not configured yet. Please contact support or set NEXT_PUBLIC_WHOP_PRO_PASS_ID environment variable.')
      return
    }
    
    window.open(upgradeUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <Button onClick={handleClick} size={size} variant={variant} className="gap-2">
      <Sparkles className="h-4 w-4" />
      Upgrade to Pro
    </Button>
  )
}

