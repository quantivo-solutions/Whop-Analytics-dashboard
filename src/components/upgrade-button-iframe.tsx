'use client'

import { Button } from './ui/button'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { UpsellModal } from './upsell/UpsellModal'

interface UpgradeButtonIframeProps {
  upgradeUrl?: string // Keep for backward compatibility
  plan: string
  experienceId?: string
}

export function UpgradeButtonIframe({ plan, experienceId }: UpgradeButtonIframeProps) {
  if (plan !== 'free') return null

  const [upsellOpen, setUpsellOpen] = useState(false)

  return (
    <>
      <Button 
        size="sm"
        onClick={() => setUpsellOpen(true)}
        className="gap-2 bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-500 hover:to-sky-600 hover:shadow-[0_0_30px_rgba(56,189,248,0.35)] text-white font-medium shadow-lg shadow-cyan-500/20 transition-all duration-300"
      >
        <Sparkles className="h-4 w-4" />
        Upgrade to Pro
      </Button>
      
      <UpsellModal open={upsellOpen} onClose={() => setUpsellOpen(false)} />
    </>
  )
}

