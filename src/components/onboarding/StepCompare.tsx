'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { UpsellModal } from '../upsell/UpsellModal'

interface StepCompareProps {
  onChooseFree: () => void
  onChoosePro: () => void
}

export function StepCompare({ onChooseFree, onChoosePro }: StepCompareProps) {
  const [loading, setLoading] = useState<'free' | 'pro' | null>(null)
  const [upsellOpen, setUpsellOpen] = useState(false)

  const handleProClick = () => {
    setUpsellOpen(true)
  }

  const handleFreeClick = () => {
    setLoading('free')
    console.log('[Onboarding] choose_plan', { plan: 'free' })
    onChooseFree()
  }

  const handleUpsellClose = () => {
    setUpsellOpen(false)
    // When upsell modal closes, complete onboarding with pro selection
    setLoading('pro')
    console.log('[Onboarding] choose_plan', { plan: 'pro_cta' })
    onChoosePro()
  }

  return (
    <>
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-semibold">Pick your plan</h2>
          <p className="text-muted-foreground">Start free. Upgrade anytime.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Free Plan */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-semibold">Free</h3>
                <Badge variant="outline">Starter</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold">$0</p>
                <p className="text-sm text-muted-foreground">/ month</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">30-day dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Weekly email summary</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Core KPIs</span>
                </li>
              </ul>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleFreeClick}
                disabled={loading !== null}
              >
                {loading === 'free' ? 'Processing...' : 'Continue Free'}
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="border-2 border-primary/50 bg-gradient-to-b from-primary/5 to-transparent relative overflow-hidden">
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
            
            <CardHeader className="pb-4 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-semibold">Pro</h3>
                <Badge className="bg-primary text-primary-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Most Popular
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold">$15</p>
                <p className="text-sm text-muted-foreground">/ month</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Daily email reports</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Churn risk insights</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Trial conversion analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Discord alerts</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">CSV export & extended history</span>
                </li>
              </ul>
              <Button
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 ring-1 ring-primary/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.35)] transition-all"
                onClick={handleProClick}
                disabled={loading !== null}
              >
                Start 7-Day Free Trial
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Cancel anytime. No credit card lock-in.
        </p>
      </div>

      <UpsellModal open={upsellOpen} onClose={handleUpsellClose} />
    </>
  )
}
