import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, Users, UserPlus, UserMinus, CheckCircle, TrendingUp, TrendingDown, Settings } from "lucide-react"
import { prisma } from "@/lib/prisma"

// Disable caching for this page to ensure Whop badge updates
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Dashboard() {
  // Check if Whop account is connected
  const whopAccount = await prisma.workspaceSettings.findFirst({
    include: {
      whopAccount: true,
    },
  })
  const isWhopConnected = !!whopAccount?.whopAccount

  // Get latest metrics from database
  const latestMetric = await prisma.metricsDaily.findFirst({
    orderBy: { date: 'desc' }
  })

  // Check if data is fresh (within last 24 hours)
  const now = new Date()
  const latestDate = latestMetric ? new Date(latestMetric.date) : null
  const hoursSinceLastSync = latestDate 
    ? (now.getTime() - latestDate.getTime()) / (1000 * 60 * 60)
    : null
  const isDataFresh = hoursSinceLastSync !== null && hoursSinceLastSync <= 24
  const lastSyncText = latestDate 
    ? `${latestDate.toLocaleDateString()} ${latestDate.toLocaleTimeString()}`
    : 'Never'

  // Get last 30 days for chart (ordered by date ASC for chronological display)
  const chartData = await prisma.metricsDaily.findMany({
    orderBy: { date: 'asc' },
    take: 30
  })

  // If no data, show placeholder message
  if (!latestMetric) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">No data available</h1>
          <p className="text-muted-foreground">Please seed the database with data</p>
        </div>
      </div>
    )
  }

  // Format the data for display
  const statsData = [
    {
      title: "Gross Revenue",
      value: `$${latestMetric.grossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      description: `as of ${new Date(latestMetric.date).toLocaleDateString()}`,
      icon: DollarSign,
      trend: "up"
    },
    {
      title: "Active Members",
      value: latestMetric.activeMembers.toLocaleString(),
      description: "currently active",
      icon: Users,
      trend: "up"
    },
    {
      title: "New Members",
      value: latestMetric.newMembers.toLocaleString(),
      description: "joined recently",
      icon: UserPlus,
      trend: "up"
    },
    {
      title: "Cancellations",
      value: latestMetric.cancellations.toLocaleString(),
      description: "this period",
      icon: UserMinus,
      trend: "down"
    },
    {
      title: "Trials Paid",
      value: latestMetric.trialsPaid.toLocaleString(),
      description: "converted to paid",
      icon: CheckCircle,
      trend: "up"
    }
  ]
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              {isWhopConnected && (
                <span 
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
                    isDataFresh 
                      ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                  }`}
                  title={`Data from Whop v2 API. Last sync: ${lastSyncText}`}
                >
                  {isDataFresh ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      LIVE (Whop)
                    </>
                  ) : (
                    <>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-400"></span>
                      STALE
                    </>
                  )}
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              Analytics overview with {chartData.length} days of data
            </p>
          </div>
          <Link href="/settings">
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {statsData.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {stat.trend === "up" ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Chart Data Preview */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>30-Day Trend Data</CardTitle>
              <CardDescription>
                Revenue and member metrics over the last {chartData.length} days (ready for charting)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <p>📊 Chart data loaded: {chartData.length} records</p>
                <p>📅 Date range: {new Date(chartData[0]?.date).toLocaleDateString()} - {new Date(chartData[chartData.length - 1]?.date).toLocaleDateString()}</p>
                <p className="mt-2 text-xs">
                  Data includes: grossRevenue, activeMembers, newMembers, cancellations, trialsPaid
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
