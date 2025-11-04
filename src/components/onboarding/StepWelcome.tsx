'use client'

import { TrendingUp, Users, Target, Sparkles } from 'lucide-react'

export function StepWelcome() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-semibold">Welcome to Whoplytics</h2>
        <p className="text-muted-foreground">Your subscription business, at a glance.</p>
      </div>

      <div className="rounded-lg bg-muted/50 p-6 space-y-4">
        <h3 className="font-semibold">What you'll get:</h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-primary/10 p-1.5">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">Live revenue & member trends</p>
              <p className="text-sm text-muted-foreground">Real-time dashboard with key metrics</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-primary/10 p-1.5">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">Weekly insights in your inbox</p>
              <p className="text-sm text-muted-foreground">Automated summaries every week</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-primary/10 p-1.5">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">Clear goals with progress</p>
              <p className="text-sm text-muted-foreground">Track your monthly revenue targets</p>
            </div>
          </li>
        </ul>
      </div>

      {/* Dashboard preview illustration */}
      <div className="flex justify-center pt-6">
        <div className="relative w-full max-w-md">
          <div className="grid grid-cols-3 gap-3 p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-lg">
            {/* Revenue Card */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Revenue</span>
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">$12.5k</div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
            
            {/* Members Card */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Members</span>
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">248</div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full" style={{ width: '62%' }}></div>
              </div>
            </div>
            
            {/* Growth Card */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Growth</span>
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">+24%</div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-400 to-pink-500 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
            
            {/* Chart preview below */}
            <div className="col-span-3 mt-2 bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Monthly Trend</span>
                <Sparkles className="h-3 w-3 text-cyan-500" />
              </div>
              <div className="relative h-16">
                <svg viewBox="0 0 200 60" className="w-full h-full">
                  <defs>
                    <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Trend line */}
                  <path
                    d="M 10 50 Q 40 45, 70 35 T 130 20 L 190 15"
                    stroke="#06B6D4"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Gradient fill */}
                  <path
                    d="M 10 50 Q 40 45, 70 35 T 130 20 L 190 15 L 190 60 L 10 60 Z"
                    fill="url(#trendGradient)"
                  />
                  {/* Data points */}
                  <circle cx="40" cy="45" r="2.5" fill="#06B6D4" />
                  <circle cx="100" cy="28" r="2.5" fill="#06B6D4" />
                  <circle cx="160" cy="18" r="2.5" fill="#06B6D4" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

