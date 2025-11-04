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
                  <span className="text-sm">7-day dashboard history</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">3 core KPIs (Revenue, New Members, Cancellations)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Weekly email summary</span>
                </li>
              </ul>
              <Button
                variant="outline"
                className="w-full border-2 hover:bg-muted/50"
                onClick={handleFreeClick}
                disabled={loading !== null}
              >
                {loading === 'free' ? 'Processing...' : 'Continue Free'}
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="border-2 border-cyan-400/50 dark:border-cyan-500/50 bg-gradient-to-br from-cyan-50/50 via-sky-50/30 to-transparent dark:from-cyan-950/30 dark:via-sky-950/20 dark:to-transparent relative overflow-hidden shadow-lg shadow-cyan-500/10">
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-transparent pointer-events-none" />
            
            <CardHeader className="pb-4 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold">Pro</h3>
                <Badge className="bg-gradient-to-r from-cyan-500 to-sky-500 text-white border-0 flex items-center gap-1 shadow-md">
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
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Everything in Free</span>
                </li>
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
                  <span className="text-sm">Trial conversion deep-dive</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Discord alerts</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">CSV export & 90-day history</span>
                </li>
              </ul>
              <Button
                className="w-full bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-500 hover:to-sky-600 hover:shadow-[0_0_30px_rgba(56,189,248,0.35)] text-white font-medium shadow-lg shadow-cyan-500/20 transition-all duration-300"
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
