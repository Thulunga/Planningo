'use client'

import { useEffect, useState } from 'react'
import { Loader2, Users, MessageSquare, Bug, Lightbulb, DollarSign, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@planningo/ui'
import { getAdminStats } from '@/lib/actions/admin'

interface Stats {
  totalUsers: number
  feedback: {
    total: number
    bugReports: number
    featureRequests: number
    improvements: number
    open: number
    inProgress: number
    completed: number
  }
  expenses: {
    total: number
    totalAmount: number
  }
}

export default function AdminStatsOverview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const result = await getAdminStats()
        if (result.success) {
          setStats(result.stats)
        }
      } catch (error) {
        console.error('Failed to load stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!stats) return null

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
      subtext: `${Math.round((stats.feedback.completed / stats.feedback.total) * 100)}% rate`,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
