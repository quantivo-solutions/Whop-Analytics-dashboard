'use client'

/**
 * Bootstrap Loading Component
 * Shows a loading state while historical data is being fetched
 */

import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface BootstrapLoadingProps {
  companyId: string
}

export function BootstrapLoading({ companyId }: BootstrapLoadingProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-primary/20 dark:border-primary/30">
        <CardContent className="pt-6 pb-6 px-6 text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Fetching your historical data…</h2>
            <p className="text-muted-foreground text-sm">
              This normally takes 10–20 seconds.
            </p>
          </div>
          
          <div className="pt-2">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

