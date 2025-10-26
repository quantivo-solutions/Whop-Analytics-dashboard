/**
 * Simple CSS-based chart component
 * No external dependencies required
 */

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardSeries } from '@/lib/metrics'

interface SimpleChartProps {
  data: DashboardSeries[]
  title?: string
  description?: string
}

export function SimpleChart({ data, title = "Revenue Trend", description }: SimpleChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    )
  }

  // Find max value for scaling
  const maxRevenue = Math.max(...data.map(d => d.grossRevenue), 1)
  const maxMembers = Math.max(...data.map(d => d.activeMembers), 1)

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-6">
      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
          <CardDescription>
            Last {data.length} days • Total: {formatCurrency(data.reduce((sum, d) => sum + d.grossRevenue, 0))}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.map((day, index) => {
              const height = maxRevenue > 0 ? (day.grossRevenue / maxRevenue) * 100 : 0
              return (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-16 text-xs text-muted-foreground text-right">
                    {formatDate(day.date)}
                  </div>
                  <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden relative group">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-300 hover:from-green-600 hover:to-emerald-700"
                      style={{ width: `${height}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs font-medium text-white drop-shadow-md">
                        {formatCurrency(day.grossRevenue)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Members Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Active Members Over Time</CardTitle>
          <CardDescription>
            Last {data.length} days • Peak: {Math.max(...data.map(d => d.activeMembers))} members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.map((day, index) => {
              const height = maxMembers > 0 ? (day.activeMembers / maxMembers) * 100 : 0
              const isIncrease = index > 0 && day.activeMembers > data[index - 1].activeMembers
              const isDecrease = index > 0 && day.activeMembers < data[index - 1].activeMembers
              
              return (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-16 text-xs text-muted-foreground text-right">
                    {formatDate(day.date)}
                  </div>
                  <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden relative group">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isIncrease
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700'
                          : isDecrease
                          ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                      }`}
                      style={{ width: `${height}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs font-medium text-white drop-shadow-md">
                        {day.activeMembers} members
                        {day.newMembers > 0 && ` (+${day.newMembers} new)`}
                        {day.cancellations > 0 && ` (-${day.cancellations} canceled)`}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Period Summary</CardTitle>
          <CardDescription>Last {data.length} days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(data.reduce((sum, d) => sum + d.grossRevenue, 0))}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">New Members</p>
              <p className="text-2xl font-bold text-blue-600">
                +{data.reduce((sum, d) => sum + d.newMembers, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cancellations</p>
              <p className="text-2xl font-bold text-red-600">
                {data.reduce((sum, d) => sum + d.cancellations, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Trials Converted</p>
              <p className="text-2xl font-bold text-indigo-600">
                {data.reduce((sum, d) => sum + d.trialsPaid, 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

