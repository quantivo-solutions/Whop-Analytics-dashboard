'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles, TrendingUp, Mail, Zap, Download, Users, Crown, X } from 'lucide-react'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      {/* Background gradient overlay - matching Wizard style */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-slate-950/80 dark:from-black/90 dark:via-slate-900/70 dark:to-black/90" />
      
      <div className="relative w-full max-w-[720px] my-8">
        <Card className="relative rounded-2xl border-2 border-cyan-400/30 dark:border-cyan-500/30 shadow-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 backdrop-blur-sm overflow-hidden">
          {/* Decorative gradient border */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-sky-400/10 to-cyan-400/20 opacity-60 pointer-events-none" />
          
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 z-10 hover:bg-cyan-400/10 text-slate-600 dark:text-slate-400"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <CardContent className="relative p-8 md:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400/20 via-sky-400/20 to-cyan-400/10 mb-6 ring-4 ring-cyan-400/20 shadow-xl animate-in zoom-in duration-500">
                <Crown className="h-12 w-12 text-cyan-500 dark:text-cyan-400" />
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-cyan-600 to-sky-600 dark:from-cyan-400 dark:to-sky-400 bg-clip-text text-transparent">
                Welcome to Whoplytics Pro!
              </h1>
              
              <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 font-medium">
                You're all set to unlock powerful analytics and insights
              </p>
            </div>

            {/* Pro Badge */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-cyan-400 to-sky-500 shadow-lg shadow-cyan-500/30 border-2 border-cyan-300/50">
                <Sparkles className="h-4 w-4 text-white" />
                <span className="text-sm font-bold text-white">Pro Plan Active</span>
              </div>
            </div>

            {/* Features list */}
            <div className="space-y-3 mb-8">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 text-center uppercase tracking-wider">Your Pro Features</p>
              <div className="grid gap-3">
                {features.map((feature, index) => {
                  const Icon = feature.icon
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-cyan-400/50 dark:hover:border-cyan-500/50 hover:shadow-lg transition-all duration-300 group shadow-md"
                    >
                      <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-400/10 to-sky-400/10 group-hover:from-cyan-400/20 group-hover:to-sky-400/20 transition-colors ring-2 ring-cyan-400/20">
                        <Icon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <span className="text-base font-semibold text-slate-900 dark:text-slate-100 flex-1">{feature.text}</span>
                      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* CTA */}
            <div className="text-center pt-2">
              <Button
                onClick={onClose}
                size="lg"
                className="w-full md:w-auto min-w-[240px] px-8 py-6 text-base font-bold bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-500 hover:to-sky-600 hover:shadow-[0_0_30px_rgba(56,189,248,0.35)] text-white shadow-xl shadow-cyan-500/30 transition-all duration-300 hover:scale-105"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Get Started
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

