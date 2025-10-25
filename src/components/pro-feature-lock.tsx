/**
 * Pro feature lock component
 * Shows locked state for Pro-only features
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Lock } from 'lucide-react'
import { UpgradeButton } from './upgrade-button'

interface ProFeatureLockProps {
  title: string
  description: string
  upgradeUrl: string
}

export function ProFeatureLock({ title, description, upgradeUrl }: ProFeatureLockProps) {
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
        <UpgradeButton upgradeUrl={upgradeUrl} />
      </CardContent>
    </Card>
  )
}

