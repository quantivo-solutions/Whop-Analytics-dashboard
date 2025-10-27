'use client'

import { Button } from './ui/button'

interface UpgradeButtonIframeProps {
  upgradeUrl: string
  plan: string
}

export function UpgradeButtonIframe({ upgradeUrl, plan }: UpgradeButtonIframeProps) {
  if (plan !== 'free') return null

  const handleUpgrade = () => {
    // If in iframe, navigate parent window to upgrade page
    // This breaks out of the iframe to show Whop's payment flow
    if (window.parent !== window) {
      window.parent.location.href = upgradeUrl
    } else {
      // Fallback: open in new tab
      window.open(upgradeUrl, '_blank')
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

