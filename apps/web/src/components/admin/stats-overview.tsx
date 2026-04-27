'use server'

import { Bug, Lightbulb, MessageSquare, TrendingUp, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@planningo/ui'
import { getAdminStats } from '@/lib/actions/admin'

export default async function AdminStatsOverview() {
  const result = await getAdminStats()
  if (!result.success || !result.stats) return null
  const stats = result.stats

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-100 text-blue-700',
    },
    {
      title: 'Total Feedback',
      value: stats.feedback.total,
      icon: MessageSquare,
      color: 'bg-purple-100 text-purple-700',
      subtext: `${stats.feedback.open} open`,
    },
    {
      title: 'Bug Reports',
      value: stats.feedback.bugReports,
      icon: Bug,
      color: 'bg-red-100 text-red-700',
    },
    {
      title: 'Feature Requests',
      value: stats.feedback.featureRequests,
      icon: Lightbulb,
      color: 'bg-yellow-100 text-yellow-700',
    },
    {
      title: 'Total Expenses',
      value: stats.expenses.total,
      icon: TrendingUp,
      color: 'bg-green-100 text-green-700',
      subtext: `₹${stats.expenses.totalAmount.toFixed(2)}`,
    },
    {
      title: 'Completed Feedback',
      value: stats.feedback.completed,
      icon: Lightbulb,
      color: 'bg-emerald-100 text-emerald-700',
      subtext:
        stats.feedback.total > 0
          ? `${Math.round((stats.feedback.completed / stats.feedback.total) * 100)}% rate`
          : '0% rate',
    },
  ]

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.subtext && <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
