import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, Users, UserPlus, UserMinus, CheckCircle, TrendingUp, TrendingDown, Settings } from "lucide-react"
import { prisma } from "@/lib/prisma"

export default async function Dashboard() {
  // Get latest metrics from database
  const latestMetric = await prisma.metricsDaily.findFirst({
    orderBy: { date: 'desc' }
  })

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
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
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
