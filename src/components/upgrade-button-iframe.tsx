'use client'

import { Button } from './ui/button'

interface UpgradeButtonIframeProps {
  upgradeUrl: string
  plan: string
}

export function UpgradeButtonIframe({ upgradeUrl, plan }: UpgradeButtonIframeProps) {
  if (plan !== 'free') return null

  const handleUpgrade = () => {
    // Check if upgrade URL is properly configured
    if (!upgradeUrl || upgradeUrl === '#upgrade-not-configured') {
      alert('Upgrade is not configured yet. Please contact support.')
      return
    }
    
    // Try multiple methods to break out of iframe
    try {
      // Method 1: Use _top target (breaks out of all frames)
      window.open(upgradeUrl, '_top')
    } catch (e) {
      try {
        // Method 2: Navigate parent
        if (window.parent !== window) {
          window.parent.location.href = upgradeUrl
        } else {
          // Method 3: Navigate top-level window
          window.top!.location.href = upgradeUrl
        }
      } catch (err) {
        // Fallback: open in new tab
        window.open(upgradeUrl, '_blank')
      }
    }
  }

  return (
    <Button 
      variant="default" 
      size="sm"
      onClick={handleUpgrade}
    >
      Upgrade to Pro
    </Button>
  )
}

