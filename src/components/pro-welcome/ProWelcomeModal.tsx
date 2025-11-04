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
    { icon: Mail, text: 'Daily revenue email reports', color: 'text-cyan-400' },
    { icon: TrendingUp, text: 'Churn risk detection', color: 'text-purple-400' },
    { icon: Zap, text: 'Discord alerts', color: 'text-pink-400' },
    { icon: Download, text: 'CSV export & 90-day history', color: 'text-blue-400' },
    { icon: Users, text: 'Top customers analytics', color: 'text-green-400' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95" />
      
      {/* Glowing particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-xl animate-pulse"
            style={{
              width: `${Math.random() * 60 + 40}px`,
              height: `${Math.random() * 60 + 40}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${Math.random() * 3 + 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
        <Card className="relative overflow-hidden border-2 border-cyan-500/30 bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl shadow-2xl">
          {/* Animated border glow */}
          <div 
            className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"
            style={{
              backgroundSize: '200% 100%',
              animation: 'shimmer 3s linear infinite',
            }}
          />
          
          {/* Content */}
          <CardContent className="relative p-8 md:p-12">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 z-10 text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 mb-6 shadow-lg shadow-cyan-500/50 animate-in zoom-in duration-500 delay-200">
                <Crown className="h-10 w-10 text-white" />
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                Welcome to Whoplytics Pro!
              </h1>
              
              <p className="text-lg text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
                You're all set to unlock powerful analytics and insights
              </p>
            </div>

            {/* Features grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {features.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/50 transition-all duration-300 hover:scale-105 animate-in fade-in slide-in-from-left-4 duration-500"
                    style={{ animationDelay: `${500 + index * 100}ms` }}
                  >
                    <div className={`p-2 rounded-lg bg-slate-700/50 ${feature.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{feature.text}</span>
                  </div>
                )
              })}
            </div>

            {/* CTA */}
            <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-1000">
              <Button
                onClick={onClose}
                size="lg"
                className="w-full md:w-auto px-8 py-6 text-lg font-semibold bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/70 transition-all hover:scale-105"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Get Started
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes shimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }
        `
      }} />
    </div>
  )
}

