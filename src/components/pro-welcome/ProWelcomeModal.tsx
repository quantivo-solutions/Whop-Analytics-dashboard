'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles, TrendingUp, Mail, Zap, Download, Users, Crown, X, Check } from 'lucide-react'

interface ProWelcomeModalProps {
  open: boolean
  onClose: () => void
}

export function ProWelcomeModal({ open, onClose }: ProWelcomeModalProps) {
  if (!open) return null

  const features = [
    { icon: Mail, text: 'Daily revenue email reports' },
    { icon: TrendingUp, text: 'Churn risk detection' },
    { icon: Zap, text: 'Discord alerts' },
    { icon: Download, text: 'CSV export & 90-day history' },
    { icon: Users, text: 'Top customers analytics' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      {/* Background gradient overlay - matching Wizard style */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-slate-950/80 dark:from-black/90 dark:via-slate-900/70 dark:to-black/90" />
      
      <Card className="relative w-full max-w-[820px] rounded-2xl border shadow-2xl bg-background/95 backdrop-blur-sm">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-10"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
        
        <CardContent className="p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Crown className="h-8 w-8 text-primary" />
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold mb-3 text-foreground">
              Welcome to Whoplytics Pro!
            </h1>
            
            <p className="text-base text-muted-foreground">
              You're all set to unlock powerful analytics and insights
            </p>
          </div>

          {/* Pro Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Pro Plan Active</span>
            </div>
          </div>

          {/* Features list */}
          <div className="space-y-3 mb-8">
            <p className="text-sm font-semibold text-foreground mb-4 text-center">Your Pro features:</p>
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border hover:bg-muted transition-colors"
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{feature.text}</span>
                </div>
              )
            })}
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button
              onClick={onClose}
              size="lg"
              className="w-full md:w-auto px-8 py-6 text-base font-semibold"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Get Started
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

