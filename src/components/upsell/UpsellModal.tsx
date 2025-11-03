'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Check } from 'lucide-react'
// Note: env.NEXT_PUBLIC_WHOP_APP_ID is available on client via process.env

interface UpsellModalProps {
  open: boolean
  onClose: () => void
  planFeatures?: string[]
}

const DEFAULT_FEATURES = [
  'Daily revenue email reports',
  'Churn risk detection',
  'Discord alerts',
  'Extended history & CSV export',
  'Top customers analytics',
]

export function UpsellModal({ open, onClose, planFeatures = DEFAULT_FEATURES }: UpsellModalProps) {
  const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID || ''
  const upgradeUrl = appId ? `https://whop.com/apps/${appId}` : '/upgrade'

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upgrade to Whoplytics Pro</DialogTitle>
          <DialogDescription>
            Unlock advanced analytics and automated insights to grow your business faster.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-3">
            {planFeatures.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-primary/10 p-1">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm">{feature}</p>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>
            Maybe Later
          </Button>
          <Button
            onClick={() => {
              window.open(upgradeUrl, '_blank')
            }}
          >
            Start 7-Day Free Trial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

